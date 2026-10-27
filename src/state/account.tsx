import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { accountConfigured, AuthError, Customer, getCustomer, isLoggedIn, login as doLogin, logout as doLogout, OrderSummary } from '@/lib/account';

type State = { status: 'loading' | 'out' | 'in'; customer: (Customer & { orders: { nodes: OrderSummary[] } }) | null; error: string | null; configured: boolean };
type Ctx = State & { login: () => Promise<void>; logout: () => Promise<void>; reload: () => Promise<void> };
const AccountCtx = createContext<Ctx | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>({ status: 'loading', customer: null, error: null, configured: accountConfigured() });
  const reload = useCallback(async () => {
    if (!accountConfigured() || !(await isLoggedIn())) { set(x => ({ ...x, status: 'out', customer: null })); return; }
    try { const c = await getCustomer(); set(x => ({ ...x, status: 'in', customer: c, error: null })); }
    catch (e) { set(x => ({ ...x, status: e instanceof AuthError ? 'out' : x.status === 'loading' ? 'out' : x.status, error: e instanceof AuthError ? null : 'Impossible de charger votre compte. Vérifiez votre connexion.' })); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const login = async () => {
    try { if (await doLogin()) await reload(); }
    catch (e) { set(x => ({ ...x, error: e instanceof Error ? e.message : 'Connexion impossible.' })); }
  };
  const logout = async () => { await doLogout(); set(x => ({ ...x, status: 'out', customer: null })); };
  return <AccountCtx.Provider value={{ ...s, login, logout, reload }}>{children}</AccountCtx.Provider>;
}
export function useAccount() { const c = useContext(AccountCtx); if (!c) throw new Error('useAccount outside AccountProvider'); return c; }
