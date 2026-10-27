// "Ajouté au panier" confirmation, shown after every successful add, with a shortcut to the cart.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '@/state/cart';
import { C, F, R } from '@/theme';

export function AddedToast() {
  const { lastAdded } = useCart();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState<number | null>(null);
  useEffect(() => {
    if (!lastAdded) return;
    AccessibilityInfo.announceForAccessibility('Ajouté au panier');
    const t = setTimeout(() => setDismissed(lastAdded.at), 2800);
    return () => clearTimeout(t);
  }, [lastAdded]);
  if (!lastAdded || dismissed === lastAdded.at) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ajouté au panier. Voir le panier" onPress={() => { setDismissed(lastAdded.at); router.navigate('/panier'); }}
      style={[st.toast, { bottom: insets.bottom + 72 }]}>
      <Text style={st.text}>Ajouté au panier</Text>
      <Text style={[st.text, { textDecorationLine: 'underline' }]}>Voir le panier</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 20, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { color: C.bg, fontFamily: F.semibold, fontSize: 14 },
});
