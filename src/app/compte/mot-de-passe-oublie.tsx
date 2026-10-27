// Mot de passe oublié: sends a code to the e-mail (same answer whether the account exists or not).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { Field } from '@/components/Field';
import { form as st } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { forgotPassword } from '@/lib/account';
import { C, T } from '@/theme';


export default function MotDePasseOublie() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim()) { setError('Indiquez votre adresse e-mail.'); return; }
    setBusy(true); setError(null);
    try { await forgotPassword(email.trim()); router.replace({ pathname: '/compte/code', params: { email: email.trim().toLowerCase(), purpose: 'reset' } }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Mot de passe oublié' }} />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Text style={T.h1}>mot de passe oublié</Text>
        <Text style={T.bodyMuted}>Indiquez l’e-mail de votre compte : vous recevrez un code pour choisir un nouveau mot de passe.</Text>
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="go" onSubmitEditing={submit} />
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label="Recevoir un code" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
