const VERCEL_WEB = 'https://pdfsign-web.vercel.app';

// Proxy a request to the Vercel-deployed Next.js app at the given /web path.
// Forwards the original host so Next.js middleware sees 'pdfsign.in' (keeps the
// canonical, avoids a noindex X-Robots-Tag) and passes the Cloudflare country
// through so the app can serve geo-specific content.
function proxyToWeb(request, url, webPath) {
  const target = new URL(webPath + url.search, VERCEL_WEB);
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set('x-forwarded-host', url.hostname);
  proxyHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));
  const cfCountry = (request.cf && /^[A-Z]{2}$/.test(request.cf.country ?? ''))
    ? request.cf.country : 'IN';
  proxyHeaders.set('x-cf-country', cfCountry);
  return fetch(new Request(target.toString(), {
    method: request.method,
    headers: proxyHeaders,
    body: request.body,
    redirect: 'manual',
  }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /web and /web/* to the Vercel-deployed Next.js app
    if (url.pathname === '/web' || url.pathname.startsWith('/web/')) {
      return proxyToWeb(request, url, url.pathname);
    }

    // Public global landing page: /global → Next.js app at /web/global.
    // Keeps the canonical (https://pdfsign.in/global) resolving; must run before
    // the non-blog clean-URL → .html redirect below, which would otherwise 404.
    if (url.pathname === '/global' || url.pathname === '/global/') {
      return proxyToWeb(request, url, '/web/global');
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

    // Non-blog clean URLs → 301 redirect to .html to prevent duplicate content.
    // (Cloudflare Pages transparently serves /foo.html for /foo, but the canonical
    // in these pages is the .html URL, so we enforce that with a redirect.)
    const pathSegment = url.pathname.split('/').pop();
    if (pathSegment && !pathSegment.includes('.') && !url.pathname.endsWith('/')) {
      return Response.redirect(`${url.origin}${url.pathname}.html${url.search}`, 301);
    }

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
  }
};
