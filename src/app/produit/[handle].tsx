// Product page. The gallery shows Shopify's original photos at their own ratio (never cropped or retouched).
import { Image } from 'expo-image';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Rail } from '@/components/Sections';
import { SizePicker } from '@/components/SizePicker';
import { Button, Empty, Price, Tile } from '@/components/ui';
import content from '@/content/sections.json';
import { colorway } from '@/lib/colorways';
import { getProduct, getProductsByHandle, getRecommendations, Product, ProductCard as P, sized, sizeOf, sizeOptionName, Variant } from '@/lib/shopify';
import { useCart } from '@/state/cart';
import { useSize } from '@/state/size';
import { C, F, R, S, T } from '@/theme';

const wa = content.settings.whatsapp.replace(/[^\d]/g, '');

export default function ProductScreen() {
  const { handle, taille } = useLocalSearchParams<{ handle: string; taille?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { add, busy, error } = useCart();
  const { setSize } = useSize();
  const [p, setP] = useState<Product | null>(null);
  const [failed, setFailed] = useState(false);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [missing, setMissing] = useState(false);
  const [siblings, setSiblings] = useState<P[]>([]);
  const [recos, setRecos] = useState<P[]>([]);
  const [slide, setSlide] = useState(0);
  const [open, setOpen] = useState<string | null>('desc');
  const scroll = useRef<ScrollViewInstance>(null);
  const sizesY = useRef(0);

  useEffect(() => {
    getProduct(handle).then(prod => {
      if (!prod) { setFailed(true); return; }
      setP(prod);
      const opt = sizeOptionName(prod);
      // single-variant products (e.g. perfumes) need no choice; a size carried from another colourway is honoured if in stock
      if (prod.variants.length === 1) setVariant(prod.variants[0]);
      else if (taille) { const v = prod.variants.find(x => sizeOf(x, opt) === taille && x.availableForSale); if (v) setVariant(v); }
      getRecommendations(prod.id).then(r => setRecos(r.slice(0, 8))).catch(() => {});
    }).catch(() => setFailed(true));
    const sib = colorway(handle)?.siblings ?? [];
    if (sib.length > 1) getProductsByHandle(sib).then(setSiblings).catch(() => {});
  }, [handle, taille]);

  if (failed) return <View style={{ padding: S.edge }}><Empty title="Produit introuvable" text="Il a peut-être été retiré de la boutique." /></View>;
  if (!p) return <ActivityIndicator style={{ marginTop: 40 }} color={C.ink} />;

  const opt = sizeOptionName(p);
  const hasSizes = p.variants.length > 1;
  const way = colorway(p.handle);
  const media = p.media.length ? p.media : p.featuredImage ? [p.featuredImage] : [];
  const price = variant?.price ?? p.priceRange.minVariantPrice;
  const compare = variant ? variant.compareAtPrice : p.compareAtPriceRange.maxVariantPrice;
  const mat = `${way?.material ?? ''} ${p.title}`.toLowerCase();
  const care = /daim|nubuck/.test(mat) ? 'Daim et nubuck : jamais d’eau ni de crème. Brossez à sec avec une brosse spéciale daim et protégez avec un imperméabilisant avant la première sortie.'
    : /cuir/.test(mat) ? 'Cuir lisse : dépoussiérez avec un chiffon doux, puis nourrissez avec une crème incolore ou de la même teinte, en couche fine.'
    : 'Brosse souple et eau tiède légèrement savonneuse, puis séchage à l’air libre, loin de toute source de chaleur.';
  const paragraphs = p.description.split(/\n+/).map(x => x.trim()).filter(Boolean);

  const submit = async () => {
    if (!variant) { setMissing(true); scroll.current?.scrollTo({ y: Math.max(0, sizesY.current - 80), animated: true }); return; }
    if (await add(variant.id)) { const s = sizeOf(variant, opt); if (s) setSize(s); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* gallery: original photos, natural ratio */}
        <FlatList data={media} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(m, i) => m.url + i}
          onMomentumScrollEnd={e => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, aspectRatio: item.width && item.height ? item.width / item.height : 1, backgroundColor: '#FFFFFF' }}>
              <Image source={{ uri: sized(item.url, Math.min(1600, Math.round(width * 3))) }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={item.altText ?? p.title} />
            </View>
          )} />
        {media.length > 1 ? <View style={st.dots} accessibilityLabel={`Image ${slide + 1} sur ${media.length}`}>{media.map((_, i) => <View key={i} style={[st.dot, i === slide && st.dotOn]} />)}</View> : null}

        <View style={{ paddingHorizontal: S.edge, gap: 20, paddingTop: 16 }}>
          <View style={{ gap: 6 }}>
            {!/bon ?plan/i.test(p.vendor) && p.vendor ? <Text style={T.label}>{p.vendor}</Text> : null}
            <Text style={st.title} accessibilityRole="header">{p.title}</Text>
            <Price price={price} compare={compare} size={17} showSaving />
          </View>

          {siblings.length > 1 ? (
            <View style={{ gap: 10 }}>
              <Text style={T.body}>Couleur{way?.label ? ' : ' : ''}<Text style={{ fontFamily: F.semibold }}>{way?.label ?? ''}</Text>{way?.material ? <Text style={T.small}> · {way.material}</Text> : null}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {siblings.map(s => {
                  const cur = s.handle === p.handle;
                  const carry = variant ? sizeOf(variant, opt) : null;
                  return (
                    <Pressable key={s.handle} disabled={cur} onPress={() => router.replace(`/produit/${s.handle}${carry ? `?taille=${carry}` : ''}`)} accessibilityRole="button"
                      accessibilityLabel={`${colorway(s.handle)?.label ?? s.title}${s.availableForSale ? '' : ', épuisé'}`} accessibilityState={{ selected: cur }}
                      style={[st.way, cur && { borderColor: C.ink }, !s.availableForSale && { opacity: 0.5 }]}>
                      <Tile uri={s.featuredImage?.url} width={200} packshot style={{ borderRadius: R.sm }} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {hasSizes ? (
            <View style={{ gap: 10 }} onLayout={e => { sizesY.current = e.nativeEvent.layout.y + 300; }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={T.body}>Pointure{variant ? ' : ' : ''}<Text style={{ fontFamily: F.semibold }}>{variant ? sizeOf(variant, opt) : ''}</Text></Text>
                <Link href="/page/guide-des-pointures" asChild><Pressable hitSlop={8} style={st.inline} accessibilityRole="link"><Icon name="ruler" size={15} /><Text style={st.underline}>Guide des pointures</Text></Pressable></Link>
              </View>
              <SizePicker product={p} selected={variant?.id ?? null} onSelect={v => { setVariant(v); setMissing(false); }} error={missing} />
            </View>
          ) : null}

          <View style={st.services}>
            <View style={st.serviceRow}><Icon name="truck" size={16} /><Text style={[T.small, { flex: 1, color: C.ink }]}>{content.settings.delivery.join(' ')}</Text></View>
            <Pressable style={st.serviceRow} onPress={() => Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(p.title)}`)} accessibilityRole="link">
              <Icon name="whatsapp" size={16} /><Text style={[st.underline, { flex: 1 }]}>Une question sur ce modèle ? WhatsApp</Text>
            </Pressable>
          </View>

          <View>
            {paragraphs.length ? <Acc id="desc" title="Description" open={open} setOpen={setOpen}>{paragraphs.map((x, i) => <Text key={i} style={T.bodyMuted}>{x}</Text>)}</Acc> : null}
            {hasSizes ? <Acc id="care" title="Entretien" open={open} setOpen={setOpen}><Text style={T.bodyMuted}>{care}</Text><Link href="/page/entretien" asChild><Pressable accessibilityRole="link"><Text style={st.underline}>Tous nos conseils d’entretien</Text></Pressable></Link></Acc> : null}
            {hasSizes ? <Link href="/page/inspirations" asChild><Pressable style={st.accHead} accessibilityRole="link"><Text style={st.accTitle}>Comment porter ce modèle</Text><Icon name="arrow-right" size={16} /></Pressable></Link> : null}
          </View>
        </View>

        <Rail title="vous aimerez aussi" products={recos} />
      </ScrollView>

      {/* purchase bar */}
      <View style={[st.bar, { paddingBottom: insets.bottom + 10 }]}>
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label={!p.availableForSale ? 'Épuisé' : variant ? (variant.availableForSale ? 'Ajouter au panier' : 'Épuisé') : 'Choisir une pointure'}
          onPress={submit} loading={busy} disabled={!p.availableForSale || (variant ? !variant.availableForSale : false)} />
      </View>
    </View>
  );
}

function Acc({ id, title, open, setOpen, children }: { id: string; title: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const on = open === id;
  return (
    <View style={{ borderTopWidth: 1, borderColor: C.line }}>
      <Pressable onPress={() => setOpen(on ? null : id)} style={st.accHead} accessibilityRole="button" accessibilityState={{ expanded: on }}>
        <Text style={st.accTitle}>{title}</Text><Icon name={on ? 'minus' : 'plus'} size={16} />
      </Pressable>
      {on ? <View style={{ gap: 10, paddingBottom: 18 }}>{children}</View> : null}
    </View>
  );
}

const st = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.lineStrong },
  dotOn: { backgroundColor: C.ink },
  title: { fontFamily: F.medium, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, color: C.ink },
  way: { width: 64, borderWidth: 1, borderColor: 'transparent', borderRadius: R.sm, padding: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  underline: { fontFamily: F.medium, fontSize: 13, color: C.ink, textDecorationLine: 'underline' },
  services: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderColor: C.line },
  serviceRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  accHead: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.line },
  accTitle: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: S.edge, paddingTop: 10, backgroundColor: C.bg, borderTopWidth: 1, borderColor: C.line, gap: 6 },
  err: { color: C.error, fontSize: 13 },
});
