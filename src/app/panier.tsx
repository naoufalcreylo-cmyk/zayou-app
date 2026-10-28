import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Button, Tile } from '@/components/ui';
import content from '@/content/sections.json';
import { colorway } from '@/lib/colorways';
import { money, SIZE_RX } from '@/lib/shopify';
import { useCart } from '@/state/cart';
import { C, F, R, S, T } from '@/theme';

export default function Panier() {
  const { cart, busy, error, setQuantity, remove, checkout, refresh, clearError } = useCart();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const lines = cart?.lines ?? [];
  const count = cart?.totalQuantity ?? 0;
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.edge, paddingTop: 4, paddingBottom: 24, gap: 16, flexGrow: 1 }}>
        {!lines.length ? (
          <View style={{ gap: 14, paddingTop: 8 }}>
            <Text style={T.body}>Votre panier est vide.</Text>
            <Text style={T.small}>Commencez par une catégorie :</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {content.menu.map(([h, label]) => <Link key={h} href={`/collection/${h}`} asChild><Pressable style={st.pill} accessibilityRole="link"><Text style={st.pillText}>{label}</Text></Pressable></Link>)}
            </View>
          </View>
        ) : lines.map(l => {
          const size = l.merchandise.selectedOptions.find(o => SIZE_RX.test(o.name))?.value;
          const way = colorway(l.merchandise.product.handle)?.label;
          return (
            <View key={l.id} style={st.line}>
              <Link href={`/produit/${l.merchandise.product.handle}`} asChild>
                <Pressable style={{ width: 88 }} accessibilityRole="link" accessibilityLabel={l.merchandise.product.title}><Tile uri={(l.merchandise.image ?? l.merchandise.product.featuredImage)?.url} width={240} packshot /></Pressable>
              </Link>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={st.title} numberOfLines={2}>{l.merchandise.product.title}</Text>
                <Text style={T.small}>{[size ? `Pointure : ${size}` : null, way].filter(Boolean).join(' · ')}</Text>
                <View style={st.row}>
                  <View style={st.qty}>
                    <Pressable onPress={() => setQuantity(l.id, l.quantity - 1)} disabled={busy || l.quantity <= 1} style={[st.qbtn, l.quantity <= 1 && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Diminuer la quantité"><Icon name="minus" size={16} /></Pressable>
                    <Text style={st.qnum} accessibilityLabel={`Quantité ${l.quantity}`}>{l.quantity}</Text>
                    <Pressable onPress={() => setQuantity(l.id, l.quantity + 1)} disabled={busy} style={st.qbtn} accessibilityRole="button" accessibilityLabel="Augmenter la quantité"><Icon name="plus" size={16} /></Pressable>
                  </View>
                  <Text style={T.price}>{money(l.cost.totalAmount)}</Text>
                </View>
                <Pressable onPress={() => remove(l.id)} disabled={busy} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Retirer ${l.merchandise.product.title}`}><Text style={st.remove}>Retirer</Text></Pressable>
              </View>
            </View>
          );
        })}
        {error ? <Pressable onPress={clearError}><Text style={st.error} accessibilityRole="alert">{error}</Text></Pressable> : null}
      </ScrollView>
      {lines.length ? (
        <View style={st.foot}>
          <View style={st.total}>
            <Text style={st.totalText}>Sous-total <Text style={st.count}>· {count} article{count > 1 ? 's' : ''}</Text></Text>
            <Text style={st.totalText}>{money(cart?.cost.subtotalAmount)}</Text>
          </View>
          <Text style={T.small}>Frais de livraison calculés à l’étape suivante.</Text>
          <Button label="Commander" onPress={checkout} loading={busy} />
          <Text style={[T.small, { textAlign: 'center' }]}>Paiement à la livraison disponible</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line },
  title: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.pill, height: 44 },
  qbtn: { width: 44, height: 42, alignItems: 'center', justifyContent: 'center' },
  qnum: { minWidth: 24, textAlign: 'center', fontFamily: F.medium, fontSize: 15, color: C.ink },
  remove: { fontFamily: F.regular, fontSize: 13, color: C.muted, textDecorationLine: 'underline', marginTop: 4 },
  error: { color: C.error, fontSize: 14 },
  foot: { padding: S.edge, gap: 10, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  total: { flexDirection: 'row', justifyContent: 'space-between' },
  totalText: { fontFamily: F.semibold, fontSize: 17, color: C.ink },
  count: { fontFamily: F.regular, fontSize: 15, color: C.muted },
  pill: { minHeight: 44, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center' },
  pillText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});
