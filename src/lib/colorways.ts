// Colourways: on this store each colour is a separate product. Groups were derived from the real product titles
// (same data as the Shopify theme: zayou-redesign/data/colorways.json — regenerate there and copy here when products change).
import raw from '@/content/colorways.json';

type Entry = { model: string; label: string | null; material: string | null; hex: string[]; siblings: string[] };
const map = raw as Record<string, Entry>;

export function colorway(handle: string): Entry | null {
  return map[handle] ?? null;
}
