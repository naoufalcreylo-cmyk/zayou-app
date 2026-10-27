import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Empty, Tile } from '@/components/ui';
import { FINANCIAL, getOrder, Order, orderStatus } from '@/lib/account';
import { money } from '@/lib/shopify';
import { C, F, S, T } from '@/theme';

export default function Commande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  useEffect(() => { getOrder(decodeURIComponent(id)).then(setOrder).catch(() => setOrder(null)); }, [id]);
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
        {order.lineItems.nodes.map((l, i) => (
          <View key={i} style={st.line}>
            <View style={{ width: 72 }}><Tile uri={l.image?.url} width={200} packshot /></View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={st.name}>{l.name}</Text>
              <Text style={T.small}>{l.variantTitle ? `Pointure : ${l.variantTitle} · ` : ''}Quantité : {l.quantity}</Text>
            </View>
            <Text style={T.price}>{money(l.totalPrice)}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        {order.subtotal ? <Row label="Sous-total" value={money(order.subtotal)} /> : null}
        <Row label="Livraison" value={money(order.totalShipping)} />
        <Row label="Total" value={money(order.totalPrice)} strong />
      </View>
      {order.shippingAddress ? (
        <View style={{ gap: 4 }}>
          <Text style={T.label}>Adresse de livraison</Text>
          {order.shippingAddress.formatted.map((x, i) => <Text key={i} style={T.body}>{x}</Text>)}
        </View>
      ) : null}
      <Button label="Suivre ma commande" variant="ghost" icon="arrow-right" onPress={() => WebBrowser.openBrowserAsync(order.statusPageUrl)} />
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
