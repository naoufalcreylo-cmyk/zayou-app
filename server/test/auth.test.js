// Route-logic tests with an in-memory Shopify and captured e-mails: node --test server/test
const test = require('node:test'); const assert = require('node:assert/strict'); const path = require('path');
process.env.AUTH_SECRET = 'test-secret-'.padEnd(40, 'x');

// ---- in-memory Shopify (same interface as lib/shopify.js) ----
const db = { customers: new Map(), orders: [], addresses: new Map(), seq: 1 };
const gid = (t, n) => `gid://shopify/${t}/${n}`;
const shopMock = {
  SHOP: 'mock',
  async findCustomerByEmail(email) { return [...db.customers.values()].find(c => c.email === email) ? structuredClone([...db.customers.values()].find(c => c.email === email)) : null; },
  async getCustomer(id) { const c = db.customers.get(id); return c ? structuredClone(c) : null; },
  async createCustomer({ email, firstName, lastName }) { const c = { id: gid('Customer', db.seq++), email, firstName, lastName, phone: '', auth: null }; db.customers.set(c.id, c); return structuredClone(c); },
  async updateCustomer(id, input) { Object.assign(db.customers.get(id), input); return structuredClone(db.customers.get(id)); },
  async saveAuth(id, auth) { db.customers.get(id).auth = structuredClone(auth); },
  async listOrders(id, first) { return db.orders.filter(o => o.customerId === id).slice(0, first); },
  async getOrder(cid, oid) { const o = db.orders.find(x => x.id === oid); return o && o.customerId === cid ? o : null; },
  async listAddresses(id) { return { addresses: [...db.addresses.values()].filter(a => a.cid === id), defaultId: null }; },
  async createAddress(cid, a) { const id = gid('MailingAddress', db.seq++) + '?model_name=CustomerAddress'; db.addresses.set(id, { ...a, id, cid, formatted: [a.address1, a.city] }); return { id }; },
  async updateAddress(cid, id, a) { const x = db.addresses.get(id); if (!x || x.cid !== cid) throw Object.assign(new Error('Adresse introuvable'), { status: 422, expose: true }); Object.assign(x, a); return { id }; },
  async deleteAddress(cid, id) { const x = db.addresses.get(id); if (!x || x.cid !== cid) throw Object.assign(new Error('Adresse introuvable'), { status: 422, expose: true }); db.addresses.delete(id); },
  async deleteOrErase(id) { const has = db.orders.some(o => o.customerId === id); if (!has) { db.customers.delete(id); return 'deleted'; } return 'erasure_requested'; },
};
const mails = [];
require.cache[path.join(__dirname, '../lib/shopify.js')] = { exports: shopMock, loaded: true, id: 'shop' };
require.cache[path.join(__dirname, '../lib/mail.js')] = { exports: { sendCode: async (to, code, purpose) => mails.push({ to, code, purpose }) }, loaded: true, id: 'mail' };
const handler = require('../api/index.js');

async function call(method, url, body, token) {
  const { Readable } = require('stream');
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, url, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); } };
    handler(req, res);
  });
}
const lastCode = (email, purpose) => [...mails].reverse().find(m => m.to === email && m.purpose === purpose).code;
const wait = ms => new Promise(r => setTimeout(r, ms));

test('sign up → code by e-mail → verified session; password inactive before verification', async () => {
  const r = await call('POST', '/auth/signup', { firstName: 'Amine', lastName: 'Test', email: 'Amine@Example.com', password: 'Zayou2026' });
  assert.equal(r.status, 200); assert.equal(r.body.status, 'verify'); assert.equal(r.body.email, 'amine@example.com');
  const early = await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Zayou2026' });
  assert.equal(early.body.status, 'verify', 'login before verification asks for the code again');
  const bad = await call('POST', '/auth/verify', { email: 'amine@example.com', code: '000000' });
  assert.equal(bad.status, 400);
  const ok = await call('POST', '/auth/verify', { email: 'amine@example.com', code: lastCode('amine@example.com', 'verify') });
  assert.equal(ok.status, 200); assert.ok(ok.body.token); assert.equal(ok.body.customer.firstName, 'Amine');
  const me = await call('GET', '/me', null, ok.body.token);
  assert.equal(me.status, 200); assert.equal(me.body.customer.email, 'amine@example.com');
});

test('login: right password works, wrong password is generic, unknown e-mail is generic', async () => {
  const ok = await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Zayou2026' });
  assert.equal(ok.status, 200); assert.ok(ok.body.token);
  const wrong = await call('POST', '/auth/login', { email: 'amine@example.com', password: 'nope1234' });
  const unknown = await call('POST', '/auth/login', { email: 'nobody@example.com', password: 'nope1234' });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401); assert.equal(wrong.body.error, unknown.body.error);
});

test('second sign-up with a verified e-mail is refused', async () => {
  const r = await call('POST', '/auth/signup', { firstName: 'X', lastName: 'Y', email: 'amine@example.com', password: 'Other2026' });
  assert.equal(r.status, 409);
});

test('existing Shopify customer (past COD buyer): orders only visible after proving the e-mail', async () => {
  const c = await shopMock.createCustomer({ email: 'client@example.com', firstName: 'Sara', lastName: 'B' });
  db.orders.push({ id: gid('Order', 900), customerId: c.id, name: '#1001', processedAt: '2026-10-01T10:00:00Z', cancelledAt: null, displayFinancialStatus: 'PENDING', displayFulfillmentStatus: 'UNFULFILLED', statusPageUrl: 'https://x', totalPriceSet: { shopMoney: { amount: '299.0', currencyCode: 'MAD' } }, subtotalPriceSet: null, totalShippingPriceSet: null, shippingAddress: null, lineItems: { nodes: [] } });
  const attacker = await call('POST', '/auth/signup', { firstName: 'Evil', lastName: 'One', email: 'client@example.com', password: 'Hacker2026' });
  assert.equal(attacker.body.status, 'verify');
  const noAccess = await call('POST', '/auth/login', { email: 'client@example.com', password: 'Hacker2026' });
  assert.equal(noAccess.body.status, 'verify', 'no session without the code sent to the real owner');
  // the real owner signs up with their own password and confirms with the code received in their mailbox
  await call('POST', '/auth/signup', { firstName: 'Sara', lastName: 'B', email: 'client@example.com', password: 'Sara2026ok' });
  const real = await call('POST', '/auth/verify', { email: 'client@example.com', code: lastCode('client@example.com', 'verify') });
  assert.equal(real.status, 200);
  assert.equal((await call('POST', '/auth/login', { email: 'client@example.com', password: 'Hacker2026' })).status, 401, 'attacker password never becomes valid');
  const orders = await call('GET', '/orders', null, real.body.token);
  assert.equal(orders.body.orders[0].name, '#1001'); assert.equal(real.body.customer.firstName, 'Sara', 'existing name is kept');
});

test('forgot password: same answer for unknown e-mail; reset logs out old sessions', async () => {
  const old = (await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Zayou2026' })).body.token;
  const unknown = await call('POST', '/auth/forgot', { email: 'ghost@example.com' });
  assert.deepEqual(unknown.body, { ok: true });
  await wait(5);
  const r = await call('POST', '/auth/forgot', { email: 'amine@example.com' });
  assert.deepEqual(r.body, { ok: true });
  const weak = await call('POST', '/auth/reset', { email: 'amine@example.com', code: lastCode('amine@example.com', 'reset'), password: 'short' });
  assert.equal(weak.status, 422);
  const done = await call('POST', '/auth/reset', { email: 'amine@example.com', code: lastCode('amine@example.com', 'reset'), password: 'Nouveau2026' });
  assert.equal(done.status, 200);
  assert.equal((await call('GET', '/me', null, old)).status, 401, 'old session revoked');
  assert.equal((await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Nouveau2026' })).status, 200);
});

test('lockout after 8 wrong passwords', async () => {
  for (let i = 0; i < 8; i++) await call('POST', '/auth/login', { email: 'amine@example.com', password: 'wrong' + i + 'xx' });
  const r = await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Nouveau2026' });
  assert.equal(r.status, 429);
  db.customers.get([...db.customers.values()].find(c => c.email === 'amine@example.com').id).auth.lockUntil = 0; // unlock for next tests
});

test('addresses: create, update, delete; another customer cannot touch them; orders are private', async () => {
  const a = (await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Nouveau2026' })).body.token;
  const b = (await call('POST', '/auth/login', { email: 'client@example.com', password: 'Sara2026ok' })).body.token;
  const missing = await call('POST', '/addresses', { firstName: 'A' }, a);
  assert.equal(missing.status, 422);
  const created = await call('POST', '/addresses', { firstName: 'Amine', lastName: 'Test', address1: '12 rue X', city: 'Casablanca', phone: '0612345678' }, a);
  const addr = created.body.addresses[0]; assert.equal(addr.phone, '+212612345678');
  const id = addr.id.match(/\/(\d+)\?/)[1];
  assert.equal((await call('PUT', `/addresses/${id}`, { firstName: 'Amine', lastName: 'Test', address1: '13 rue X', city: 'Rabat' }, b)).status, 422, 'other customer refused');
  assert.equal((await call('PUT', `/addresses/${id}`, { firstName: 'Amine', lastName: 'Test', address1: '13 rue X', city: 'Rabat' }, a)).status, 200);
  assert.equal((await call('GET', '/orders/900', null, a)).status, 404, 'cannot read someone else\x27s order');
  assert.equal((await call('DELETE', `/addresses/${id}`, null, a)).body.addresses.length, 0);
});

test('account deletion removes the password immediately', async () => {
  const t = (await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Nouveau2026' })).body.token;
  assert.equal((await call('DELETE', '/me', null, t)).status, 200);
  assert.equal((await call('GET', '/me', null, t)).status, 401);
  assert.equal((await call('POST', '/auth/login', { email: 'amine@example.com', password: 'Nouveau2026' })).status, 401);
});
