// Form field: label, input, optional show/hide for passwords, inline hint or error.
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputInstance, TextInputProps, View } from 'react-native';

import { C, F, R, T } from '@/theme';

type Props = TextInputProps & { label: string; error?: string | null; hint?: string; password?: boolean };

export const Field = forwardRef<TextInputInstance, Props>(function Field({ label, error, hint, password, style, ...input }, ref) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <View style={[st.box, error ? { borderColor: C.error } : null]}>
        <TextInput ref={ref} {...input} secureTextEntry={password ? hidden : input.secureTextEntry} placeholderTextColor={C.muted}
          style={[st.input, style]} accessibilityLabel={label} accessibilityHint={error ?? hint} />
        {password ? (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}>
            <Text style={st.toggle}>{hidden ? 'Afficher' : 'Masquer'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={st.error} accessibilityRole="alert">{error}</Text> : hint ? <Text style={T.small}>{hint}</Text> : null}
    </View>
  );
});

const st = StyleSheet.create({
  label: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.sm, paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink, paddingVertical: 12 },
  toggle: { fontFamily: F.medium, fontSize: 13, color: C.ink, textDecorationLine: 'underline' },
  error: { color: C.error, fontSize: 13, fontFamily: F.regular },
});
