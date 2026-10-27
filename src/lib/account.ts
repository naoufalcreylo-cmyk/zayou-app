// Shopify Customer Account API (new customer accounts: login with a one-time code by e-mail, hosted by Shopify).
// OAuth 2.0 + PKCE as a public client. Configuration (Shopify admin › Headless › Customer Account API):
//   - client type: Public
//   - callback URL: shop.62344691777.app://callback   (Shopify requires the shop.{shop_id}.* scheme)
// The client id goes in app.json › expo.extra.customerAccountClientId.
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { SHOP_DOMAIN } from './shopify';

const extra = (Constants.expoConfig?.extra ?? {}) as { shopId?: string; customerAccountClientId?: string };
export const SHOP_ID = extra.shopId ?? '62344691777';
export const CLIENT_ID = extra.customerAccountClientId ?? '';
export const REDIRECT_URI = `shop.${SHOP_ID}.app://callback`;
export const SCOPES = ['openid', 'email', 'customer-account-api:full'];
const ISSUER = `https://shopify.com/authentication/${SHOP_ID}`;
export const accountConfigured = () => !!CLIENT_ID;

// ---------- token storage (Keychain / Keystore; small separate keys) ----------
const K = { access: 'zy_at', refresh: 'zy_rt', expires: 'zy_exp', id: 'zy_idt' } as const;
const store = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};
type Tokens = { accessToken: string; refreshToken?: string; expiresAt: number; idToken?: string };
async function saveTokens(t: AuthSession.TokenResponse) {
  await store.set(K.access, t.accessToken);
  if (t.refreshToken) await store.set(K.refresh, t.refreshToken);
  await store.set(K.expires, String(Date.now() + (t.expiresIn ?? 3600) * 1000));
  if (t.idToken) await store.set(K.id, t.idToken);
}
async function loadTokens(): Promise<Tokens | null> {
  const accessToken = await store.get(K.access); if (!accessToken) return null;
  return { accessToken, refreshToken: (await store.get(K.refresh)) ?? undefined, expiresAt: +((await store.get(K.expires)) ?? 0), idToken: (await store.get(K.id)) ?? undefined };
}
export async function clearTokens() { await Promise.all(Object.values(K).map(k => store.del(k).catch(() => {}))); }

// ---------- discovery ----------
let discovery: AuthSession.DiscoveryDocument | null = null;
async function getDiscovery() { return (discovery ??= await AuthSession.fetchDiscoveryAsync(ISSUER)); }
let apiUrl: string | null = null;
async function getApiUrl() {
  if (apiUrl) return apiUrl;
  const r = await fetch(`https://${SHOP_DOMAIN}/.well-known/customer-account-api`);
  apiUrl = (await r.json()).graphql_api as string;
  return apiUrl;
}

// ---------- login / logout ----------
/** Opens Shopify's login page (e-mail + one-time code; creates the account if it doesn't exist). */
export async function login(): Promise<boolean> {
  if (!CLIENT_ID) throw new Error('Connexion pas encore configurée.');
  const d = await getDiscovery();
  const request = new AuthSession.AuthRequest({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI, scopes: SCOPES, usePKCE: true, extraParams: { locale: 'fr' } });
  // iOS: private browser session, so nothing stays logged in inside Safari after « Se déconnecter ».
  const result = await request.promptAsync(d, { preferEphemeralSession: true });
  if (result.type !== 'success' || !result.params.code) return false;
  const tokens = await AuthSession.exchangeCodeAsync(
    { clientId: CLIENT_ID, code: result.params.code, redirectUri: REDIRECT_URI, extraParams: { code_verifier: request.codeVerifier ?? '' } }, d);
  await saveTokens(tokens);
  return true;
}
export async function logout() {
  await clearTokens();
}

async function validAccessToken(): Promise<string | null> {
  const t = await loadTokens(); if (!t) return null;
  if (Date.now() < t.expiresAt - 60_000) return t.accessToken;
  if (!t.refreshToken) { await clearTokens(); return null; }
  try {
    const next = await AuthSession.refreshAsync({ clientId: CLIENT_ID, refreshToken: t.refreshToken }, await getDiscovery());
    await saveTokens(next);
    return next.accessToken;
  } catch { await clearTokens(); return null; }
}
export const isLoggedIn = async () => !!(await validAccessToken());

// ---------- API ----------
export class AuthError extends Error {}
async function customerApi<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = await validAccessToken(); if (!token) throw new AuthError('Session expirée');
  const res = await fetch(await getApiUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ query, variables }) });
  if (res.status === 401) { await clearTokens(); throw new AuthError('Session expirée'); }
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export type Money = { amount: string; currencyCode: string };
export type Address = { id: string; firstName: string | null; lastName: string | null; address1: string | null; address2: string | null; city: string | null; zip: string | null; zoneCode: string | null; countryCode: string | null; phoneNumber: string | null; formatted: string[] };
export type OrderSummary = { id: string; name: string; processedAt: string; financialStatus: string | null; fulfillmentStatus: string; cancelledAt: string | null; totalPrice: Money; lineItems: { nodes: { name: string; quantity: number; variantTitle: string | null; image: { url: string } | null }[] } };
export type Order = Omit<OrderSummary, 'lineItems'> & { subtotal: Money | null; totalShipping: Money; statusPageUrl: string; shippingAddress: Address | null; lineItems: { nodes: { name: string; quantity: number; variantTitle: string | null; image: { url: string } | null; totalPrice: Money | null; productId: string | null }[] } };
export type Customer = { firstName: string | null; lastName: string | null; displayName: string; emailAddress: { emailAddress: string } | null; phoneNumber: { phoneNumber: string } | null; defaultAddress: { id: string } | null };

const ADDRESS = `id firstName lastName address1 address2 city zip zoneCode countryCode phoneNumber formatted(withName: true)`;
const ORDER_BASE = `id name processedAt financialStatus fulfillmentStatus cancelledAt totalPrice { amount currencyCode }`;
const ORDER_SUMMARY = `${ORDER_BASE} lineItems(first: 4) { nodes { name quantity variantTitle image { url } } }`;

export async function getCustomer() {
  const d = await customerApi<{ customer: Customer & { orders: { nodes: OrderSummary[] } } }>(
    `{ customer { firstName lastName displayName emailAddress { emailAddress } phoneNumber { phoneNumber } defaultAddress { id } orders(first: 3, sortKey: PROCESSED_AT, reverse: true) { nodes { ${ORDER_SUMMARY} } } } }`);
  return d.customer;
}
export async function getOrders(): Promise<OrderSummary[]> {
  const d = await customerApi<{ customer: { orders: { nodes: OrderSummary[] } } }>(`{ customer { orders(first: 50, sortKey: PROCESSED_AT, reverse: true) { nodes { ${ORDER_SUMMARY} } } } }`);
  return d.customer.orders.nodes;
}
export async function getOrder(id: string): Promise<Order | null> {
  const d = await customerApi<{ order: Order | null }>(
    `query($id: ID!) { order(id: $id) { ${ORDER_BASE} subtotal { amount currencyCode } totalShipping { amount currencyCode } statusPageUrl shippingAddress { ${ADDRESS} }
      lineItems(first: 50) { nodes { name quantity variantTitle image { url } totalPrice { amount currencyCode } productId } } } }`, { id });
  return d.order;
}
export async function getAddresses(): Promise<{ addresses: Address[]; defaultId: string | null }> {
  const d = await customerApi<{ customer: { defaultAddress: { id: string } | null; addresses: { nodes: Address[] } } }>(`{ customer { defaultAddress { id } addresses(first: 20) { nodes { ${ADDRESS} } } } }`);
  return { addresses: d.customer.addresses.nodes, defaultId: d.customer.defaultAddress?.id ?? null };
}
export type AddressInput = { firstName?: string; lastName?: string; address1?: string; address2?: string; city?: string; zip?: string; phoneNumber?: string; countryCode?: string };
type Mut = { userErrors: { field: string[] | null; message: string }[] };
const ok = (m: Mut) => { if (m.userErrors?.length) throw new Error(m.userErrors[0].message); };
export async function saveAddress(input: AddressInput, id?: string, makeDefault?: boolean) {
  if (id) { const d = await customerApi<{ customerAddressUpdate: Mut }>(`mutation($id: ID!, $a: CustomerAddressInput, $def: Boolean) { customerAddressUpdate(addressId: $id, address: $a, defaultAddress: $def) { userErrors { field message } } }`, { id, a: input, def: makeDefault ?? null }); ok(d.customerAddressUpdate); }
  else { const d = await customerApi<{ customerAddressCreate: Mut }>(`mutation($a: CustomerAddressInput!, $def: Boolean) { customerAddressCreate(address: $a, defaultAddress: $def) { userErrors { field message } } }`, { a: input, def: !!makeDefault }); ok(d.customerAddressCreate); }
}
export async function deleteAddress(id: string) {
  const d = await customerApi<{ customerAddressDelete: Mut }>(`mutation($id: ID!) { customerAddressDelete(addressId: $id) { userErrors { field message } } }`, { id });
  ok(d.customerAddressDelete);
}
export async function updateName(firstName: string, lastName: string) {
  const d = await customerApi<{ customerUpdate: Mut }>(`mutation($in: CustomerUpdateInput!) { customerUpdate(input: $in) { userErrors { field message } } }`, { in: { firstName, lastName } });
  ok(d.customerUpdate);
}

// ---------- labels ----------
export const FINANCIAL: Record<string, string> = { PENDING: 'Paiement à la livraison', AUTHORIZED: 'Paiement autorisé', PAID: 'Payée', PARTIALLY_PAID: 'Partiellement payée', REFUNDED: 'Remboursée', PARTIALLY_REFUNDED: 'Partiellement remboursée', VOIDED: 'Annulée', EXPIRED: 'Expirée' };
export const FULFILLMENT: Record<string, string> = { UNFULFILLED: 'En préparation', IN_PROGRESS: 'En préparation', PARTIALLY_FULFILLED: 'Partiellement expédiée', FULFILLED: 'Expédiée', ON_HOLD: 'En attente', SCHEDULED: 'Programmée', OPEN: 'En préparation', PENDING_FULFILLMENT: 'En préparation', RESTOCKED: 'Annulée' };
export function orderStatus(o: Pick<OrderSummary, 'cancelledAt' | 'fulfillmentStatus'>) {
  if (o.cancelledAt) return 'Annulée';
  return FULFILLMENT[o.fulfillmentStatus] ?? o.fulfillmentStatus;
}
