import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import content from '@/content/sections.json';
import { SHOP_DOMAIN } from '@/lib/shopify';
import { C, F, S, T } from '@/theme';

const wa = content.settings.whatsapp.replace(/[^\d]/g, '');
const tel = content.settings.phone.replace(/[^\d+]/g, '');

export default function Infos() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.edge, paddingBottom: 40, gap: 28 }}>
        <Text style={T.display} accessibilityRole="header">infos</Text>
        <Group title="Aide">
          <Row href="/page/guide-des-pointures" icon="ruler" label="Guide des pointures" />
          <Row href="/page/entretien" label="Conseils d'entretien" />
          <Row href="/page/faq" label="Questions fréquentes" />
          <Row href="/page/contact" label="Nous contacter" />
        </Group>
        <Group title="La marque">
          <Row href="/page/a-propos" label="À propos de zayou" />
          <Row href="/page/inspirations" label="Inspirations" />
          <Row onPress={() => WebBrowser.openBrowserAsync(`https://${SHOP_DOMAIN}/blogs/infos`)} label="Journal" />
        </Group>
        <Group title="Contact">
          <Row onPress={() => Linking.openURL(`https://wa.me/${wa}`)} icon="whatsapp" label={`WhatsApp · ${content.settings.whatsapp}`} />
          <Row onPress={() => Linking.openURL(`tel:${tel}`)} icon="phone" label={`Téléphone · ${content.settings.phone}`} />
        </Group>
        <Group title="Légal">
          <Row onPress={() => WebBrowser.openBrowserAsync(`https://${SHOP_DOMAIN}/policies/privacy-policy`)} label="Politique de confidentialité" />
        </Group>
        <View style={{ gap: 6 }}>
          <Text style={T.small}>Livraison partout au Maroc · Paiement à la livraison</Text>
          <Text style={T.small}>© {new Date().getFullYear()} zayou</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <View><Text style={[T.label, { marginBottom: 6 }]}>{title}</Text>{children}</View>;
}
function Row({ href, onPress, label, icon }: { href?: string; onPress?: () => void; label: string; icon?: IconName }) {
  const inner = (
    <Pressable onPress={onPress} style={st.row} accessibilityRole={href ? 'link' : 'button'}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <Text style={st.text}>{label}</Text>
      <Icon name="chevron-right" size={18} color={C.muted} />
    </Pressable>
  );
  return href ? <Link href={href as never} asChild>{inner}</Link> : inner;
}

const st = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: C.line },
  text: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
});
