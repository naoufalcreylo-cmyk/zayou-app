import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
import { useWishlist } from '@/state/wishlist';
import { C, F } from '@/theme';

// Search and cart live in the header (components/AppHeader), not in the tab bar.
export default function TabsLayout() {
  const { handles } = useWishlist();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: C.ink, tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontFamily: F.medium, fontSize: 11 },
      tabBarStyle: { borderTopColor: C.line, backgroundColor: C.bg },
      tabBarBadgeStyle: { backgroundColor: C.ink, color: C.bg, fontFamily: F.semibold, fontSize: 11 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color }) => <Icon name="home" color={color as string} /> }} />
      <Tabs.Screen name="boutique" options={{ title: 'Boutique', tabBarIcon: ({ color }) => <Icon name="grid" color={color as string} /> }} />
      <Tabs.Screen name="favoris" options={{
        title: 'Liste d’envies', tabBarBadge: handles.length || undefined,
        tabBarAccessibilityLabel: handles.length ? `Liste d’envies, ${handles.length} article${handles.length > 1 ? 's' : ''}` : 'Liste d’envies',
        tabBarIcon: ({ color }) => <Icon name="heart" color={color as string} />,
      }} />
      <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: ({ color }) => <Icon name="account" color={color as string} /> }} />
    </Tabs>
  );
}
