import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { useCart } from '@/state/cart';
import { C, F } from '@/theme';

export default function TabsLayout() {
  const { cart } = useCart();
  const count = cart?.totalQuantity ?? 0;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.ink, tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      tabBarStyle: { borderTopColor: C.line, backgroundColor: C.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Icon name="home" color={color as string} /> }} />
      <Tabs.Screen name="boutique" options={{ title: 'Boutique', tabBarIcon: ({ color }) => <Icon name="grid" color={color as string} /> }} />
      <Tabs.Screen name="recherche" options={{ title: 'Recherche', tabBarIcon: ({ color }) => <Icon name="search" color={color as string} /> }} />
      <Tabs.Screen name="panier" options={{
        title: 'Panier', tabBarAccessibilityLabel: count ? `Panier, ${count} article${count > 1 ? 's' : ''}` : 'Panier',
        tabBarIcon: ({ color }) => (
          <View>
            <Icon name="bag" color={color as string} />
            {count > 0 ? <View style={{ position: 'absolute', top: -4, right: -8, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Text style={{ color: C.bg, fontSize: 11, fontFamily: F.semibold }}>{count}</Text></View> : null}
          </View>
        ),
      }} />
      <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: ({ color }) => <Icon name="account" color={color as string} /> }} />
    </Tabs>
  );
}
