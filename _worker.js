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

    // Geo endpoint — served by the Worker (not a static asset) so request.cf.country is reliable.
    // The JS boot() on index.html calls /api/cf-geo to get the visitor's country instantly
    // without relying on the Vercel geo API (which was cached globally and returned IN for all).
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

    const response = await env.ASSETS.fetch(request);

    if (url.pathname === '/sitemap.xml') {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Content-Type', 'application/xml; charset=utf-8');
      return newResponse;
    }

    return response;
  }
};
