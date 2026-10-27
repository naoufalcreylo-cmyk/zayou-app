// Se connecter: e-mail + mot de passe (native, no browser).
import { Link, router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInputInstance } from 'react-native';

import { Field } from '@/components/Field';
import { form as st } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { login } from '@/lib/account';
import { useAccount } from '@/state/account';
import { C, T } from '@/theme';

export default function Connexion() {
  const { signedIn } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pw = useRef<TextInputInstance>(null);
  const submit = async () => {
    if (!email.trim() || !password) { setError('Indiquez votre e-mail et votre mot de passe.'); return; }
    setBusy(true); setError(null);
    try {
      const r = await login(email.trim(), password);
      if ('token' in r) { await signedIn(r.customer); router.dismissTo('/compte'); }
      else router.replace({ pathname: '/compte/code', params: { email: r.email, purpose: 'verify' } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Connexion impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Se connecter' }} />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Text style={T.h1}>se connecter</Text>
        <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => pw.current?.focus()} />
        <Field ref={pw} label="Mot de passe" value={password} onChangeText={setPassword} password autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
        <Link href={{ pathname: '/compte/mot-de-passe-oublie', params: { email } }} asChild>
          <Pressable hitSlop={8} accessibilityRole="link" style={{ alignSelf: 'flex-start' }}><Text style={st.link}>Mot de passe oublié ?</Text></Pressable>
        </Link>
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label="Se connecter" onPress={submit} loading={busy} />
        <Link href="/compte/inscription" replace asChild>
          <Pressable style={st.switch} accessibilityRole="link"><Text style={T.body}>Pas encore de compte ? <Text style={st.link}>S’inscrire</Text></Text></Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

