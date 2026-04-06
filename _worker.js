export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);

    if (url.pathname === '/sitemap.xml') {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Content-Type', 'application/xml; charset=utf-8');
      return newResponse;
    }

    return response;
  }
};
