// Header of the tab screens: logo on the left, search and cart (with item count) on the right.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCart } from '@/state/cart';
import { C, F, S } from '@/theme';

import { Icon } from './Icon';

export function AppHeader() {
  const { cart } = useCart();
  const count = cart?.totalQuantity ?? 0;
  return (
    <View style={st.header}>
      <Pressable onPress={() => router.navigate('/')} hitSlop={8} accessibilityRole="link" accessibilityLabel="zayou, accueil">
        <Image source={require('@/../assets/brand/logo.png')} style={st.logo} contentFit="contain" contentPosition="left" />
      </Pressable>
      <View style={st.actions}>
        <Pressable onPress={() => router.push('/recherche')} hitSlop={4} style={st.icon} accessibilityRole="button" accessibilityLabel="Rechercher"><Icon name="search" /></Pressable>
        <Pressable onPress={() => router.push('/panier')} hitSlop={4} style={st.icon} accessibilityRole="button" accessibilityLabel={count ? `Panier, ${count} article${count > 1 ? 's' : ''}` : 'Panier'}>
          <Icon name="bag" />
          {count > 0 ? <View style={st.badge}><Text style={st.badgeText}>{count}</Text></View> : null}
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: S.edge, paddingRight: S.edge - 10 },
  logo: { width: 92, height: 26 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 5, right: 3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: C.bg, fontSize: 11, fontFamily: F.semibold },
});
