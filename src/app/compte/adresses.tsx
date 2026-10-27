import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Empty } from '@/components/ui';
import { Address, deleteAddress, getAddresses } from '@/lib/account';
import { C, F, R, S, T } from '@/theme';

export default function Adresses() {
  const [data, setData] = useState<{ addresses: Address[]; defaultId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { getAddresses().then(d => { setData(d); setError(null); }).catch(() => setError('Impossible de charger vos adresses.')); }, []);
  useFocusEffect(load);
  const remove = (a: Address) => Alert.alert('Supprimer cette adresse ?', a.formatted.join(', '), [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: () => deleteAddress(a.id).then(load).catch(e => setError(e.message)) },
  ]);
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ padding: S.edge, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Mes adresses' }} />
      {!data && !error ? <ActivityIndicator color={C.ink} /> : null}
      {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
      {data && !data.addresses.length ? <Empty title="Aucune adresse enregistrée" text="Ajoutez une adresse pour la retrouver lors de vos prochaines commandes." /> : null}
      {data?.addresses.map(a => (
        <View key={a.id} style={st.card}>
          {a.id === data.defaultId ? <Text style={T.label}>Par défaut</Text> : null}
          {a.formatted.map((x, i) => <Text key={i} style={T.body}>{x}</Text>)}
          {a.phoneNumber ? <Text style={T.small}>{a.phoneNumber}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 18, marginTop: 6 }}>
            <Pressable onPress={() => router.push({ pathname: '/compte/adresse', params: { id: a.id } })} hitSlop={8} accessibilityRole="button"><Text style={st.link}>Modifier</Text></Pressable>
            <Pressable onPress={() => remove(a)} hitSlop={8} accessibilityRole="button"><Text style={[st.link, { color: C.error }]}>Supprimer</Text></Pressable>
          </View>
        </View>
      ))}
      <Button label="Ajouter une adresse" icon="plus" onPress={() => router.push('/compte/adresse')} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  card: { padding: 16, borderRadius: R.tile, borderWidth: 1, borderColor: C.line, gap: 3 },
  link: { fontFamily: F.medium, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
  err: { color: C.error, fontSize: 14 },
});
