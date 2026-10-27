import { Link, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Empty, Tile } from '@/components/ui';
import { FINANCIAL, getOrder, Order, orderStatus } from '@/lib/account';
import { money } from '@/lib/shopify';
import { C, F, S, T } from '@/theme';

export default function Commande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  useEffect(() => { getOrder(id).then(setOrder).catch(() => setOrder(null)); }, [id]);
  if (order === undefined) return <ActivityIndicator style={{ marginTop: 32 }} color={C.ink} />;
  if (!order) return <View style={{ padding: S.edge }}><Empty title="Commande introuvable" /></View>;
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.edge, gap: 20, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: `Commande ${order.name}` }} />
      <View style={{ gap: 4 }}>
        <Text style={T.h2}>{orderStatus(order)}</Text>
        <Text style={T.small}>Passée le {new Date(order.processedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}{order.financialStatus ? ` · ${FINANCIAL[order.financialStatus] ?? order.financialStatus}` : ''}</Text>
      </View>
      <View>
        {order.lines.map((l, i) => {
          const row = (
            <View style={st.line}>
              <View style={{ width: 72 }}><Tile uri={l.image} width={200} packshot /></View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.name}>{l.name}</Text>
                <Text style={T.small}>{l.size ? `Pointure : ${l.size} · ` : ''}Quantité : {l.quantity}</Text>
              </View>
              <Text style={T.price}>{money(l.total)}</Text>
            </View>
          );
          return l.handle ? <Link key={i} href={`/produit/${l.handle}`} asChild><Pressable accessibilityRole="link">{row}</Pressable></Link> : <View key={i}>{row}</View>;
        })}
      </View>
      <View style={{ gap: 6 }}>
        {order.subtotal ? <Row label="Sous-total" value={money(order.subtotal)} /> : null}
        {order.shipping ? <Row label="Livraison" value={money(order.shipping)} /> : null}
        <Row label="Total" value={money(order.total)} strong />
      </View>
      {order.shippingAddress ? (
        <View style={{ gap: 4 }}>
          <Text style={T.label}>Adresse de livraison</Text>
          {order.shippingAddress.map((x, i) => <Text key={i} style={T.body}>{x}</Text>)}
        </View>
      ) : null}
      {order.statusPageUrl ? <Button label="Suivre ma commande" variant="ghost" icon="arrow-right" onPress={() => WebBrowser.openBrowserAsync(order.statusPageUrl)} /> : null}
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={strong ? st.strong : T.body}>{label}</Text><Text style={strong ? st.strong : T.body}>{value}</Text></View>;
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line },
  name: { fontFamily: F.medium, fontSize: 15, color: C.ink },
  strong: { fontFamily: F.semibold, fontSize: 17, color: C.ink },
});
