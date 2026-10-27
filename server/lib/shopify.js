// Shopify Admin API (GraphQL) for a Dev Dashboard app installed on the store.
// Token: client credentials grant (24 h), cached in memory and renewed automatically.
// Env: SHOPIFY_SHOP (e.g. zayou-5), SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET — or SHOPIFY_ADMIN_TOKEN for a legacy custom app.
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';
const SHOP = (process.env.SHOPIFY_SHOP || 'zayou-5').replace(/\.myshopify\.com$/, '');
let cached = { token: process.env.SHOPIFY_ADMIN_TOKEN || null, expiresAt: process.env.SHOPIFY_ADMIN_TOKEN ? Infinity : 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.SHOPIFY_CLIENT_ID || '', client_secret: process.env.SHOPIFY_CLIENT_SECRET || '' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`Shopify token error ${res.status}: ${json.error || JSON.stringify(json).slice(0, 200)}`);
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 86399) * 1000 };
  return cached.token;
}

async function admin(query, variables = {}) {
  const res = await fetch(`https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await accessToken() },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`Shopify Admin ${res.status}: ${JSON.stringify(json.errors || json).slice(0, 300)}`);
  return json.data;
}
function userErrors(payload) {
  const e = payload && payload.userErrors && payload.userErrors[0];
  if (e) { const err = new Error(e.message); err.status = 422; err.expose = true; throw err; }
  return payload;
}

// ---------- customer + private auth record (one JSON metafield, not exposed to storefront or customer accounts) ----------
const NS = 'zayou_app'; const KEY = 'auth';
const CUSTOMER = `id firstName lastName email phone createdAt defaultAddress { id } metafield(namespace: "${NS}", key: "${KEY}") { value }`;
const parse = c => (c ? { ...c, auth: c.metafield ? JSON.parse(c.metafield.value) : null, metafield: undefined } : null);

async function findCustomerByEmail(email) {
  const d = await admin(`query($q: String!) { customers(first: 1, query: $q) { nodes { ${CUSTOMER} } } }`, { q: `email:"${email.replace(/"/g, '')}"` });
  const c = d.customers.nodes[0];
  return c && c.email && c.email.toLowerCase() === email ? parse(c) : null;
}
async function getCustomer(id) {
  const d = await admin(`query($id: ID!) { customer(id: $id) { ${CUSTOMER} } }`, { id });
  return parse(d.customer);
}
async function createCustomer({ email, firstName, lastName }) {
  const d = await admin(`mutation($input: CustomerInput!) { customerCreate(input: $input) { customer { ${CUSTOMER} } userErrors { field message } } }`,
    { input: { email, firstName, lastName, tags: ['app-zayou'] } });
  return parse(userErrors(d.customerCreate).customer);
}
async function updateCustomer(id, input) {
  const d = await admin(`mutation($input: CustomerInput!) { customerUpdate(input: $input) { customer { ${CUSTOMER} } userErrors { field message } } }`, { input: { id, ...input } });
  return parse(userErrors(d.customerUpdate).customer);
}
async function saveAuth(customerId, auth) {
  const d = await admin(`mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
    { m: [{ ownerId: customerId, namespace: NS, key: KEY, type: 'json', value: JSON.stringify(auth) }] });
  userErrors(d.metafieldsSet);
}

// ---------- orders ----------
const MONEY = 'shopMoney { amount currencyCode }';
const ADDRESS = 'id firstName lastName address1 address2 city zip province provinceCode country countryCodeV2 phone formatted(withName: true)';
const ORDER = `id name processedAt cancelledAt displayFinancialStatus displayFulfillmentStatus statusPageUrl
  totalPriceSet { ${MONEY} } subtotalPriceSet { ${MONEY} } totalShippingPriceSet { ${MONEY} }
  shippingAddress { ${ADDRESS.replace('id ', '')} }
  lineItems(first: 50) { nodes { name title quantity variantTitle image { url } originalTotalSet { ${MONEY} } product { handle } } }`;
async function listOrders(customerId, first = 50) {
  const d = await admin(`query($id: ID!, $first: Int!) { customer(id: $id) { orders(first: $first, sortKey: PROCESSED_AT, reverse: true) { nodes { ${ORDER} } } } }`, { id: customerId, first });
  return d.customer ? d.customer.orders.nodes : [];
}
async function getOrder(customerId, orderId) {
  const d = await admin(`query($id: ID!) { order(id: $id) { customer { id } ${ORDER} } }`, { id: orderId });
  return d.order && d.order.customer && d.order.customer.id === customerId ? d.order : null; // only the customer's own orders
}

// ---------- addresses ----------
async function listAddresses(customerId) {
  const d = await admin(`query($id: ID!) { customer(id: $id) { defaultAddress { id } addressesV2(first: 20) { nodes { ${ADDRESS} } } } }`, { id: customerId });
  return { addresses: d.customer ? d.customer.addressesV2.nodes : [], defaultId: d.customer && d.customer.defaultAddress ? d.customer.defaultAddress.id : null };
}
async function createAddress(customerId, address, setAsDefault) {
  const d = await admin(`mutation($c: ID!, $a: MailingAddressInput!, $def: Boolean) { customerAddressCreate(customerId: $c, address: $a, setAsDefault: $def) { address { id } userErrors { field message } } }`, { c: customerId, a: address, def: !!setAsDefault });
  return userErrors(d.customerAddressCreate).address;
}
async function updateAddress(customerId, addressId, address, setAsDefault) {
  const d = await admin(`mutation($c: ID!, $id: ID!, $a: MailingAddressInput!, $def: Boolean) { customerAddressUpdate(customerId: $c, addressId: $id, address: $a, setAsDefault: $def) { address { id } userErrors { field message } } }`, { c: customerId, id: addressId, a: address, def: !!setAsDefault });
  return userErrors(d.customerAddressUpdate).address;
}
async function deleteAddress(customerId, addressId) {
  const d = await admin(`mutation($c: ID!, $id: ID!) { customerAddressDelete(customerId: $c, addressId: $id) { deletedAddressId userErrors { field message } } }`, { c: customerId, id: addressId });
  userErrors(d.customerAddressDelete);
}

// ---------- deletion ----------
async function deleteOrErase(customerId) {
  // A customer without orders can be deleted; otherwise Shopify keeps orders and erases personal data (privacy request).
  const del = await admin(`mutation($id: ID!) { customerDelete(input: { id: $id }) { deletedCustomerId userErrors { field message } } }`, { id: customerId });
  if (del.customerDelete.deletedCustomerId) return 'deleted';
  const er = await admin(`mutation($id: ID!) { customerRequestDataErasure(customerId: $id) { customerId userErrors { field message } } }`, { id: customerId });
  userErrors(er.customerRequestDataErasure);
  return 'erasure_requested';
}

module.exports = { admin, findCustomerByEmail, getCustomer, createCustomer, updateCustomer, saveAuth, listOrders, getOrder, listAddresses, createAddress, updateAddress, deleteAddress, deleteOrErase, SHOP };
