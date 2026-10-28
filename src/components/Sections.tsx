// Renders the content sections generated from the Shopify theme templates (src/content/sections.json).
// Every image is a real product photo fetched from Shopify (no generated imagery).
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colorway } from '@/lib/colorways';
import { getCollectionsSummary, getCollectionVariants, getListing, getProductImages, getProductsByHandle, Image as Img, ProductCard as P, sized, sizeOf, sizeOptionName } from '@/lib/shopify';
import { useSize } from '@/state/size';
import { C, F, R, S, T } from '@/theme';

import { Icon, IconName } from './Icon';
import { QuickAdd } from './QuickAdd';
import { Button, Chip, Price, ProductCard, SectionHead, Tile } from './ui';

type Ref = { product: string; position: number } | null;
type Sec = Record<string, any> & { type: string };

export function go(href?: string | null) {
  if (!href) return;
  if (/^https?:\/\//.test(href)) { if (href.includes('wa.me') || href.startsWith('tel:')) Linking.openURL(href); else WebBrowser.openBrowserAsync(href); return; }
  router.push(href as never);
}

/** Loads every product photo / product referenced by a list of sections in two requests. */
export function useSectionData(sections: Sec[]) {
  const [images, setImages] = useState<Record<string, Img[]>>({});
  const [products, setProducts] = useState<Record<string, P>>({});
  const [summary, setSummary] = useState<Record<string, { title: string; count: number; image: Img | null }>>({});
  const [error, setError] = useState(false);
  useEffect(() => {
    const imgHandles = new Set<string>(); const prodHandles = new Set<string>(); const cols = new Set<string>();
    const ref = (r: Ref) => r?.product && imgHandles.add(r.product);
    for (const s of sections) {
      ref(s.image); ref(s.image2);
      for (const it of s.items ?? []) { ref(it.image); if (it.product && s.type === 'details') imgHandles.add(it.product); (it.products ?? []).forEach((h: string) => prodHandles.add(h)); if (s.type === 'categories' && it.collection) cols.add(it.collection); }
      (s.products ?? []).forEach((h: string) => prodHandles.add(h));
      if (s.type === 'spotlight' && s.product) { imgHandles.add(s.product); (colorway(s.product)?.siblings ?? [s.product]).forEach(h => prodHandles.add(h)); }
    }
    let alive = true;
    Promise.all([
      imgHandles.size ? getProductImages([...imgHandles]) : Promise.resolve({}),
      prodHandles.size ? getProductsByHandle([...prodHandles]) : Promise.resolve([]),
      cols.size ? getCollectionsSummary([...cols]) : Promise.resolve({}),
    ]).then(([i, p, c]) => { if (!alive) return; setImages(i); setProducts(Object.fromEntries((p as P[]).map(x => [x.handle, x]))); setSummary(c); })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [sections]);
  const pick = (r: Ref) => (r ? images[r.product]?.[r.position - 1] ?? images[r.product]?.[0] ?? null : null);
  return { pick, images, products, summary, error };
}

export function Sections({ sections }: { sections: Sec[] }) {
  const data = useSectionData(sections);
  const [quick, setQuick] = useState<P | null>(null);
  return (
    <View>
      {sections.map((s, i) => <SectionView key={i} s={s} data={data} onQuickAdd={setQuick} />)}
      <QuickAdd product={quick} onClose={() => setQuick(null)} />
    </View>
  );
}

type Data = ReturnType<typeof useSectionData>;
function SectionView({ s, data, onQuickAdd }: { s: Sec; data: Data; onQuickAdd: (p: P) => void }) {
  switch (s.type) {
    case 'hero': return <Hero s={s} data={data} />;
    case 'pageHero': return <PageHero s={s} data={data} />;
    case 'categories': return <Categories s={s} data={data} />;
    case 'rail': return <Rail title={s.heading} handles={s.products} data={data} action={s.action} href={s.href} onQuickAdd={onQuickAdd} />;
    case 'listing': return <ListingRail s={s} onQuickAdd={onQuickAdd} />;
    case 'styles': return <Styles s={s} data={data} />;
    case 'sizeFinder': return <SizeFinder s={s} />;
    case 'spotlight': return <Spotlight s={s} data={data} />;
    case 'details': return <Details s={s} data={data} />;
    case 'brand': return <Brand s={s} data={data} />;
    case 'cards': return <Cards s={s} data={data} />;
    case 'steps': return <Steps s={s} data={data} />;
    case 'faq': return <Faq s={s} />;
    case 'sizes': return <SizesTable s={s} />;
    case 'services': return <Services s={s} />;
    default: return null;
  }
}

// ---------- hero: campaign photo + headline ----------
function Hero({ s, data }: { s: Sec; data: Data }) {
  const { width } = useWindowDimensions();
  const a = data.pick(s.image), b = data.pick(s.image2);
  const two = width >= 700 && b;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => go(s.href)} style={{ flex: 1, aspectRatio: two ? 1 : 4 / 3, backgroundColor: C.surface }} accessibilityRole="link" accessibilityLabel={s.alt}>
          {a ? <Image source={{ uri: sized(a.url, 1200) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        </Pressable>
        {two ? <View style={{ flex: 1, aspectRatio: 1, backgroundColor: C.surface }}><Image source={{ uri: sized(b!.url, 1200) }} style={StyleSheet.absoluteFill} contentFit="cover" /></View> : null}
      </View>
      <View style={{ paddingHorizontal: S.edge, paddingTop: 18, gap: 10 }}>
        {s.eyebrow ? <Text style={T.label}>{s.eyebrow}</Text> : null}
        <Text style={T.display} accessibilityRole="header">{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
        {s.cta ? <Button label={s.cta} icon="arrow-right" onPress={() => go(s.href)} style={{ marginTop: 6 }} /> : null}
      </View>
    </View>
  );
}

function PageHero({ s, data }: { s: Sec; data: Data }) {
  const im = data.pick(s.image);
  return (
    <View style={{ paddingHorizontal: S.edge, paddingTop: 12, paddingBottom: 8, gap: 12 }}>
      {im ? <Tile uri={im.url} width={1000} label={s.alt} /> : null}
      {s.eyebrow ? <Text style={T.label}>{s.eyebrow}</Text> : null}
      <Text style={T.display} accessibilityRole="header">{s.title}</Text>
      {s.intro?.map((p: string, i: number) => <Text key={i} style={[T.body, { color: C.ink2, fontSize: 16, lineHeight: 24 }]}>{p}</Text>)}
    </View>
  );
}

// ---------- categories: square tiles ----------
function Categories({ s, data }: { s: Sec; data: Data }) {
  const w = 148;
  return (
    <View style={st.section}>
      <SectionHead title={s.heading} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.edge, gap: S.gap }}>
        {s.items.filter((it: any) => (data.summary[it.collection]?.count ?? 1) > 0).map((it: any) => {
          const im = data.pick(it.image);
          return (
            <Link key={it.collection} href={`/collection/${it.collection}`} asChild>
              <Pressable style={{ width: w, gap: 10 }} accessibilityRole="link" accessibilityLabel={`${it.label}, ${data.summary[it.collection]?.count ?? ''} produits`}>
                <Tile uri={im?.url} width={400} packshot />
                <Text style={st.catLabel}>{it.label}<Text style={T.small}> {data.summary[it.collection]?.count ?? ''}</Text></Text>
              </Pressable>
            </Link>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Rail({ title, handles, products, data, action, href, onQuickAdd }: { title: string; handles?: string[]; products?: P[]; data?: Data; action?: string; href?: string; onQuickAdd?: (p: P) => void }) {
  const list = products ?? (handles ?? []).map(h => data?.products[h]).filter(Boolean) as P[];
  if (!list.length) return null;
  return (
    <View style={st.section}>
      <SectionHead title={title} action={action} href={href ?? undefined} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.edge, gap: S.gap }} decelerationRate="fast" snapToInterval={230 + S.gap}>
        {list.map(p => <ProductCard key={p.id} product={p} width={230} onQuickAdd={onQuickAdd} />)}
      </ScrollView>
    </View>
  );
}

/** Rail filled from a live listing (best sellers, déstockage, a collection): first products in stock; « Voir tout » opens the full listing. */
function ListingRail({ s, onQuickAdd }: { s: Sec; onQuickAdd: (p: P) => void }) {
  const [list, setList] = useState<P[]>([]);
  useEffect(() => {
    let alive = true;
    getListing(s.listing).then(d => { if (alive) setList((d?.products ?? []).filter(p => p.availableForSale).slice(0, s.limit ?? 10)); }).catch(() => {});
    return () => { alive = false; };
  }, [s.listing, s.limit]);
  return <Rail title={s.heading} products={list} action={s.action ?? 'Voir tout'} href={`/collection/${s.listing}`} onQuickAdd={onQuickAdd} />;
}

// ---------- styles: tabs (home) or stacked (inspirations) ----------
function Styles({ s, data }: { s: Sec; data: Data }) {
  const [active, setActive] = useState(0);
  const { width } = useWindowDimensions();
  const cardW = (width - S.edge * 2 - S.gap) / 2;
  const items = s.layout === 'tabs' ? [s.items[active]] : s.items;
  return (
    <View style={st.section}>
      <SectionHead title={s.heading} action={s.action} href={s.href} />
      {s.layout === 'tabs' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.edge, gap: 8, marginBottom: 16 }} accessibilityRole="tablist">
          {s.items.map((it: any, i: number) => <Chip key={it.id} label={it.title} active={i === active} onPress={() => setActive(i)} />)}
        </ScrollView>
      ) : null}
      {items.map((it: any, idx: number) => {
        const im = data.pick(it.image);
        const prods = (it.products as string[]).map(h => data.products[h]).filter(Boolean) as P[];
        return (
          <View key={it.id} style={{ paddingHorizontal: S.edge, gap: 14, marginBottom: s.layout === 'tabs' ? 0 : 44 }}>
            <Tile uri={im?.url} width={1000} label={it.alt} />
            {s.layout !== 'tabs' ? <Text style={T.label}>{String(idx + 1).padStart(2, '0')}</Text> : null}
            <Text style={T.h3}>{it.title}</Text>
            {it.text.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.gap, rowGap: 22 }}>
              {prods.slice(0, 4).map(p => <ProductCard key={p.id} product={p} width={cardW} />)}
            </View>
            {it.cta && it.href ? <Button label={it.cta} variant="ghost" icon="arrow-right" onPress={() => go(it.href)} style={{ alignSelf: 'flex-start' }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

// ---------- size finder ----------
function SizeFinder({ s }: { s: Sec }) {
  const { size, setSize } = useSize();
  const sizes = ['39', '40', '41', '42', '43', '44', '45'];
  return (
    <View style={[st.section, st.surface]}>
      <View style={{ paddingHorizontal: S.edge, gap: 10 }}>
        <Text style={T.h1}>{s.heading}</Text>
        <Text style={T.bodyMuted}>Choisissez votre pointure : l’application n’affiche que les modèles disponibles dans cette taille, et la repère sur chaque fiche produit.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          {sizes.map(x => (
            <Pressable key={x} onPress={() => { setSize(x); router.push(`/collection/all?taille=${x}`); }} accessibilityRole="button" accessibilityLabel={`Pointure ${x}`}
              style={[st.sizeCircle, size === x && { backgroundColor: C.ink, borderColor: C.ink }]}>
              <Text style={[st.sizeText, size === x && { color: C.bg }]}>{x}</Text>
            </Pressable>
          ))}
        </View>
        {size ? <Pressable onPress={() => setSize(null)} hitSlop={8}><Text style={[T.small, { textDecorationLine: 'underline' }]}>Pointure {size} mémorisée — oublier</Text></Pressable> : null}
      </View>
    </View>
  );
}

// ---------- one model, all colourways ----------
function Spotlight({ s, data }: { s: Sec; data: Data }) {
  const way = colorway(s.product);
  const handles = way?.siblings.length ? way.siblings : [s.product];
  const list = handles.map(h => data.products[h]).filter(Boolean) as P[];
  const [sel, setSel] = useState(s.product as string);
  const cur = list.find(p => p.handle === sel) ?? list[0];
  const lineup = s.lineup ? data.pick({ product: s.product, position: s.lineup }) : null;
  if (!cur) return null;
  return (
    <View style={st.section}>
      <View style={{ paddingHorizontal: S.edge, gap: 10 }}>
        {s.eyebrow ? <Text style={T.label}>{s.eyebrow}</Text> : null}
        <Text style={T.h1}>{s.heading}</Text>
        <Text style={T.body}>{list.length} coloris</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
        {lineup ? <View style={[st.lineup]}><Image source={{ uri: sized(lineup.url, 1000) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Tous les coloris du modèle" /></View> : null}
        <Link href={`/produit/${cur.handle}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={cur.title} style={{ gap: 10, marginTop: 6 }}>
            <Tile uri={cur.featuredImage?.url} width={1000} packshot />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={st.name}>{cur.title}</Text>
              <Price price={cur.priceRange.minVariantPrice} compare={cur.compareAtPriceRange.maxVariantPrice} />
            </View>
          </Pressable>
        </Link>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} accessibilityRole="tablist">
          {list.map(p => (
            <Pressable key={p.handle} onPress={() => setSel(p.handle)} accessibilityRole="tab" accessibilityState={{ selected: p.handle === cur.handle }} accessibilityLabel={colorway(p.handle)?.label ?? p.title} style={{ width: 72, gap: 6, alignItems: 'center' }}>
              <View style={{ width: 72, borderWidth: 1, borderColor: p.handle === cur.handle ? C.ink : 'transparent', borderRadius: R.sm, overflow: 'hidden' }}>
                <Tile uri={p.featuredImage?.url} width={200} packshot style={{ borderRadius: R.sm }} />
              </View>
              <Text style={[T.small, p.handle === cur.handle && { color: C.ink, fontFamily: F.semibold }]} numberOfLines={1}>{colorway(p.handle)?.label ?? ''}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------- close-ups ----------
function Details({ s, data }: { s: Sec; data: Data }) {
  const { width } = useWindowDimensions();
  const half = (width - S.edge * 2 - S.gap) / 2;
  return (
    <View style={st.section}>
      <View style={{ paddingHorizontal: S.edge, gap: 8, marginBottom: 18 }}>
        <Text style={T.h1}>{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
      </View>
      <View style={{ paddingHorizontal: S.edge, flexDirection: 'row', flexWrap: 'wrap', gap: S.gap, rowGap: 20 }}>
        {s.items.map((it: any, i: number) => {
          const im = data.pick({ product: it.product, position: it.position });
          return (
            <Link key={i} href={`/produit/${it.product}`} asChild>
              <Pressable style={{ width: i === 0 ? width - S.edge * 2 : half, gap: 8 }} accessibilityRole="link" accessibilityLabel={`${it.caption}, voir le produit`}>
                <Tile uri={im?.url} width={i === 0 ? 1000 : 500} label={it.alt} />
                <Text style={st.name}>{it.caption}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

// ---------- brand in brief ----------
function Brand({ s, data }: { s: Sec; data: Data }) {
  const im = data.pick(s.image);
  return (
    <View style={[st.section, s.surface && st.surface]}>
      <View style={{ paddingHorizontal: S.edge, gap: 14 }}>
        {im ? <Tile uri={im.url} width={1000} label={s.alt} /> : null}
        {s.eyebrow ? <Text style={T.label}>{s.eyebrow}</Text> : null}
        <Text style={T.h1}>{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={[T.bodyMuted, { fontSize: 16, lineHeight: 24 }]}>{p}</Text>)}
        {s.facts?.length ? (
          <View style={st.facts}>
            {s.facts.map((f: any, i: number) => (
              <View key={i} style={{ width: '50%', paddingVertical: 10, paddingRight: 10 }}>
                <Text style={st.factValue}>{f.value}</Text><Text style={T.small}>{f.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {s.action && s.href ? <Pressable onPress={() => go(s.href)} style={st.arrowLink} accessibilityRole="link"><Text style={st.name}>{s.action}</Text><Icon name="arrow-right" size={14} /></Pressable> : null}
      </View>
    </View>
  );
}

// ---------- guide cards ----------
function Cards({ s, data }: { s: Sec; data: Data }) {
  if (!s.items?.length) return null;
  return (
    <View style={st.section}>
      <SectionHead title={s.heading} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.edge, gap: S.gap }}>
        {s.items.map((c: any, i: number) => {
          const im = data.pick(c.image);
          return (
            <Pressable key={i} onPress={() => go(c.href)} style={{ width: 250, gap: 8 }} accessibilityRole="link" accessibilityLabel={c.title}>
              <Tile uri={im?.url} width={600} packshot={!c.photo} />
              {c.eyebrow ? <Text style={T.label}>{c.eyebrow}</Text> : null}
              <Text style={st.cardTitle}>{c.title}</Text>
              {c.text ? <Text style={T.small}>{c.text}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------- numbered steps / advice ----------
function Steps({ s, data }: { s: Sec; data: Data }) {
  return (
    <View style={[st.section, s.surface && st.surface]}>
      <View style={{ paddingHorizontal: S.edge, gap: 8, marginBottom: 8 }}>
        {s.eyebrow ? <Text style={T.label}>{s.eyebrow}</Text> : null}
        <Text style={T.h2}>{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
      </View>
      {s.items.map((it: any, i: number) => {
        const im = data.pick(it.image);
        return (
          <View key={i} style={st.step}>
            {im ? <View style={{ width: 96 }}><Tile uri={im.url} width={300} /></View> : null}
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={T.label}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={st.stepTitle}>{it.title}</Text>
              {it.text.map((p: string, j: number) => <Text key={j} style={T.bodyMuted}>{p}</Text>)}
              {it.cta && it.href ? <Pressable onPress={() => go(it.href)} style={st.arrowLink} accessibilityRole="link"><Text style={st.name}>{it.cta}</Text><Icon name="arrow-right" size={14} /></Pressable> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------- FAQ accordions ----------
function Faq({ s }: { s: Sec }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={st.section}>
      <View style={{ paddingHorizontal: S.edge, gap: 6, marginBottom: 8 }}>
        <Text style={T.h2}>{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
      </View>
      <View style={{ paddingHorizontal: S.edge }}>
        {s.items.map((it: any, i: number) => (
          <View key={i} style={st.acc}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={st.accHead} accessibilityRole="button" accessibilityState={{ expanded: open === i }}>
              <Text style={[st.name, { flex: 1, fontSize: 16 }]}>{it.q}</Text>
              <Icon name={open === i ? 'minus' : 'plus'} size={16} />
            </Pressable>
            {open === i ? <View style={{ paddingBottom: 18, gap: 8 }}>{it.a.map((p: string, j: number) => <Text key={j} style={T.bodyMuted}>{p}</Text>)}</View> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- sizes per category, computed from the catalogue ----------
function SizesTable({ s }: { s: Sec }) {
  const [rows, setRows] = useState<{ label: string; collection: string; offered: string[]; stock: string[] }[] | null>(null);
  useEffect(() => {
    Promise.all(s.items.map(async (it: any) => {
      const prods = await getCollectionVariants(it.collection);
      const offered = new Set<string>(), stock = new Set<string>();
      for (const p of prods) { const opt = sizeOptionName(p); for (const v of p.variants) { const x = sizeOf(v, opt); if (!x) continue; offered.add(x); if (v.availableForSale) stock.add(x); } }
      return { label: it.label, collection: it.collection, offered: [...offered].sort(), stock: [...stock].sort() };
    })).then(setRows).catch(() => setRows([]));
  }, [s]);
  const { setSize } = useSize();
  return (
    <View style={st.section}>
      <View style={{ paddingHorizontal: S.edge, gap: 6, marginBottom: 10 }}>
        <Text style={T.h2}>{s.heading}</Text>
        {s.text?.map((p: string, i: number) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
      </View>
      {(rows ?? []).filter(r => r.offered.length).map(r => (
        <View key={r.collection} style={st.sizeRow}>
          <Text style={st.stepTitle}>{r.label}</Text>
          <Text style={T.small}>Proposées : {r.offered.join(' · ')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {r.stock.map(x => <Chip key={x} label={x} onPress={() => { setSize(x); router.push(`/collection/${r.collection}?taille=${x}`); }} accessibilityLabel={`${r.label} en pointure ${x}`} />)}
          </View>
        </View>
      ))}
      {s.note?.map((p: string, i: number) => <Text key={i} style={[T.small, { paddingHorizontal: S.edge, marginTop: 10 }]}>{p}</Text>)}
    </View>
  );
}

function Services({ s }: { s: Sec }) {
  const icons: Record<string, IconName> = { truck: 'truck', cash: 'cash', whatsapp: 'whatsapp', phone: 'phone', chat: 'info', ruler: 'ruler', return: 'arrow-left' };
  return (
    <View style={[st.section, { paddingHorizontal: S.edge }]}>
      {s.items.map((it: any, i: number) => (
        <View key={i} style={st.service}>
          <Icon name={icons[it.icon] ?? 'info'} size={20} />
          <View style={{ flex: 1, gap: 2 }}><Text style={st.name}>{it.title}</Text>{it.text.map((p: string, j: number) => <Text key={j} style={T.small}>{p}</Text>)}</View>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  section: { paddingVertical: S.section / 2 + 8 },
  surface: { backgroundColor: C.surface, paddingVertical: S.section },
  catLabel: { fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.ink },
  sizeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  sizeText: { fontFamily: F.medium, fontSize: 18, color: C.ink, fontVariant: ['tabular-nums'] },
  lineup: { width: '100%', aspectRatio: 3 / 2, borderRadius: R.tile, overflow: 'hidden', backgroundColor: C.surface, marginTop: 6 },
  name: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  cardTitle: { fontFamily: F.semibold, fontSize: 17, color: C.ink, letterSpacing: -0.2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 8 },
  factValue: { fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.ink },
  arrowLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  step: { flexDirection: 'row', gap: 16, paddingHorizontal: S.edge, paddingVertical: 18, borderTopWidth: 1, borderColor: C.line, marginHorizontal: 0 },
  stepTitle: { fontFamily: F.semibold, fontSize: 16, color: C.ink, lineHeight: 21 },
  acc: { borderTopWidth: 1, borderColor: C.line },
  accHead: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  sizeRow: { paddingHorizontal: S.edge, paddingVertical: 14, borderTopWidth: 1, borderColor: C.line, gap: 4 },
  service: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderTopWidth: 1, borderColor: C.line },
});
