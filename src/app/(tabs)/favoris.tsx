import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { QuickAdd } from '@/components/QuickAdd';
import { Empty, ProductCard } from '@/components/ui';
import { getProductsByHandle, ProductCard as P } from '@/lib/shopify';
import { useWishlist } from '@/state/wishlist';
import { C, S, T } from '@/theme';

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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />
      {products === null ? <ActivityIndicator style={{ marginTop: 32 }} color={C.ink} /> : (
        <FlatList data={visible} keyExtractor={p => p.id} numColumns={2} columnWrapperStyle={{ gap: S.gap, paddingHorizontal: S.edge }} contentContainerStyle={{ gap: 26, paddingBottom: S.edge }}
          ListHeaderComponent={<Text style={[T.display, { paddingHorizontal: S.edge, paddingTop: 8 }]} accessibilityRole="header">liste d’envies</Text>}
          ListEmptyComponent={<View style={{ paddingHorizontal: S.edge }}><Empty title="Votre liste d’envies est vide" text="Touchez le cœur sur un produit pour le retrouver ici." /></View>}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} onQuickAdd={setQuick} />} />
      )}
      <QuickAdd product={quick} onClose={() => setQuick(null)} />
    </SafeAreaView>
  );
}
