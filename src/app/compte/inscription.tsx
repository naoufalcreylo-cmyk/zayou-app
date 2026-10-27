// S'inscrire: prénom, nom, e-mail, mot de passe — then a 6-digit code confirms the e-mail.
import { Link, router, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInputInstance } from 'react-native';

import { Field } from '@/components/Field';
import { form as st } from '@/components/formStyles';
import { Button } from '@/components/ui';
import { signup } from '@/lib/account';
import { C, T } from '@/theme';


const PW_RULE = '8 caractères minimum, avec au moins une lettre et un chiffre.';

export default function Inscription() {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastNameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  const submit = async () => {
    if (!f.firstName.trim() || !f.lastName.trim() || !f.email.trim() || !f.password) { setError('Merci de remplir tous les champs.'); return; }
    if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) { setError(`Mot de passe : ${PW_RULE}`); return; }
    setBusy(true); setError(null);
    try {
      const r = await signup({ ...f, email: f.email.trim() });
      router.replace({ pathname: '/compte/code', params: { email: r.email, purpose: 'verify' } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Inscription impossible.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'S’inscrire' }} />
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <Text style={T.h1}>créer un compte</Text>
        <Text style={T.bodyMuted}>Suivez vos commandes, enregistrez vos adresses et commandez plus vite.</Text>
        <Field label="Prénom" value={f.firstName} onChangeText={set('firstName')} autoComplete="given-name" textContentType="givenName" returnKeyType="next" onSubmitEditing={() => lastNameRef.current?.focus()} />
        <Field ref={lastNameRef} label="Nom" value={f.lastName} onChangeText={set('lastName')} autoComplete="family-name" textContentType="familyName" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
        <Field ref={emailRef} label="E-mail" value={f.email} onChangeText={set('email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
        <Field ref={passwordRef} label="Mot de passe" value={f.password} onChangeText={set('password')} password autoComplete="new-password" textContentType="newPassword" hint={PW_RULE} returnKeyType="go" onSubmitEditing={submit} />
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
        <Button label="Créer mon compte" onPress={submit} loading={busy} />
        <Text style={T.small}>Un code de confirmation vous sera envoyé par e-mail.</Text>
        <Link href="/compte/connexion" replace asChild>
          <Pressable style={st.switch} accessibilityRole="link"><Text style={T.body}>Déjà un compte ? <Text style={st.link}>Se connecter</Text></Text></Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
