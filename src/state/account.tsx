import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { accountConfigured, ApiError, clearSession, Customer, getMe, getToken, Order } from '@/lib/account';
import { cartLinkCustomer } from '@/state/cart-link';

type State = { status: 'loading' | 'out' | 'in'; customer: Customer | null; orders: Order[]; error: string | null; configured: boolean };
type Ctx = State & { reload: () => Promise<void>; signedIn: (c: Customer) => Promise<void>; logout: () => Promise<void> };
const AccountCtx = createContext<Ctx | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>({ status: 'loading', customer: null, orders: [], error: null, configured: accountConfigured() });
  const reload = useCallback(async () => {
    if (!accountConfigured() || !(await getToken())) { set(x => ({ ...x, status: 'out', customer: null, orders: [] })); return; }
    try {
      const me = await getMe();
      set(x => ({ ...x, status: 'in', customer: me.customer, orders: me.orders, error: null }));
      cartLinkCustomer(me.customer);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) set(x => ({ ...x, status: 'out', customer: null, orders: [] }));
      else set(x => ({ ...x, status: x.status === 'loading' ? 'out' : x.status, error: e instanceof Error ? e.message : 'Erreur' }));
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const signedIn = async (c: Customer) => { set(x => ({ ...x, status: 'in', customer: c, error: null })); cartLinkCustomer(c); await reload(); };
  const logout = async () => { await clearSession(); cartLinkCustomer(null); set(x => ({ ...x, status: 'out', customer: null, orders: [] })); };
  return <AccountCtx.Provider value={{ ...s, reload, signedIn, logout }}>{children}</AccountCtx.Provider>;
}
export function useAccount() { const c = useContext(AccountCtx); if (!c) throw new Error('useAccount outside AccountProvider'); return c; }
