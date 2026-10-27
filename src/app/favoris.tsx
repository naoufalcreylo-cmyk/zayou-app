import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, useWindowDimensions, View } from 'react-native';

import { QuickAdd } from '@/components/QuickAdd';
import { Empty, ProductCard } from '@/components/ui';
import { getProductsByHandle, ProductCard as P } from '@/lib/shopify';
import { useWishlist } from '@/state/wishlist';
import { C, S } from '@/theme';

export default function Favoris() {
  const { handles } = useWishlist();
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<P[] | null>(null);
  const [quick, setQuick] = useState<P | null>(null);
  const key = handles.join(',');
  useEffect(() => { (key ? getProductsByHandle(key.split(',')) : Promise.resolve([])).then(setProducts).catch(() => setProducts([])); }, [key]);
  const cardW = (width - S.edge * 2 - S.gap) / 2;
  // keep the list in sync instantly when a heart is toggled
  const visible = (products ?? []).filter(p => handles.includes(p.handle));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: 'Mes favoris' }} />
      {products === null ? <ActivityIndicator style={{ marginTop: 32 }} color={C.ink} /> : (
        <FlatList data={visible} keyExtractor={p => p.id} numColumns={2} columnWrapperStyle={{ gap: S.gap, paddingHorizontal: S.edge }} contentContainerStyle={{ gap: 26, paddingVertical: S.edge }}
          ListEmptyComponent={<View style={{ paddingHorizontal: S.edge }}><Empty title="Aucun favori pour le moment" text="Touchez le cœur sur un produit pour le retrouver ici." /></View>}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} onQuickAdd={setQuick} />} />
      )}
      <QuickAdd product={quick} onClose={() => setQuick(null)} />
    </View>
  );
}
