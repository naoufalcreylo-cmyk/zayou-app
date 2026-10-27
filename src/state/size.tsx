// Remembered shoe size: marked on product pages, never pre-selected.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const KEY = 'zayou:size';
const Ctx = createContext<{ size: string | null; setSize: (s: string | null) => void }>({ size: null, setSize: () => {} });

export function SizeProvider({ children }: { children: ReactNode }) {
  const [size, set] = useState<string | null>(null);
  useEffect(() => { AsyncStorage.getItem(KEY).then(v => v && set(v)).catch(() => {}); }, []);
  const setSize = (s: string | null) => { set(s); (s ? AsyncStorage.setItem(KEY, s) : AsyncStorage.removeItem(KEY)).catch(() => {}); };
  return <Ctx.Provider value={{ size, setSize }}>{children}</Ctx.Provider>;
}
export const useSize = () => useContext(Ctx);
