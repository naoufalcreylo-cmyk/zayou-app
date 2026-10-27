// Collection / listing: every product of the collection, filtered on the device by size (in stock), availability and price order.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { QuickAdd } from '@/components/QuickAdd';
import { Chip, Empty, ProductCard, Tile } from '@/components/ui';
import content from '@/content/sections.json';
import { getListing, getProductImages, ProductCard as P, sizeOf, sizeOptionName } from '@/lib/shopify';
import { useSize } from '@/state/size';
import { C, F, R, S, T } from '@/theme';

type Sort = 'default' | 'asc' | 'desc';
const price = (p: P) => parseFloat(p.priceRange.minVariantPrice.amount);

export default function Collection() {
  const { handle, taille } = useLocalSearchParams<{ handle: string; taille?: string }>();
  const { width } = useWindowDimensions();
  const { setSize } = useSize();
  const [data, setData] = useState<{ title: string; products: P[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [size, setSel] = useState<string | null>(taille ?? null);
  const [inStock, setInStock] = useState(!!taille);
  const [sort, setSort] = useState<Sort>('default');
  const [quick, setQuick] = useState<P | null>(null);
  const [introImg, setIntroImg] = useState<string | null>(null);
  const intro = (content.collections as Record<string, { title: string; text: string[]; image: { product: string; position: number } | null }>)[handle];
  const cardW = (width - S.edge * 2 - S.gap) / 2;

  useEffect(() => {
    getListing(handle).then(d => (d ? setData(d) : setFailed(true))).catch(() => setFailed(true));
    const ref = intro?.image;
    if (ref) getProductImages([ref.product]).then(m => setIntroImg((m[ref.product]?.[ref.position - 1])?.url ?? null)).catch(() => {});
  }, [handle, intro?.image]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    data?.products.forEach(p => { const o = sizeOptionName(p); p.variants.forEach(v => { const x = sizeOf(v, o); if (x) set.add(x); }); });
    return [...set].sort();
  }, [data]);

  const list = useMemo(() => {
    let l = data?.products ?? [];
    if (size) l = l.filter(p => { const o = sizeOptionName(p); return p.variants.some(v => sizeOf(v, o) === size && v.availableForSale); });
    else if (inStock) l = l.filter(p => p.availableForSale);
    if (sort !== 'default') l = [...l].sort((a, b) => (sort === 'asc' ? price(a) - price(b) : price(b) - price(a)));
    return l;
  }, [data, size, inStock, sort]);

  const title = intro?.title ?? data?.title?.toLowerCase() ?? '';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: data?.title ?? '' }} />
      {!data && !failed ? <ActivityIndicator style={{ marginTop: 40 }} color={C.ink} /> : null}
      {failed ? <View style={{ padding: S.edge }}><Empty title="Collection introuvable" text="Elle a peut-être été déplacée." /></View> : null}
      {data ? (
        <FlatList data={list} keyExtractor={p => p.id} numColumns={2} columnWrapperStyle={{ gap: S.gap, paddingHorizontal: S.edge }} contentContainerStyle={{ gap: 26, paddingBottom: 40 }}
          initialNumToRender={8} windowSize={7}
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              <View style={{ paddingHorizontal: S.edge, gap: 10, flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={T.display} accessibilityRole="header">{title} <Text style={T.small}>{data.products.length}</Text></Text>
                  {intro?.text.map((p, i) => <Text key={i} style={T.bodyMuted}>{p}</Text>)}
                </View>
                {introImg ? <View style={{ width: 96 }}><Tile uri={introImg} width={300} /></View> : null}
              </View>
              {sizes.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.edge, gap: 8 }}>
                  {sizes.map(x => <Chip key={x} label={x} active={size === x} onPress={() => { const next = size === x ? null : x; setSel(next); if (next) setSize(next); }} accessibilityLabel={`Disponible en pointure ${x}`} />)}
                </ScrollView>
              ) : null}
              <View style={st.toolbar}>
                <Pressable onPress={() => setInStock(v => !v)} style={[st.toggle, (inStock || size) && st.toggleOn]} accessibilityRole="switch" accessibilityState={{ checked: inStock || !!size }} disabled={!!size}>
                  <Text style={[st.toggleText, (inStock || size) && { color: C.bg }]}>En stock</Text>
                </Pressable>
                <Pressable onPress={() => setSort(s => (s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default'))} style={st.toggle} accessibilityRole="button" accessibilityLabel="Changer le tri">
                  <Text style={st.toggleText}>{sort === 'default' ? 'Tri : en vedette' : sort === 'asc' ? 'Prix croissant' : 'Prix décroissant'}</Text>
                </Pressable>
                <Text style={[T.small, { marginLeft: 'auto' }]}>{list.length} produit{list.length > 1 ? 's' : ''}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={<View style={{ paddingHorizontal: S.edge }}><Empty title="Aucun produit ne correspond" text={size ? `Aucun modèle de cette catégorie n'est disponible en ${size} pour le moment.` : 'Retirez un filtre pour élargir la sélection.'} /></View>}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} onQuickAdd={setQuick} />}
        />
      ) : null}
      <QuickAdd product={quick} onClose={() => setQuick(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S.edge, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, marginBottom: 6 },
  toggle: { minHeight: 40, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center' },
  toggleOn: { backgroundColor: C.ink, borderColor: C.ink },
  toggleText: { fontFamily: F.medium, fontSize: 13, color: C.ink },
});
