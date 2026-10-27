// ZAYOU account API (server/ — native sign-up and login, customers stored in Shopify).
// The session token is kept in the device's secure storage (Keychain / Keystore).
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
export const API_URL = (extra.apiUrl ?? '').replace(/\/$/, '');
export const accountConfigured = () => !!API_URL;

const KEY = 'zy_session';
const store = {
  get: () => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: (v: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(KEY, v)) : SecureStore.setItemAsync(KEY, v)),
  del: () => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(KEY)) : SecureStore.deleteItemAsync(KEY)),
};
export const getToken = () => store.get();
export const clearSession = () => store.del();

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'Le compte sera disponible très bientôt.');
  const token = await store.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new ApiError(0, 'Pas de connexion internet. Réessayez.'); }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token) await store.del();
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'Une erreur est survenue. Réessayez.');
  return json as T;
}

export type Money = { amount: string; currencyCode: string };
export type Customer = { id: string; firstName: string; lastName: string; email: string; phone: string };
export type OrderLine = { name: string; size: string | null; quantity: number; image: string | null; total: Money | null; handle: string | null };
export type Order = { id: string; name: string; processedAt: string; cancelledAt: string | null; financialStatus: string; fulfillmentStatus: string; statusPageUrl: string; total: Money; subtotal: Money | null; shipping: Money | null; shippingAddress: string[] | null; lines: OrderLine[] };
export type Address = { id: string; firstName: string | null; lastName: string | null; address1: string | null; address2: string | null; city: string | null; zip: string | null; phone: string | null; formatted: string[] };
type Session = { token: string; customer: Customer };
type VerifyNeeded = { status: 'verify'; email: string };

const keep = async <T extends Session>(s: T) => { await store.set(s.token); return s; };

// ---------- auth ----------
export const signup = (b: { firstName: string; lastName: string; email: string; password: string }) => api<VerifyNeeded>('POST', '/auth/signup', b);
export const verifyEmail = async (email: string, code: string) => keep(await api<Session>('POST', '/auth/verify', { email, code }));
export const resendCode = (email: string) => api<{ ok: true }>('POST', '/auth/resend', { email });
export async function login(email: string, password: string): Promise<Session | VerifyNeeded> {
  const r = await api<Session | VerifyNeeded>('POST', '/auth/login', { email, password });
  return 'token' in r ? keep(r) : r;
}
export const forgotPassword = (email: string) => api<{ ok: true }>('POST', '/auth/forgot', { email });
export const resetPassword = async (email: string, code: string, password: string) => keep(await api<Session>('POST', '/auth/reset', { email, code, password }));

// ---------- account ----------
export const getMe = () => api<{ customer: Customer; orders: Order[] }>('GET', '/me');
export const updateMe = (b: Partial<Pick<Customer, 'firstName' | 'lastName' | 'phone'>>) => api<{ customer: Customer }>('PATCH', '/me', b);
export const changePassword = async (current: string, password: string) => keep(await api<Session>('POST', '/me/password', { current, password }));
export const deleteAccount = async () => { await api('DELETE', '/me'); await store.del(); };
export const getOrders = () => api<{ orders: Order[] }>('GET', '/orders').then(r => r.orders);
export const getOrder = (id: string) => api<{ order: Order }>('GET', `/orders/${numericId(id)}`).then(r => r.order);
export const getAddresses = () => api<{ addresses: Address[]; defaultId: string | null }>('GET', '/addresses');
export type AddressInput = { firstName: string; lastName: string; address1: string; address2?: string; city: string; zip?: string; phone?: string; isDefault?: boolean };
type AddressList = { addresses: Address[]; defaultId: string | null };
export const saveAddress = (a: AddressInput, id?: string) => (id ? api<AddressList>('PUT', `/addresses/${numericId(id)}`, a) : api<AddressList>('POST', '/addresses', a));
export const deleteAddress = (id: string) => api<AddressList>('DELETE', `/addresses/${numericId(id)}`);
export const numericId = (gid: string) => gid.match(/\/(\d+)(\?|$)/)?.[1] ?? gid;

// ---------- labels (Shopify admin display statuses) ----------
const FULFILLMENT: Record<string, string> = { UNFULFILLED: 'En préparation', IN_PROGRESS: 'En préparation', PENDING_FULFILLMENT: 'En préparation', OPEN: 'En préparation', SCHEDULED: 'Programmée', ON_HOLD: 'En attente', PARTIALLY_FULFILLED: 'Partiellement expédiée', FULFILLED: 'Expédiée', RESTOCKED: 'Annulée' };
export const FINANCIAL: Record<string, string> = { PENDING: 'À payer à la livraison', AUTHORIZED: 'Paiement autorisé', PAID: 'Payée', PARTIALLY_PAID: 'Partiellement payée', REFUNDED: 'Remboursée', PARTIALLY_REFUNDED: 'Partiellement remboursée', VOIDED: 'Annulée', EXPIRED: 'Expirée' };
export const orderStatus = (o: Pick<Order, 'cancelledAt' | 'fulfillmentStatus'>) => (o.cancelledAt ? 'Annulée' : FULFILLMENT[o.fulfillmentStatus] ?? o.fulfillmentStatus);
