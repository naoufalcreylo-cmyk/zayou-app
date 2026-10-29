// ZAYOU app API — native sign-up / login for the mobile app, backed by Shopify customers.
// Passwords (scrypt) and pending codes live in a private JSON metafield on the Shopify customer (zayou_app.auth): no other database.
// Orders are the customer's real Shopify orders (same e-mail, linked by Shopify).
const S = require('../lib/security');
const shop = require('../lib/shopify');
const { sendCode } = require('../lib/mail');

const CODE_TTL = 15 * 60 * 1000;
const MAX_TRIES = 8;           // wrong passwords or codes before a lock
const LOCK_MS = 15 * 60 * 1000;

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; this.expose = true; } }
const fail = (status, message) => { throw new HttpError(status, message); };

// ---------- helpers ----------
function publicCustomer(c) { return { id: c.id, firstName: c.firstName || '', lastName: c.lastName || '', email: c.email, phone: c.phone || '' }; }
function session(c) { return { token: S.signToken({ sub: c.id, ver: (c.auth && c.auth.ver) || 0 }), customer: publicCustomer(c) }; }
function locked(auth) { return auth && auth.lockUntil && Date.now() < auth.lockUntil; }
async function registerFailure(c) {
  const auth = { ...(c.auth || {}) }; auth.fails = (auth.fails || 0) + 1;
  if (auth.fails >= MAX_TRIES) { auth.lockUntil = Date.now() + LOCK_MS; auth.fails = 0; }
  await shop.saveAuth(c.id, auth);
}
async function issueCode(c, purpose) {
  const auth = { ...(c.auth || {}) };
  // at most one new code per minute
  if (auth.code && auth.code.sentAt && Date.now() - auth.code.sentAt < 60_000) return;
  const code = S.newCode();
  auth.code = { h: S.hashCode(code, c.email.toLowerCase()), exp: Date.now() + CODE_TTL, purpose, sentAt: Date.now(), tries: 0 };
  await shop.saveAuth(c.id, auth);
  try { await sendCode(c.email, code, purpose); }
  catch (e) { delete auth.code; await shop.saveAuth(c.id, auth).catch(() => {}); throw e; } // a failed send must not block a retry
}
function checkCode(c, code, purpose) {
  const k = c.auth && c.auth.code;
  if (!k || k.purpose !== purpose || Date.now() > k.exp) return false;
  return S.sameHash(k.h, S.hashCode(String(code || '').trim(), c.email.toLowerCase()));
}
async function authed(req) {
  const t = S.verifyToken(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!t) fail(401, 'Session expirée. Reconnectez-vous.');
  const c = await shop.getCustomer(t.sub);
  if (!c || !c.auth || !c.auth.pw || (c.auth.ver || 0) !== t.ver) fail(401, 'Session expirée. Reconnectez-vous.');
  return c;
}
const str = (v, max = 80) => String(v == null ? '' : v).trim().slice(0, max);
function addressInput(b) {
  const a = { firstName: str(b.firstName), lastName: str(b.lastName), address1: str(b.address1, 120), address2: str(b.address2, 120), city: str(b.city), zip: str(b.zip, 20), countryCode: 'MA' };
  const phone = str(b.phone, 30).replace(/[\s.-]/g, '').replace(/^0(?=[5-7])/, '+212');
  if (phone) a.phone = phone;
  for (const k of ['firstName', 'lastName', 'address1', 'city']) if (!a[k]) fail(422, 'Merci de compléter le prénom, le nom, l’adresse et la ville.');
  return a;
}
const money = m => (m && m.shopMoney ? m.shopMoney : null);
function order(o) {
  return { id: o.id, name: o.name, processedAt: o.processedAt, cancelledAt: o.cancelledAt, financialStatus: o.displayFinancialStatus, fulfillmentStatus: o.displayFulfillmentStatus,
    statusPageUrl: o.statusPageUrl, total: money(o.totalPriceSet), subtotal: money(o.subtotalPriceSet), shipping: money(o.totalShippingPriceSet),
    shippingAddress: o.shippingAddress ? o.shippingAddress.formatted : null,
    lines: o.lineItems.nodes.map(l => ({ name: l.title || l.name, size: l.variantTitle, quantity: l.quantity, image: l.image ? l.image.url : null, total: money(l.originalTotalSet), handle: l.product ? l.product.handle : null })) };
}

// ---------- routes ----------
const routes = {
  // Create the account (or claim an existing Shopify customer, e.g. a past cash-on-delivery buyer): a code is e-mailed first.
  'POST /auth/signup': async ({ body }) => {
    const email = S.normEmail(body.email);
    const firstName = str(body.firstName, 60), lastName = str(body.lastName, 60);
    if (!firstName || !lastName) fail(422, 'Merci d’indiquer votre prénom et votre nom.');
    if (!S.validEmail(email)) fail(422, 'Adresse e-mail invalide.');
    const p = S.passwordProblem(body.password); if (p) fail(422, p);
    let c = await shop.findCustomerByEmail(email);
    if (c && c.auth && c.auth.pw && c.auth.verified) fail(409, 'Un compte existe déjà avec cette adresse. Connectez-vous ou choisissez « Mot de passe oublié ».');
    if (c && locked(c.auth)) fail(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    if (!c) c = await shop.createCustomer({ email, firstName, lastName });
    // The password only becomes active once the e-mail is confirmed (protects existing customers' order history).
    c.auth = { ...(c.auth || {}), pending: S.hashPassword(body.password), pendingName: { firstName, lastName } };
    await shop.saveAuth(c.id, c.auth);
    await issueCode(c, 'verify');
    return { status: 'verify', email };
  },
  'POST /auth/verify': async ({ body }) => {
    const email = S.normEmail(body.email);
    const c = await shop.findCustomerByEmail(email);
    if (!c || !c.auth || !c.auth.pending) fail(400, 'Code invalide ou expiré.');
    if (locked(c.auth)) fail(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    if (!checkCode(c, body.code, 'verify')) { await registerFailure(c); fail(400, 'Code invalide ou expiré.'); }
    const name = c.auth.pendingName || {};
    const auth = { pw: c.auth.pending, verified: true, ver: (c.auth.ver || 0) + 1 };
    await shop.saveAuth(c.id, auth);
    const updated = (name.firstName || name.lastName) && (!c.firstName || !c.lastName) ? await shop.updateCustomer(c.id, { firstName: c.firstName || name.firstName, lastName: c.lastName || name.lastName }) : c;
    return session({ ...updated, auth });
  },
  'POST /auth/resend': async ({ body }) => {
    const email = S.normEmail(body.email);
    const c = await shop.findCustomerByEmail(email);
    if (c && c.auth && (c.auth.pending || c.auth.code)) await issueCode(c, c.auth.pending ? 'verify' : 'reset');
    return { ok: true };
  },
  'POST /auth/login': async ({ body }) => {
    const email = S.normEmail(body.email);
    const c = S.validEmail(email) ? await shop.findCustomerByEmail(email) : null;
    const generic = 'E-mail ou mot de passe incorrect.';
    if (!c || !c.auth || (!c.auth.pw && !c.auth.pending)) { S.hashPassword('timing-equalizer'); fail(401, generic); }
    if (locked(c.auth)) fail(429, 'Trop de tentatives. Réessayez dans quelques minutes ou choisissez « Mot de passe oublié ».');
    if (!c.auth.pw && c.auth.pending) { // signed up but never confirmed the e-mail
      if (!S.verifyPassword(String(body.password || ''), c.auth.pending)) { await registerFailure(c); fail(401, generic); }
      await issueCode(c, 'verify'); return { status: 'verify', email };
    }
    if (!S.verifyPassword(String(body.password || ''), c.auth.pw)) { await registerFailure(c); fail(401, generic); }
    if (c.auth.fails) await shop.saveAuth(c.id, { ...c.auth, fails: 0 });
    return session(c);
  },
  // Always answers the same way, whether the e-mail exists or not.
  'POST /auth/forgot': async ({ body }) => {
    const email = S.normEmail(body.email);
    const c = S.validEmail(email) ? await shop.findCustomerByEmail(email) : null;
    if (c && !locked(c.auth)) await issueCode(c, 'reset');
    return { ok: true };
  },
  'POST /auth/reset': async ({ body }) => {
    const email = S.normEmail(body.email);
    const c = await shop.findCustomerByEmail(email);
    const p = S.passwordProblem(body.password); if (p) fail(422, p);
    if (!c || !c.auth) fail(400, 'Code invalide ou expiré.');
    if (locked(c.auth)) fail(429, 'Trop de tentatives. Réessayez dans quelques minutes.');
    if (!checkCode(c, body.code, 'reset')) { await registerFailure(c); fail(400, 'Code invalide ou expiré.'); }
    const auth = { pw: S.hashPassword(body.password), verified: true, ver: (c.auth.ver || 0) + 1 }; // also logs out other devices
    await shop.saveAuth(c.id, auth);
    return session({ ...c, auth });
  },

  'GET /me': async ({ req }) => {
    const c = await authed(req);
    const orders = (await shop.listOrders(c.id, 3)).map(order);
    return { customer: publicCustomer(c), orders };
  },
  'PATCH /me': async ({ req, body }) => {
    const c = await authed(req);
    const input = {};
    if (body.firstName !== undefined) input.firstName = str(body.firstName, 60);
    if (body.lastName !== undefined) input.lastName = str(body.lastName, 60);
    if (body.phone !== undefined) { const ph = str(body.phone, 30).replace(/[\s.-]/g, '').replace(/^0(?=[5-7])/, '+212'); input.phone = ph || null; }
    const u = await shop.updateCustomer(c.id, input);
    return { customer: publicCustomer(u) };
  },
  'POST /me/password': async ({ req, body }) => {
    const c = await authed(req);
    if (!S.verifyPassword(String(body.current || ''), c.auth.pw)) { await registerFailure(c); fail(401, 'Mot de passe actuel incorrect.'); }
    const p = S.passwordProblem(body.password); if (p) fail(422, p);
    const auth = { ...c.auth, pw: S.hashPassword(body.password), ver: (c.auth.ver || 0) + 1, fails: 0 };
    await shop.saveAuth(c.id, auth);
    return session({ ...c, auth });
  },
  'DELETE /me': async ({ req }) => {
    const c = await authed(req);
    await shop.saveAuth(c.id, { deleted: true }); // password removed immediately: the app account no longer exists
    const result = await shop.deleteOrErase(c.id);
    return { ok: true, result };
  },

  'GET /orders': async ({ req }) => { const c = await authed(req); return { orders: (await shop.listOrders(c.id, 50)).map(order) }; },
  'GET /orders/:id': async ({ req, params }) => {
    const c = await authed(req);
    const o = await shop.getOrder(c.id, `gid://shopify/Order/${params.id}`);
    if (!o) fail(404, 'Commande introuvable.');
    return { order: order(o) };
  },

  'GET /addresses': async ({ req }) => { const c = await authed(req); return shop.listAddresses(c.id); },
  'POST /addresses': async ({ req, body }) => { const c = await authed(req); await shop.createAddress(c.id, addressInput(body), !!body.isDefault); return shop.listAddresses(c.id); },
  'PUT /addresses/:id': async ({ req, body, params }) => { const c = await authed(req); await shop.updateAddress(c.id, `gid://shopify/MailingAddress/${params.id}?model_name=CustomerAddress`, addressInput(body), !!body.isDefault); return shop.listAddresses(c.id); },
  'DELETE /addresses/:id': async ({ req, params }) => { const c = await authed(req); await shop.deleteAddress(c.id, `gid://shopify/MailingAddress/${params.id}?model_name=CustomerAddress`); return shop.listAddresses(c.id); },

  'GET /health': async () => ({ ok: true, shop: shop.SHOP }),
};

function match(method, path) {
  for (const [key, fn] of Object.entries(routes)) {
    const [m, pattern] = key.split(' '); if (m !== method) continue;
    const names = []; const rx = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$');
    const r = path.match(rx); if (r) return { fn, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(r[i + 1])])) };
  }
  return null;
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const s = Buffer.concat(chunks).toString('utf8'); if (!s) return {};
  if (s.length > 20_000) fail(413, 'Requête trop volumineuse.');
  try { return JSON.parse(s); } catch { fail(400, 'JSON invalide.'); }
}

module.exports = async function handler(req, res) {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  try {
    const url = new URL(req.url, 'http://x'); const path = url.pathname.replace(/^\/api/, '') || '/';
    const m = match(req.method, path); if (!m) return send(404, { error: 'Introuvable.' });
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    send(200, await m.fn({ req, body, params: m.params }));
  } catch (e) {
    if (e.expose) return send(e.status || 400, { error: e.message });
    console.error(e);
    send(500, { error: 'Une erreur est survenue. Réessayez dans un instant.' });
  }
};
