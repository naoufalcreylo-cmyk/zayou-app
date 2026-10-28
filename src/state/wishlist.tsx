// Wishlist (« liste d’envies »): product handles saved on the device, available with or without an account.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const KEY = 'zayou:wishlist';
type Ctx = { handles: string[]; has: (h: string) => boolean; toggle: (h: string) => void; remove: (h: string) => void };
const WishCtx = createContext<Ctx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [handles, setHandles] = useState<string[]>([]);
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => v && setHandles(JSON.parse(v))).catch(() => {}); }, []);
  const save = (next: string[]) => { setHandles(next); AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {}); };
  const toggle = (h: string) => {
    const on = handles.includes(h);
    save(on ? handles.filter(x => x !== h) : [h, ...handles]);
    AccessibilityInfo.announceForAccessibility(on ? 'Retiré de la liste d’envies' : 'Ajouté à la liste d’envies');
  };
  return <WishCtx.Provider value={{ handles, has: h => handles.includes(h), toggle, remove: h => save(handles.filter(x => x !== h)) }}>{children}</WishCtx.Provider>;
}
export function useWishlist() { const c = useContext(WishCtx); if (!c) throw new Error('useWishlist outside WishlistProvider'); return c; }
