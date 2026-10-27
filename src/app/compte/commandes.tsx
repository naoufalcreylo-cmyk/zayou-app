import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Empty, Tile } from '@/components/ui';
import { getOrders, numericId, Order, orderStatus } from '@/lib/account';
import { money } from '@/lib/shopify';
import { C, F, S, T } from '@/theme';

export default function Commandes() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { getOrders().then(setOrders).catch(() => setError(true)); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: 'Mes commandes' }} />
      {!orders && !error ? <ActivityIndicator style={{ marginTop: 32 }} color={C.ink} /> : null}
      {error ? <View style={{ padding: S.edge }}><Empty title="Impossible de charger vos commandes" text="Vérifiez votre connexion puis réessayez." /></View> : null}
      {orders ? (
        <FlatList data={orders} keyExtractor={o => o.id} contentContainerStyle={{ padding: S.edge }}
          ListEmptyComponent={<Empty title="Aucune commande pour le moment" text="Les commandes passées avec votre adresse e-mail apparaîtront ici." />}
          renderItem={({ item: o }) => (
            <Link href={`/compte/commande/${numericId(o.id)}`} asChild>
              <Pressable style={st.row} accessibilityRole="link" accessibilityLabel={`Commande ${o.name}, ${orderStatus(o)}, ${money(o.total)}`}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {o.lines.slice(0, 3).map((l, i) => <View key={i} style={{ width: 52 }}><Tile uri={l.image} width={150} packshot /></View>)}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={st.name}>{o.name}</Text>
                  <Text style={T.small}>{new Date(o.processedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  <Text style={[T.small, { color: C.ink }]}>{orderStatus(o)}</Text>
                </View>
                <Text style={T.price}>{money(o.total)}</Text>
              </Pressable>
            </Link>
          )} />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line },
  name: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
});
