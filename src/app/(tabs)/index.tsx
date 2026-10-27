import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Sections } from '@/components/Sections';
import content from '@/content/sections.json';
import { C, S } from '@/theme';

export default function Home() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.header}>
        <View style={{ width: 44 }} />
        <Image source={require('@/../assets/brand/logo.png')} style={st.logo} contentFit="contain" accessibilityLabel="zayou" accessibilityRole="header" />
        <Pressable onPress={() => router.navigate('/recherche')} hitSlop={8} style={st.icon} accessibilityRole="button" accessibilityLabel="Rechercher"><Icon name="search" /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Sections sections={content.home as never} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.edge - 6 },
  logo: { width: 92, height: 26 },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
