// Shopify Storefront API client (zayou-5.myshopify.com).
// Works tokenless (products, collections, search, cart). A public Storefront token from the "Headless" channel
// can be set in app.json › expo.extra.storefrontToken to raise rate limits; it is sent when present.
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as { shopDomain?: string; storefrontToken?: string; apiVersion?: string };
export const SHOP_DOMAIN = extra.shopDomain ?? 'zayou-5.myshopify.com';
const API_VERSION = extra.apiVersion ?? '2025-10';
const ENDPOINT = `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`;

export class ShopifyError extends Error {}

export async function shopify<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (extra.storefrontToken) headers['X-Shopify-Storefront-Access-Token'] = extra.storefrontToken;
  const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
  if (!res.ok) throw new ShopifyError(`Shopify ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new ShopifyError(json.errors[0].message);
  return json.data as T;
}

// ---------- types ----------
export type Money = { amount: string; currencyCode: string };
export type Image = { url: string; width: number; height: number; altText: string | null };
export type Variant = {
  id: string; title: string; availableForSale: boolean; price: Money; compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
};
export type ProductCard = {
  id: string; handle: string; title: string; vendor: string; productType: string; availableForSale: boolean;
  featuredImage: Image | null; images: Image[];
  priceRange: { minVariantPrice: Money }; compareAtPriceRange: { maxVariantPrice: Money };
  options: { name: string; optionValues: { name: string }[] }[];
  variants: Variant[];
};
export type Product = ProductCard & { descriptionHtml: string; description: string; media: Image[] };

const IMAGE = `url width height altText`;
const VARIANT = `id title availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode } selectedOptions { name value }`;
const CARD = `id handle title vendor productType availableForSale
  featuredImage { ${IMAGE} } images(first: 2) { nodes { ${IMAGE} } }
  priceRange { minVariantPrice { amount currencyCode } } compareAtPriceRange { maxVariantPrice { amount currencyCode } }
  options { name optionValues { name } }
  variants(first: 20) { nodes { ${VARIANT} } }`;

type RawCard = Omit<ProductCard, 'images' | 'variants'> & { images: { nodes: Image[] }; variants: { nodes: Variant[] } };
const card = (p: RawCard): ProductCard => ({ ...p, images: p.images.nodes, variants: p.variants.nodes });

// ---------- products ----------
export async function getProduct(handle: string): Promise<Product | null> {
  const d = await shopify<{ product: (RawCard & { descriptionHtml: string; description: string; media: { nodes: { image?: Image }[] } }) | null }>(
    `query($handle: String!) { product(handle: $handle) { ${CARD} descriptionHtml description media(first: 20) { nodes { ... on MediaImage { image { ${IMAGE} } } } } } }`, { handle });
  if (!d.product) return null;
  const p = d.product;
  return { ...card(p), descriptionHtml: p.descriptionHtml, description: p.description, media: p.media.nodes.map(m => m.image).filter(Boolean) as Image[] };
}

/** Several products by handle, in the given order (missing ones are skipped). */
export async function getProductsByHandle(handles: string[]): Promise<ProductCard[]> {
  if (!handles.length) return [];
  const fields = handles.map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { ${CARD} }`).join('\n');
  const d = await shopify<Record<string, RawCard | null>>(`{ ${fields} }`);
  return handles.map((_, i) => d[`p${i}`]).filter(Boolean).map(p => card(p as RawCard));
}

/** One image of a product (1-based position), for editorial tiles that reuse real product photography. */
export async function getProductImages(handles: string[]): Promise<Record<string, Image[]>> {
  const uniq = [...new Set(handles)];
  const fields = uniq.map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { images(first: 10) { nodes { ${IMAGE} } } }`).join('\n');
  const d = await shopify<Record<string, { images: { nodes: Image[] } } | null>>(`{ ${fields} }`);
  return Object.fromEntries(uniq.map((h, i) => [h, d[`p${i}`]?.images.nodes ?? []]));
}

// ---------- collections ----------
export type Filter = { id: string; label: string; type: string; values: { id: string; label: string; count: number; input: string }[] };
export type CollectionPage = { title: string; description: string; image: Image | null; products: ProductCard[]; filters: Filter[]; endCursor: string | null; hasNextPage: boolean };
export type SortKey = 'COLLECTION_DEFAULT' | 'PRICE' | 'CREATED' | 'BEST_SELLING' | 'TITLE';

export async function getCollection(handle: string, opts: { after?: string | null; filters?: unknown[]; sortKey?: SortKey; reverse?: boolean; first?: number } = {}): Promise<CollectionPage | null> {
  const d = await shopify<{ collection: null | { title: string; description: string; image: Image | null; products: { nodes: RawCard[]; filters: Filter[]; pageInfo: { endCursor: string | null; hasNextPage: boolean } } } }>(
    `query($handle: String!, $after: String, $filters: [ProductFilter!], $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $first: Int!) {
      collection(handle: $handle) { title description image { ${IMAGE} }
        products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          nodes { ${CARD} } filters { id label type values { id label count input } } pageInfo { endCursor hasNextPage } } } }`,
    { handle, after: opts.after ?? null, filters: opts.filters ?? [], sortKey: opts.sortKey ?? 'COLLECTION_DEFAULT', reverse: !!opts.reverse, first: opts.first ?? 24 });
  if (!d.collection) return null;
  const c = d.collection;
  return { title: c.title, description: c.description, image: c.image, products: c.products.nodes.map(card), filters: c.products.filters, endCursor: c.products.pageInfo.endCursor, hasNextPage: c.products.pageInfo.hasNextPage };
}

export async function getCollectionsSummary(handles: string[]): Promise<Record<string, { title: string; count: number; image: Image | null }>> {
  // products(first: 250) is the max page; counts above that are capped (the store has < 100 per collection)
  const fields = handles.map((h, i) => `c${i}: collection(handle: ${JSON.stringify(h)}) { title image { ${IMAGE} } products(first: 250) { nodes { id featuredImage { ${IMAGE} } } } }`).join('\n');
  const d = await shopify<Record<string, { title: string; image: Image | null; products: { nodes: { id: string; featuredImage: Image | null }[] } } | null>>(`{ ${fields} }`);
  return Object.fromEntries(handles.map((h, i) => { const c = d[`c${i}`]; return [h, { title: c?.title ?? h, count: c?.products.nodes.length ?? 0, image: c?.image ?? c?.products.nodes[0]?.featuredImage ?? null }]; }));
}

/** Variants of every product in a collection (for the size table). */
export async function getCollectionVariants(handle: string): Promise<{ options: ProductCard['options']; variants: Variant[] }[]> {
  const d = await shopify<{ collection: null | { products: { nodes: { options: ProductCard['options']; variants: { nodes: Variant[] } }[] } } }>(
    `query($handle: String!) { collection(handle: $handle) { products(first: 250) { nodes { options { name optionValues { name } } variants(first: 20) { nodes { ${VARIANT} } } } } } }`, { handle });
  return (d.collection?.products.nodes ?? []).map(p => ({ options: p.options, variants: p.variants.nodes }));
}

/**
 * Every product of a listing, for client-side size/stock filtering (collections here are < 250 products).
 * key: a collection handle, "all", or "vendor:<name>".
 */
export async function getListing(key: string): Promise<{ title: string; description: string; products: ProductCard[] } | null> {
  if (key === 'all' || key.startsWith('vendor:')) {
    const q = key === 'all' ? '' : `vendor:'${key.slice(7).replace(/'/g, '')}'`;
    const d = await shopify<{ products: { nodes: RawCard[] } }>(`query($q: String) { products(first: 250, query: $q) { nodes { ${CARD} } } }`, { q: q || null });
    return { title: key === 'all' ? 'Tous les produits' : key.slice(7), description: '', products: d.products.nodes.map(card) };
  }
  const d = await shopify<{ collection: null | { title: string; description: string; products: { nodes: RawCard[] } } }>(
    `query($handle: String!) { collection(handle: $handle) { title description products(first: 250) { nodes { ${CARD} } } } }`, { handle: key });
  if (!d.collection) return null;
  return { title: d.collection.title, description: d.collection.description, products: d.collection.products.nodes.map(card) };
}

export async function getRecommendations(productId: string): Promise<ProductCard[]> {
  const d = await shopify<{ productRecommendations: RawCard[] | null }>(`query($id: ID!) { productRecommendations(productId: $id, intent: RELATED) { ${CARD} } }`, { id: productId });
  return (d.productRecommendations ?? []).map(card);
}

// ---------- search ----------
export async function search(term: string, first = 24): Promise<ProductCard[]> {
  const d = await shopify<{ search: { nodes: RawCard[] } }>(
    `query($q: String!, $first: Int!) { search(query: $q, first: $first, types: PRODUCT, unavailableProducts: LAST, prefix: LAST) { nodes { ... on Product { ${CARD} } } } }`, { q: term, first });
  return d.search.nodes.filter(n => n && n.handle).map(card);
}

export async function predictive(term: string): Promise<{ products: ProductCard[]; collections: { handle: string; title: string }[]; queries: string[] }> {
  const d = await shopify<{ predictiveSearch: { products: RawCard[]; collections: { handle: string; title: string }[]; queries: { text: string }[] } }>(
    `query($q: String!) { predictiveSearch(query: $q, limit: 8, types: [PRODUCT, COLLECTION, QUERY], unavailableProducts: LAST) {
      products { ${CARD} } collections { handle title } queries { text } } }`, { q: term });
  return { products: d.predictiveSearch.products.map(card), collections: d.predictiveSearch.collections, queries: d.predictiveSearch.queries.map(q => q.text) };
}

// ---------- cart ----------
export type CartLine = {
  id: string; quantity: number;
  cost: { totalAmount: Money; compareAtAmountPerQuantity: Money | null };
  merchandise: { id: string; title: string; availableForSale: boolean; image: Image | null; selectedOptions: { name: string; value: string }[]; product: { handle: string; title: string; featuredImage: Image | null } };
};
export type Cart = { id: string; checkoutUrl: string; totalQuantity: number; cost: { subtotalAmount: Money; totalAmount: Money }; lines: CartLine[] };

const CART = `id checkoutUrl totalQuantity cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
  lines(first: 50) { nodes { id quantity cost { totalAmount { amount currencyCode } compareAtAmountPerQuantity { amount currencyCode } }
    merchandise { ... on ProductVariant { id title availableForSale image { ${IMAGE} } selectedOptions { name value } product { handle title featuredImage { ${IMAGE} } } } } } }`;
type RawCart = Omit<Cart, 'lines'> & { lines: { nodes: CartLine[] } };
const cartOf = (c: RawCart | null): Cart | null => (c ? { ...c, lines: c.lines.nodes } : null);
type Mut = { cart: RawCart | null; userErrors: { message: string }[]; warnings?: { message: string }[] };
const check = (m: Mut) => { if (m.userErrors?.length) throw new ShopifyError(m.userErrors[0].message); return cartOf(m.cart); };

export async function cartGet(id: string): Promise<Cart | null> {
  const d = await shopify<{ cart: RawCart | null }>(`query($id: ID!) { cart(id: $id) { ${CART} } }`, { id });
  return cartOf(d.cart);
}
export async function cartCreate(lines: { merchandiseId: string; quantity: number }[]): Promise<Cart | null> {
  const d = await shopify<{ cartCreate: Mut }>(`mutation($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines, buyerIdentity: { countryCode: MA } }) { cart { ${CART} } userErrors { message } } }`, { lines });
  return check(d.cartCreate);
}
export async function cartAdd(cartId: string, lines: { merchandiseId: string; quantity: number }[]): Promise<Cart | null> {
  const d = await shopify<{ cartLinesAdd: Mut }>(`mutation($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART} } userErrors { message } } }`, { cartId, lines });
  return check(d.cartLinesAdd);
}
export async function cartUpdate(cartId: string, lines: { id: string; quantity: number }[]): Promise<Cart | null> {
  const d = await shopify<{ cartLinesUpdate: Mut }>(`mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART} } userErrors { message } } }`, { cartId, lines });
  return check(d.cartLinesUpdate);
}
export async function cartBuyer(cartId: string, buyer: { email?: string; phone?: string } | null): Promise<Cart | null> {
  // Shopify expects E.164 phones; only send a phone that looks valid.
  const phone = buyer?.phone && /^\+\d{8,15}$/.test(buyer.phone) ? buyer.phone : undefined;
  const d = await shopify<{ cartBuyerIdentityUpdate: Mut }>(`mutation($cartId: ID!, $b: CartBuyerIdentityInput!) { cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $b) { cart { ${CART} } userErrors { message } } }`,
    { cartId, b: { countryCode: 'MA', email: buyer?.email ?? null, ...(phone ? { phone } : {}) } });
  return check(d.cartBuyerIdentityUpdate);
}
export async function cartRemove(cartId: string, lineIds: string[]): Promise<Cart | null> {
  const d = await shopify<{ cartLinesRemove: Mut }>(`mutation($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART} } userErrors { message } } }`, { cartId, lineIds });
  return check(d.cartLinesRemove);
}

// ---------- helpers ----------
export const SIZE_RX = /taille|pointure|size/i;
export function sizeOptionName(p: Pick<ProductCard, 'options'>): string | null {
  const o = p.options.find(x => SIZE_RX.test(x.name)) ?? (p.options.length === 1 && p.options[0].name !== 'Title' ? p.options[0] : null);
  return o ? o.name : null;
}
export const sizeOf = (v: Variant, optionName: string | null) => (optionName ? v.selectedOptions.find(o => o.name === optionName)?.value ?? null : null);
export function money(m: Money | null | undefined): string {
  if (!m) return '';
  const n = Math.round(parseFloat(m.amount) * 100) / 100;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} dh`;
}
export const onSale = (price: Money, compare: Money | null | undefined) => !!compare && parseFloat(compare.amount) > parseFloat(price.amount);
/** Shopify CDN resize (keeps the original photo, only scales it). */
export function sized(url: string | undefined | null, width: number): string | undefined {
  if (!url) return undefined;
  return url + (url.includes('?') ? '&' : '?') + `width=${width}`;
}
