// LOCAL TEST ONLY: the API with an in-memory Shopify + captured e-mails, for UI tests of the app (never deployed).
// node server/test/mock-server.js  → http://localhost:8787 ; GET /__test/code?email=… returns the last code sent.
const path = require('path'); const http = require('http');
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'local-mock-secret-'.padEnd(40, 'x');
const db = { customers: new Map(), seq: 1 }; const mails = [];
const gid = (t, n) => `gid://shopify/${t}/${n}`;
const find = email => [...db.customers.values()].find(c => c.email === email);
require.cache[path.join(__dirname, '../lib/shopify.js')] = { loaded: true, id: 'shop', exports: {
  SHOP: 'mock',
  async findCustomerByEmail(e) { const c = find(e); return c ? structuredClone(c) : null; },
  async getCustomer(id) { const c = db.customers.get(id); return c ? structuredClone(c) : null; },
  async createCustomer({ email, firstName, lastName }) { const c = { id: gid('Customer', db.seq++), email, firstName, lastName, phone: '', auth: null }; db.customers.set(c.id, c); return structuredClone(c); },
  async updateCustomer(id, input) { Object.assign(db.customers.get(id), input); return structuredClone(db.customers.get(id)); },
  async saveAuth(id, auth) { db.customers.get(id).auth = structuredClone(auth); },
  async listOrders() { return []; }, async getOrder() { return null; },
  async listAddresses() { return { addresses: [], defaultId: null }; },
  async createAddress() { return { id: 'x' }; }, async updateAddress() { return { id: 'x' }; }, async deleteAddress() {},
  async deleteOrErase(id) { db.customers.delete(id); return 'deleted'; },
} };
require.cache[path.join(__dirname, '../lib/mail.js')] = { loaded: true, id: 'mail', exports: { sendCode: async (to, code, purpose) => { mails.push({ to, code, purpose }); console.log(`[mail] ${to} ${purpose} ${code}`); } } };
const handler = require('../api/index.js');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.url.startsWith('/__test/code')) { const e = new URL(req.url, 'http://x').searchParams.get('email'); const m = [...mails].reverse().find(x => x.to === e); res.end(JSON.stringify({ code: m ? m.code : null })); return; }
  handler(req, res);
}).listen(8787, () => console.log('MOCK API http://localhost:8787'));
