// Logged-in customer → Shopify cart buyer identity (pre-fills checkout and links the order to the customer's e-mail).
type Buyer = { email: string; phone?: string } | null;
let current: Buyer = null;
const listeners = new Set<(b: Buyer) => void>();

export function cartLinkCustomer(c: { email: string; phone?: string } | null) {
  current = c ? { email: c.email, phone: c.phone || undefined } : null;
  listeners.forEach(l => l(current));
}
export const currentBuyer = () => current;
export function onBuyerChange(fn: (b: Buyer) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
