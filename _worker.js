const VERCEL_WEB = 'https://pdfsign-web.vercel.app';

// Proxy a request to the Vercel-deployed Next.js app at the given /web path.
// Passes the Cloudflare country through so the app can serve geo-specific
// content, and strips the origin's X-Robots-Tag so the canonical pdfsign.in
// pages stay indexable (see below).
async function proxyToWeb(request, url, webPath) {
  const target = new URL(webPath + url.search, VERCEL_WEB);
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set('x-forwarded-host', url.hostname);
  proxyHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));
  const cfCountry = (request.cf && /^[A-Z]{2}$/.test(request.cf.country ?? ''))
    ? request.cf.country : 'IN';
  proxyHeaders.set('x-cf-country', cfCountry);
  const resp = await fetch(new Request(target.toString(), {
    method: request.method,
    headers: proxyHeaders,
    body: request.body,
    redirect: 'manual',
  }));
  // The Vercel origin tags every *.vercel.app response with
  // `X-Robots-Tag: noindex, nofollow` to keep the preview domain out of search.
  // Vercel overwrites our x-forwarded-host, so the app's middleware can't tell
  // canonical traffic apart and adds it even here. Strip it on this canonical
  // (pdfsign.in) path so the indexable /web tool pages can rank.
  // Direct *.vercel.app access (which bypasses this Worker) keeps its noindex.
  const headers = new Headers(resp.headers);
  headers.delete('x-robots-tag');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

export default {
  async fetch(request, env) {
   try {
    const url = new URL(request.url);

    // Proxy /web and /web/* to the Vercel-deployed Next.js app
    if (url.pathname === '/web' || url.pathname.startsWith('/web/')) {
      return proxyToWeb(request, url, url.pathname);
    }

    // /global is retired: the homepage now serves both audiences (geo-adaptive).
    // 301 folds its link equity and any residual rankings into the root.
    if (url.pathname === '/global' || url.pathname === '/global/') {
      return Response.redirect(`${url.origin}/`, 301);
    }

    // Geo endpoint — served by the Worker (not a static asset) so request.cf.country is reliable.
    if (url.pathname === '/api/cf-geo') {
      const country = (request.cf && request.cf.country) ? request.cf.country : 'IN';
      return new Response(JSON.stringify({ country, isIndia: country === 'IN' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Legacy/dead top-level URLs that map to the web tool. Redirect them to the
    // real page with a clean 301 — otherwise the generic clean-URL→.html rule
    // below sends them to a non-existent .html, which threw a Worker exception
    // (Cloudflare 1101 → HTTP 500) and showed up as "Server error (5xx)" in
    // Google Search Console.
    const DEAD_REDIRECTS = {
      '/editor': '/web', '/editor.html': '/web',
      '/draw':   '/web/draw', '/draw.html': '/web/draw',
    };
    if (DEAD_REDIRECTS[url.pathname]) {
      return Response.redirect(`${url.origin}${DEAD_REDIRECTS[url.pathname]}`, 301);
    }

    // Blog post .html URLs → 301 redirect to clean URL.
    // The clean URL is the canonical; .html is just an alias that must redirect.
    // e.g. /blog/how-to-sign-gem-portal-documents-dsc.html
    //   → /blog/how-to-sign-gem-portal-documents-dsc
    if (
      url.pathname.startsWith('/blog/') &&
      url.pathname.endsWith('.html') &&
      url.pathname !== '/blog/index.html'
    ) {
      const cleanPath = url.pathname.slice(0, -5); // strip .html
      return Response.redirect(`${url.origin}${cleanPath}${url.search}`, 301);
    }

    // Blog post clean URLs → serve the underlying .html file but rewrite
    // canonical + og:url to the clean URL so Google indexes the clean form.
    const lastSegment = url.pathname.split('/').pop();
    const isBlogPostCleanUrl =
      url.pathname.startsWith('/blog/') &&
      lastSegment &&
      !lastSegment.includes('.') &&
      !url.pathname.endsWith('/');

    if (isBlogPostCleanUrl) {
      const htmlUrl = `${url.origin}${url.pathname}.html`;
      const htmlResponse = await env.ASSETS.fetch(new Request(htmlUrl));
      if (htmlResponse.ok) {
        const cleanUrl = `${url.origin}${url.pathname}`;
        const html = await htmlResponse.text();
        // Self-healing: force all three self-referencing signals to the clean URL,
        // so a post authored with a stale ".html" canonical can never be served wrong.
        const rewritten = html
          .replace(/(<link rel="canonical" href=")[^"]*/,  `$1${cleanUrl}`)
          .replace(/(<meta property="og:url" content=")[^"]*/,  `$1${cleanUrl}`)
          .replace(/("mainEntityOfPage":\{"@type":"WebPage","@id":")[^"]*/, `$1${cleanUrl}`);
        return new Response(rewritten, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Non-blog .html URLs → 301 to the clean URL.
    // Workers Assets already redirects /foo.html → /foo, but it uses a 307
    // (TEMPORARY), which tells Google to KEEP the .html URL indexed. The result
    // is two indexed URLs competing for the same query: /verify sat at position
    // 32.2 and /verify.html at 26.5 in Search Console (Sep 2026), splitting the
    // ranking signal instead of consolidating it. A 301 tells Google the move is
    // permanent so the clean URL inherits the equity. Blog .html is handled by
    // its own 301 above; this covers every other page.
    if (
      url.pathname.endsWith('.html') &&
      !url.pathname.startsWith('/blog/')
    ) {
      const cleanPath = url.pathname === '/index.html'
        ? '/'
        : url.pathname.slice(0, -5);   // strip .html
      return Response.redirect(`${url.origin}${cleanPath}${url.search}`, 301);
    }

    // NOTE: the old "clean URL → .html 301" rule was REMOVED (GSC fix, 2026-08-08).
    // Clean URLs are now the canonical form site-wide (links, canonicals, sitemap all use
    // them), and Cloudflare Workers Assets serves /foo from foo.html (200) and auto-redirects
    // /foo.html → /foo. The old rule only fired for clean URLs with NO .html asset, redirecting
    // them to a non-existent .html → a Worker exception (Cloudflare 1101 → 5xx) that showed up
    // as "Server error (5xx)" and "Page with redirect" in Search Console.

    const response = await env.ASSETS.fetch(request);

    // Inject country code into the main page so boot() can detect geo without an extra HTTP round-trip.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const raw     = request.cf?.country ?? '';
      const country = /^[A-Z]{2}$/.test(raw) ? raw : 'IN';  // validate: 2 uppercase letters
      const html     = await response.text();
      const injected = html.replace('<head>', `<head><script>window.__GEO_COUNTRY__="${country}";</script>`);
      const headers  = new Headers(response.headers);
      headers.set('Cache-Control', 'private, no-store');     // each visitor gets their own country
      headers.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(injected, { status: response.status, headers });
    }

    if (url.pathname === '/sitemap.xml') {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Content-Type', 'application/xml; charset=utf-8');
      return newResponse;
    }

    return response;
   } catch (err) {
    // Never surface a 5xx to crawlers for a missing/broken asset. A thrown
    // exception (e.g. env.ASSETS.fetch on a non-existent .html → Cloudflare 1101)
    // is turned into a clean 404 so Search Console sees "Not found", not
    // "Server error (5xx)".
    console.error('[worker] error serving', request.url, err && (err.stack || err.message));
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
   }
  }
};
