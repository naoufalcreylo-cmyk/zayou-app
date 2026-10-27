// Shopify cart (Storefront API). The cart id is kept on the device; checkout opens Shopify's own checkout,
// so every order (including cash on delivery) is created in Shopify admin exactly like a website order.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { Cart, cartAdd, cartCreate, cartGet, cartRemove, cartUpdate } from '@/lib/shopify';

const KEY = 'zayou:cart';
type Ctx = {
  cart: Cart | null; busy: boolean; error: string | null; lastAdded: { id: string; at: number } | null;
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  checkout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
};
const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<{ id: string; at: number } | null>(null);
  const idRef = useRef<string | null>(null);

  const save = (c: Cart | null) => { setCart(c); idRef.current = c?.id ?? null; (c ? AsyncStorage.setItem(KEY, c.id) : AsyncStorage.removeItem(KEY)).catch(() => {}); };

  // A completed checkout makes the cart unavailable: start fresh in that case.
  const refresh = useCallback(async () => {
    const id = idRef.current ?? (await AsyncStorage.getItem(KEY).catch(() => null));
    if (!id) return;
    try { const c = await cartGet(id); save(c && c.totalQuantity >= 0 ? c : null); } catch { /* offline: keep last state */ }
  }, []);

  useEffect(() => { refresh(); const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); }); return () => sub.remove(); }, [refresh]);

  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError(null);
    try { return await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Une erreur est survenue. Veuillez réessayer.'); return undefined; }
    finally { setBusy(false); }
  };

  const add = async (variantId: string, quantity = 1) => {
    const c = await run(async () => {
      const lines = [{ merchandiseId: variantId, quantity }];
      const id = idRef.current;
      if (!id) return cartCreate(lines);
      try { return await cartAdd(id, lines); }
      catch (e) {
        // Only start a new cart if the old one no longer exists (e.g. it was checked out); otherwise surface the error.
        if (await cartGet(id).catch(() => null)) throw e;
        return cartCreate(lines);
      }
    });
    if (c) { save(c); setLastAdded({ id: variantId, at: Date.now() }); return true; }
    return false;
  };
  const setQuantity = async (lineId: string, quantity: number) => {
    if (!idRef.current) return;
    const c = await run(() => (quantity > 0 ? cartUpdate(idRef.current!, [{ id: lineId, quantity }]) : cartRemove(idRef.current!, [lineId])));
    if (c !== undefined) save(c);
  };
  const remove = (lineId: string) => setQuantity(lineId, 0);

  const checkout = async () => {
    if (!cart) return;
    if (Platform.OS === 'web') { window.location.href = cart.checkoutUrl; return; }
    await WebBrowser.openBrowserAsync(cart.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, toolbarColor: '#FFFFFF', controlsColor: '#111111' });
    await refresh();
  };

  return <CartCtx.Provider value={{ cart, busy, error, lastAdded, add, setQuantity, remove, checkout, refresh, clearError: () => setError(null) }}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
