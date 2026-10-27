// 6-digit code from the e-mail: confirms a new account (purpose=verify) or sets a new password (purpose=reset).
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';

import { Field } from '@/components/Field';
import { form as st } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { forgotPassword, resendCode, resetPassword, verifyEmail } from '@/lib/account';
import { useAccount } from '@/state/account';
import { C, T } from '@/theme';


export default function Code() {
  const { email, purpose } = useLocalSearchParams<{ email: string; purpose: 'verify' | 'reset' }>();
  const { signedIn } = useAccount();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reset = purpose === 'reset';
  const submit = async () => {
    if (!/^\d{6}$/.test(code.trim())) { setError('Le code contient 6 chiffres.'); return; }
    if (reset && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) { setError('Mot de passe : 8 caractères minimum, avec au moins une lettre et un chiffre.'); return; }
    setBusy(true); setError(null);
    try {
      const s = reset ? await resetPassword(email, code.trim(), password) : await verifyEmail(email, code.trim());
      await signedIn(s.customer);
      router.dismissTo('/compte');
    } catch (e) { setError(e instanceof Error ? e.message : 'Code invalide.'); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setError(null);
    try { await (reset ? forgotPassword(email) : resendCode(email)); setInfo('Si un code peut être envoyé, il arrive dans un instant. Pensez à vérifier les courriers indésirables.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Envoi impossible.'); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: reset ? 'Nouveau mot de passe' : 'Confirmer mon e-mail' }} />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Text style={T.h1}>{reset ? 'nouveau mot de passe' : 'vérifiez vos e-mails'}</Text>
        <Text style={T.bodyMuted}>Nous avons envoyé un code à 6 chiffres à <Text style={{ color: C.ink }}>{email}</Text>. Il est valable 15 minutes.</Text>
        <Field label="Code" value={code} onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6}
          style={{ fontSize: 24, letterSpacing: 8 }} returnKeyType={reset ? 'next' : 'go'} onSubmitEditing={reset ? undefined : submit} />
        {reset ? <Field label="Nouveau mot de passe" value={password} onChangeText={setPassword} password autoComplete="new-password" textContentType="newPassword" hint="8 caractères minimum, avec au moins une lettre et un chiffre." returnKeyType="go" onSubmitEditing={submit} /> : null}
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        {info ? <Text style={T.small}>{info}</Text> : null}
        <Button label={reset ? 'Enregistrer et me connecter' : 'Confirmer'} onPress={submit} loading={busy} />
        <Pressable onPress={resend} style={st.switch} accessibilityRole="button"><Text style={st.link}>Renvoyer le code</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
