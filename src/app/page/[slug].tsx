// Info pages (guide des pointures, entretien, FAQ, à propos, inspirations, contact) — same content as the website.
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, Text, View } from 'react-native';

import { Sections } from '@/components/Sections';
import { Button, Empty } from '@/components/ui';
import content from '@/content/sections.json';
import { C, S, T } from '@/theme';

const wa = content.settings.whatsapp.replace(/[^\d]/g, '');
const tel = content.settings.phone.replace(/[^\d+]/g, '');

export default function Page() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = (content.pages as Record<string, { title: string; sections: any[] }>)[slug];
  if (!page) return <View style={{ padding: S.edge }}><Empty title="Page introuvable" /></View>;
  // The website contact form posts to Shopify; in the app the direct channels are used instead.
  const sections = page.sections.filter(s => s.type !== 'contact');
  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: page.title }} />
      <Sections sections={sections} />
      {slug === 'contact' ? (
        <View style={{ paddingHorizontal: S.edge, gap: 10, paddingVertical: 8 }}>
          <Text style={T.label}>Écrivez-nous directement</Text>
          <Button label={`WhatsApp · ${content.settings.whatsapp}`} icon="arrow-right" onPress={() => Linking.openURL(`https://wa.me/${wa}`)} />
          <Button label={`Téléphone · ${content.settings.phone}`} variant="ghost" onPress={() => Linking.openURL(`tel:${tel}`)} />
        </View>
      ) : null}
    </ScrollView>
  );
}
