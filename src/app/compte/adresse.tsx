// Add / edit an address (Morocco).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { form } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { AddressInput, getAddresses, numericId, saveAddress } from '@/lib/account';
import { useAccount } from '@/state/account';
import { C, T } from '@/theme';

type K = 'firstName' | 'lastName' | 'address1' | 'address2' | 'city' | 'zip' | 'phone';
const FIELDS: { key: K; label: string; required?: boolean; phone?: boolean; auto?: string }[] = [
  { key: 'firstName', label: 'Prénom', required: true, auto: 'given-name' },
  { key: 'lastName', label: 'Nom', required: true, auto: 'family-name' },
  { key: 'address1', label: 'Adresse', required: true, auto: 'address-line1' },
  { key: 'address2', label: 'Complément (appartement, étage…)', auto: 'address-line2' },
  { key: 'city', label: 'Ville', required: true, auto: 'address-level2' },
  { key: 'zip', label: 'Code postal', auto: 'postal-code' },
  { key: 'phone', label: 'Téléphone', phone: true, auto: 'tel' },
];

export default function AdresseForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { customer } = useAccount();
  const [f, setF] = useState<Record<K, string>>({ firstName: customer?.firstName ?? '', lastName: customer?.lastName ?? '', address1: '', address2: '', city: '', zip: '', phone: customer?.phone ?? '' });
  const [isDefault, setDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    getAddresses().then(({ addresses, defaultId }) => {
      const a = addresses.find(x => numericId(x.id) === id); if (!a) return;
      setF({ firstName: a.firstName ?? '', lastName: a.lastName ?? '', address1: a.address1 ?? '', address2: a.address2 ?? '', city: a.city ?? '', zip: a.zip ?? '', phone: a.phone ?? '' });
      setDefault(numericId(defaultId ?? '') === id);
    }).catch(() => setError('Impossible de charger cette adresse.'));
  }, [id]);
  const submit = async () => {
    const missing = FIELDS.filter(x => x.required && !f[x.key].trim()).map(x => x.label);
    if (missing.length) { setError(`À compléter : ${missing.join(', ')}.`); return; }
    setBusy(true); setError(null);
    try { const input: AddressInput = { ...f, isDefault }; await saveAddress(input, id); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Modifier l’adresse' : 'Nouvelle adresse' }} />
      <ScrollView contentContainerStyle={form.wrap} keyboardShouldPersistTaps="handled">
        {FIELDS.map(x => (
          <Field key={x.key} label={`${x.label}${x.required ? ' *' : ''}`} value={f[x.key]} onChangeText={v => setF(s => ({ ...s, [x.key]: v }))}
            keyboardType={x.phone ? 'phone-pad' : 'default'} autoComplete={x.auto as never} />
        ))}
        <Text style={T.small}>Pays : Maroc</Text>
        <Pressable onPress={() => setDefault(v => !v)} style={st.check} accessibilityRole="checkbox" accessibilityState={{ checked: isDefault }}>
          <View style={[st.box, isDefault && { backgroundColor: C.ink, borderColor: C.ink }]} />
          <Text style={T.body}>Utiliser comme adresse par défaut</Text>
        </Pressable>
        {error ? <Text style={form.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label="Enregistrer" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: C.lineStrong },
});
