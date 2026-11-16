// Cloudflare Workers entry: serves the same routes as api/index.js (written for Node / Vercel) through a minimal req/res adapter.
// Secrets and vars (AUTH_SECRET, SHOPIFY_*, RESEND_API_KEY, MAIL_FROM) reach the code through process.env (nodejs_compat).
const handler = require('./api/index.js');

export default {
  async fetch(request) {
    const text = ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.text() : '';
    const req = {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers), // lower-case keys, like Node
      async *[Symbol.asyncIterator]() { if (text) yield Buffer.from(text, 'utf8'); },
    };
    return new Promise((resolve, reject) => {
      const headers = new Headers({ 'X-Robots-Tag': 'noindex' });
      const res = {
        statusCode: 200,
        setHeader: (k, v) => headers.set(k, v),
        end: body => resolve(new Response(body ?? null, { status: res.statusCode, headers })),
      };
      handler(req, res).catch(reject);
    });
  },
};
