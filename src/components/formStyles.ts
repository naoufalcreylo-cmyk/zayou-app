import { StyleSheet } from 'react-native';

import { C, F, S } from '@/theme';

/** Shared layout for the account forms (connexion, inscription, code, mot de passe oublié). */
export const form = StyleSheet.create({
  wrap: { padding: S.edge, gap: 16, paddingBottom: 40 },
  link: { fontFamily: F.medium, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
  err: { color: C.error, fontSize: 14 },
  switch: { alignItems: 'center', paddingVertical: 12 },
});
