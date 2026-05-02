const VERCEL_WEB = 'https://pdfsign-web.vercel.app';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /web and /web/* to the Vercel-deployed Next.js app
    if (url.pathname === '/web' || url.pathname.startsWith('/web/')) {
      const target = new URL(url.pathname + url.search, VERCEL_WEB);
      return fetch(new Request(target.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual',
      }));
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
