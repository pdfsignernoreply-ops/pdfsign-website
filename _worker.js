const VERCEL_WEB = 'https://pdfsign-web.vercel.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /web and /web/* to the Vercel-deployed Next.js app
    if (url.pathname === '/web' || url.pathname.startsWith('/web/')) {
      const target = new URL(url.pathname + url.search, VERCEL_WEB);

      // Forward original host so Next.js middleware sees 'pdfsign.in' not 'vercel.app'
      // This ensures X-Robots-Tag: noindex is NOT added for canonical traffic,
      // and NEXT_PUBLIC_SITE_URL-based redirects work correctly.
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set('x-forwarded-host', url.hostname);
      proxyHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

      return fetch(new Request(target.toString(), {
        method: request.method,
        headers: proxyHeaders,
        body: request.body,
        redirect: 'manual',
      }));
    }

    const response = await env.ASSETS.fetch(request);

    // Inject visitor's country into the main HTML so JS can skip the geo API call
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const country = (request.cf && request.cf.country) ? request.cf.country : 'IN';
      const html = await response.text();
      const injected = html.replace(
        '<head>',
        '<head><script>window.__GEO_COUNTRY__="' + country + '";</script>'
      );
      const headers = new Headers(response.headers);
      headers.delete('Content-Length'); // body length changed; let the runtime recalculate
      headers.set('Cache-Control', 'no-store'); // geo is per-visitor — never cache this response
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
