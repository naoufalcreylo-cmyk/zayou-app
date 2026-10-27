// Mes informations: prénom, nom, téléphone, and password change.
import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Field } from '@/components/Field';
import { form as st } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { changePassword, updateMe } from '@/lib/account';
import { useAccount } from '@/state/account';
import { C, T } from '@/theme';

export default function Profil() {
  const { customer, signedIn } = useAccount();
  const [f, setF] = useState({ firstName: customer?.firstName ?? '', lastName: customer?.lastName ?? '', phone: customer?.phone ?? '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState<{ profile?: string; password?: string; error?: string }>({});
  const [busy, setBusy] = useState<'profile' | 'password' | null>(null);
  const saveProfile = async () => {
    if (!f.firstName.trim() || !f.lastName.trim()) { setMsg({ error: 'Le prénom et le nom sont obligatoires.' }); return; }
    setBusy('profile'); setMsg({});
    try { const r = await updateMe(f); await signedIn(r.customer); setMsg({ profile: 'Informations enregistrées.' }); }
    catch (e) { setMsg({ error: e instanceof Error ? e.message : 'Enregistrement impossible.' }); }
    finally { setBusy(null); }
  };
  const savePassword = async () => {
    if (!pw.current || pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) { setMsg({ error: 'Nouveau mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.' }); return; }
    setBusy('password'); setMsg({});
    try { const s = await changePassword(pw.current, pw.next); await signedIn(s.customer); setPw({ current: '', next: '' }); setMsg({ password: 'Mot de passe modifié. Vos autres appareils sont déconnectés.' }); }
    catch (e) { setMsg({ error: e instanceof Error ? e.message : 'Modification impossible.' }); }
    finally { setBusy(null); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Mes informations' }} />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Field label="Prénom" value={f.firstName} onChangeText={v => setF(x => ({ ...x, firstName: v }))} autoComplete="given-name" />
        <Field label="Nom" value={f.lastName} onChangeText={v => setF(x => ({ ...x, lastName: v }))} autoComplete="family-name" />
        <Field label="Téléphone" value={f.phone} onChangeText={v => setF(x => ({ ...x, phone: v }))} keyboardType="phone-pad" autoComplete="tel" hint="Ex. 06 12 34 56 78" />
        <Text style={T.small}>E-mail : {customer?.email}</Text>
        {msg.profile ? <Text style={[T.small, { color: C.ok }]}>{msg.profile}</Text> : null}
        <Button label="Enregistrer" onPress={saveProfile} loading={busy === 'profile'} />
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
        <Text style={T.h3}>Changer de mot de passe</Text>
        <Field label="Mot de passe actuel" value={pw.current} onChangeText={v => setPw(x => ({ ...x, current: v }))} password autoComplete="current-password" />
        <Field label="Nouveau mot de passe" value={pw.next} onChangeText={v => setPw(x => ({ ...x, next: v }))} password autoComplete="new-password" hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        {msg.password ? <Text style={[T.small, { color: C.ok }]}>{msg.password}</Text> : null}
        {msg.error ? <Text style={st.err} accessibilityRole="alert">{msg.error}</Text> : null}
        <Button label="Modifier le mot de passe" variant="ghost" onPress={savePassword} loading={busy === 'password'} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
