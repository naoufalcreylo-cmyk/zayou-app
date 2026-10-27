// Add / edit an address (Morocco by default).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { AddressInput, getAddresses, saveAddress } from '@/lib/account';
import { C, F, R, S, T } from '@/theme';

const FIELDS: { key: keyof AddressInput; label: string; required?: boolean; keyboard?: 'phone-pad' | 'default'; auto?: string }[] = [
  { key: 'firstName', label: 'Prénom', required: true, auto: 'given-name' },
  { key: 'lastName', label: 'Nom', required: true, auto: 'family-name' },
  { key: 'address1', label: 'Adresse', required: true, auto: 'address-line1' },
  { key: 'address2', label: 'Complément (appartement, étage…)', auto: 'address-line2' },
  { key: 'city', label: 'Ville', required: true, auto: 'address-level2' },
  { key: 'zip', label: 'Code postal', auto: 'postal-code' },
  { key: 'phoneNumber', label: 'Téléphone', required: true, keyboard: 'phone-pad', auto: 'tel' },
];

export default function AdresseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<AddressInput>({ countryCode: 'MA' });
  const [isDefault, setDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    getAddresses().then(({ addresses, defaultId }) => {
      const a = addresses.find(x => x.id === id); if (!a) return;
      setForm({ firstName: a.firstName ?? '', lastName: a.lastName ?? '', address1: a.address1 ?? '', address2: a.address2 ?? '', city: a.city ?? '', zip: a.zip ?? '', phoneNumber: a.phoneNumber ?? '', countryCode: a.countryCode ?? 'MA' });
      setDefault(defaultId === id);
    }).catch(() => setError('Impossible de charger cette adresse.'));
  }, [id]);
  const submit = async () => {
    const missing = FIELDS.filter(f => f.required && !String(form[f.key] ?? '').trim()).map(f => f.label);
    if (missing.length) { setError(`À compléter : ${missing.join(', ')}.`); return; }
    setBusy(true); setError(null);
    // Shopify stores phone numbers in E.164: accept 06… / 07… and convert to +212…
    const phone = String(form.phoneNumber).replace(/[\s.-]/g, '').replace(/^0(?=[5-7])/, '+212');
    try { await saveAddress({ ...form, phoneNumber: phone }, id, isDefault); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Modifier l’adresse' : 'Nouvelle adresse' }} />
      <ScrollView contentContainerStyle={{ padding: S.edge, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {FIELDS.map(f => (
          <View key={f.key} style={{ gap: 6 }}>
            <Text style={st.label}>{f.label}{f.required ? ' *' : ''}</Text>
            <TextInput value={String(form[f.key] ?? '')} onChangeText={v => setForm(x => ({ ...x, [f.key]: v }))} style={st.input}
              keyboardType={f.keyboard ?? 'default'} autoComplete={f.auto as never} accessibilityLabel={f.label} />
          </View>
        ))}
        <Text style={T.small}>Pays : Maroc</Text>
        <Pressable onPress={() => setDefault(v => !v)} style={st.check} accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }}>
          <View style={[st.box, isDefault && { backgroundColor: C.ink, borderColor: C.ink }]} />
          <Text style={T.body}>Utiliser comme adresse par défaut</Text>
        </Pressable>
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label="Enregistrer" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.sm, paddingHorizontal: 14, fontFamily: F.regular, fontSize: 16, color: C.ink },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: C.lineStrong },
  err: { color: C.error, fontSize: 14 },
});
