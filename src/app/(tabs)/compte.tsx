// "Compte" tab: Shopify customer account (orders, addresses), wishlist, help and contact.
import { Link, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import { Button } from '@/components/ui';
import content from '@/content/sections.json';
import { orderStatus } from '@/lib/account';
import { money, SHOP_DOMAIN } from '@/lib/shopify';
import { useAccount } from '@/state/account';
import { useWishlist } from '@/state/wishlist';
import { C, F, R, S, T } from '@/theme';

const wa = content.settings.whatsapp.replace(/[^\d]/g, '');
const tel = content.settings.phone.replace(/[^\d+]/g, '');

export default function Compte() {
  const { status, customer, error, configured, login, logout, reload } = useAccount();
  const { handles } = useWishlist();
  useFocusEffect(useCallback(() => { if (status === 'in') reload(); }, [status, reload]));
  const last = customer?.orders.nodes[0];

  const askDeletion = () => Alert.alert('Supprimer mon compte', 'Votre demande sera envoyée à zayou sur WhatsApp. Votre compte et vos données personnelles seront supprimés, et vous serez déconnecté de l’application.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Envoyer la demande', style: 'destructive', onPress: async () => {
      const email = customer?.emailAddress?.emailAddress ?? '';
      await Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(`Bonjour, je souhaite supprimer mon compte zayou et mes données personnelles. E-mail du compte : ${email}`)}`);
      await logout();
    } },
  ]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.edge, paddingBottom: 40, gap: 28 }}>
        <Text style={T.display} accessibilityRole="header">compte</Text>

        {status === 'loading' ? <ActivityIndicator color={C.ink} /> : status === 'out' ? (
          <View style={st.card}>
            <Text style={T.h3}>Votre espace zayou</Text>
            <Text style={T.bodyMuted}>Suivez vos commandes, enregistrez vos adresses et retrouvez vos favoris. Connexion par un code envoyé à votre adresse e-mail : pas de mot de passe.</Text>
            {configured ? <Button label="Se connecter ou créer un compte" onPress={login} /> : <Text style={T.small}>La connexion au compte sera disponible très bientôt.</Text>}
            {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <View style={{ gap: 4 }}>
              <Text style={T.h2}>Bonjour {customer?.firstName || customer?.displayName || ''}</Text>
              {customer?.emailAddress?.emailAddress ? <Text style={T.small}>{customer.emailAddress.emailAddress}</Text> : null}
            </View>
            {last ? (
              <Link href={`/compte/commande/${encodeURIComponent(last.id)}`} asChild>
                <Pressable style={st.card} accessibilityRole="link" accessibilityLabel={`Dernière commande ${last.name}, ${orderStatus(last)}`}>
                  <Text style={T.label}>Dernière commande</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={st.strong}>{last.name}</Text><Text style={T.price}>{money(last.totalPrice)}</Text>
                  </View>
                  <Text style={T.small}>{orderStatus(last)} · {new Date(last.processedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </Pressable>
              </Link>
            ) : null}
            {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}
          </View>
        )}

        <Group title="Mon espace">
          {status === 'in' ? <Row href="/compte/commandes" icon="box" label="Mes commandes" /> : null}
          {status === 'in' ? <Row href="/compte/adresses" icon="pin" label="Mes adresses" /> : null}
          <Row href="/favoris" icon="heart" label={`Mes favoris${handles.length ? ` (${handles.length})` : ''}`} />
        </Group>

        <Group title="Aide">
          <Row href="/page/guide-des-pointures" icon="ruler" label="Guide des pointures" />
          <Row href="/page/entretien" label="Conseils d’entretien" />
          <Row href="/page/faq" label="Questions fréquentes" />
          <Row onPress={() => Linking.openURL(`https://wa.me/${wa}`)} icon="whatsapp" label={`WhatsApp · ${content.settings.whatsapp}`} />
          <Row onPress={() => Linking.openURL(`tel:${tel}`)} icon="phone" label={`Téléphone · ${content.settings.phone}`} />
        </Group>

        <Group title="La marque">
          <Row href="/page/a-propos" label="À propos de zayou" />
          <Row href="/page/inspirations" label="Inspirations" />
          <Row onPress={() => WebBrowser.openBrowserAsync(`https://${SHOP_DOMAIN}/blogs/infos`)} label="Journal" />
          <Row onPress={() => WebBrowser.openBrowserAsync(`https://${SHOP_DOMAIN}/policies/privacy-policy`)} label="Politique de confidentialité" />
        </Group>

        {status === 'in' ? (
          <Group title="Compte">
            <Row onPress={logout} icon="logout" label="Se déconnecter" />
            <Row onPress={askDeletion} label="Supprimer mon compte" danger />
          </Group>
        ) : null}

        <Text style={T.small}>Livraison partout au Maroc · Paiement à la livraison · © {new Date().getFullYear()} zayou</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <View><Text style={[T.label, { marginBottom: 6 }]}>{title}</Text>{children}</View>;
}
function Row({ href, onPress, label, icon, danger }: { href?: string; onPress?: () => void; label: string; icon?: IconName; danger?: boolean }) {
  const inner = (
    <Pressable onPress={onPress} style={st.row} accessibilityRole={href ? 'link' : 'button'}>
      {icon ? <Icon name={icon} size={18} /> : null}
      <Text style={[st.text, danger && { color: C.error }]}>{label}</Text>
      <Icon name="chevron-right" size={18} color={C.muted} />
    </Pressable>
  );
  return href ? <Link href={href as never} asChild>{inner}</Link> : inner;
}

const st = StyleSheet.create({
  card: { padding: 18, borderRadius: R.tile, backgroundColor: C.surface, gap: 12 },
  strong: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
  err: { color: C.error, fontSize: 14 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: C.line },
  text: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.ink },
});
