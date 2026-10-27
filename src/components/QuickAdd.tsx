// Quick add from a product card: bottom sheet, the customer must pick a size.
import { Link } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard, sizeOf, sizeOptionName, Variant } from '@/lib/shopify';
import { useCart } from '@/state/cart';
import { useSize } from '@/state/size';
import { C, F, R, S, T } from '@/theme';

import { Icon } from './Icon';
import { SizePicker } from './SizePicker';
import { Button, Price, Tile } from './ui';

export function QuickAdd({ product, onClose }: { product: ProductCard | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { add, busy, error } = useCart();
  const { setSize } = useSize();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [missing, setMissing] = useState(false);
  const close = () => { setVariant(null); setMissing(false); onClose(); };
  if (!product) return null;
  const opt = sizeOptionName(product);
  const submit = async () => {
    if (!variant) { setMissing(true); return; }
    const ok = await add(variant.id);
    if (ok) { const s = sizeOf(variant, opt); if (s) setSize(s); close(); }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={st.overlay} onPress={close} accessibilityLabel="Fermer" />
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
        <View style={st.head}>
          <Text style={T.h3} accessibilityRole="header">Choisir une pointure</Text>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer"><Icon name="close" /></Pressable>
        </View>
        <View style={st.product}>
          <View style={{ width: 84 }}><Tile uri={product.featuredImage?.url} width={200} packshot /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={st.title} numberOfLines={2}>{product.title}</Text>
            <Price price={variant?.price ?? product.priceRange.minVariantPrice} compare={variant?.compareAtPrice ?? product.compareAtPriceRange.maxVariantPrice} />
          </View>
        </View>
        <SizePicker product={product} selected={variant?.id ?? null} onSelect={v => { setVariant(v); setMissing(false); }} error={missing} />
        {error ? <Text style={st.err}>{error}</Text> : null}
        <Button label={variant ? 'Ajouter au panier' : 'Choisir une pointure'} onPress={submit} loading={busy} />
        <Link href={`/produit/${product.handle}`} asChild>
          <Pressable onPress={close} accessibilityRole="link" style={{ alignSelf: 'center', padding: 8 }}><Text style={st.link}>Voir la fiche produit</Text></Pressable>
        </Link>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.32)' },
  sheet: { backgroundColor: C.bg, paddingHorizontal: S.edge, paddingTop: 8, gap: 18, borderTopLeftRadius: R.tile, borderTopRightRadius: R.tile },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  product: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  title: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  err: { color: C.error, fontSize: 14 },
  link: { fontFamily: F.medium, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
});
