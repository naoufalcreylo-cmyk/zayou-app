// "Compte" tab: native sign-up / login (ZAYOU account), orders, addresses, profile, wishlist and contact.
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Icon, IconName } from '@/components/Icon';
import { Button } from '@/components/ui';
import content from '@/content/sections.json';
import { deleteAccount, numericId, orderStatus } from '@/lib/account';
import { money } from '@/lib/shopify';
import { useAccount } from '@/state/account';
import { useWishlist } from '@/state/wishlist';
import { C, F, R, S, T } from '@/theme';

const wa = content.settings.whatsapp.replace(/[^\d]/g, '');
const tel = content.settings.phone.replace(/[^\d+]/g, '');

export default function Compte() {
  const { status, customer, orders, error, configured, logout, reload } = useAccount();
  const { handles } = useWishlist();
  const [deleting, setDeleting] = useState(false);
  useFocusEffect(useCallback(() => { if (status === 'in') reload(); }, [status, reload]));
  const last = orders[0];

  const confirmDelete = () => Alert.alert('Supprimer mon compte', 'Votre compte zayou et votre mot de passe seront supprimés immédiatement. Vos données personnelles seront effacées de la boutique. Cette action est définitive.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      setDeleting(true);
      try { await deleteAccount(); await logout(); Alert.alert('Compte supprimé', 'Votre compte a bien été supprimé.'); }
      catch (e) { Alert.alert('Suppression impossible', e instanceof Error ? e.message : 'Réessayez dans un instant.'); }
      finally { setDeleting(false); }
    } },
  ]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: S.edge, paddingTop: 8, paddingBottom: 40, gap: 28 }}>
        <Text style={T.display} accessibilityRole="header">compte</Text>

        {status === 'loading' ? <ActivityIndicator color={C.ink} /> : status === 'out' ? (
          <View style={st.card}>
            <Text style={T.h3}>Votre espace zayou</Text>
            <Text style={T.bodyMuted}>Suivez vos commandes, enregistrez vos adresses et retrouvez votre liste d’envies.</Text>
            {configured ? (
              <View style={{ gap: 10 }}>
                <Button label="Se connecter" onPress={() => router.push('/compte/connexion')} />
                <Button label="S’inscrire" variant="ghost" onPress={() => router.push('/compte/inscription')} />
              </View>
            ) : <Text style={T.small}>La création de compte sera disponible très bientôt.</Text>}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <Text style={T.h2}>Bonjour {customer?.firstName}</Text>
              <Text style={T.small}>{customer?.email}</Text>
            </View>
            {last ? (
              <Link href={`/compte/commande/${numericId(last.id)}`} asChild>
                <Pressable style={st.card} accessibilityRole="link" accessibilityLabel={`Dernière commande ${last.name}, ${orderStatus(last)}`}>
                  <Text style={T.label}>Dernière commande</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={st.strong}>{last.name}</Text><Text style={T.price}>{money(last.total)}</Text></View>
                  <Text style={T.small}>{orderStatus(last)} · {new Date(last.processedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        )}
        {error ? <Text style={st.err} accessibilityRole="alert">{error}</Text> : null}

        <Group title="Mon espace">
          {status === 'in' ? <Row href="/compte/commandes" icon="box" label="Mes commandes" /> : null}
          <Row href="/favoris" icon="heart" label={`Ma liste d’envies${handles.length ? ` (${handles.length})` : ''}`} />
          {status === 'in' ? <Row href="/compte/adresses" icon="pin" label="Mes adresses" />
            : configured ? <Row href="/compte/connexion" icon="pin" label="Mes adresses" hint="Connectez-vous pour enregistrer vos adresses" /> : null}
          {status === 'in' ? <Row href="/compte/profil" icon="account" label="Mes informations" /> : null}
        </Group>

        <Group title="Nous contacter">
          <Row onPress={() => Linking.openURL(`https://wa.me/${wa}`)} icon="whatsapp" label={`WhatsApp · ${content.settings.whatsapp}`} />
          <Row onPress={() => Linking.openURL(`tel:${tel}`)} icon="phone" label={`Téléphone · ${content.settings.phone}`} />
        </Group>

        {status === 'in' ? (
          <Group title="Compte">
            <Row onPress={logout} icon="logout" label="Se déconnecter" />
            <Row onPress={confirmDelete} label={deleting ? 'Suppression…' : 'Supprimer mon compte'} danger />
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
function Row({ href, onPress, label, hint, icon, danger }: { href?: string; onPress?: () => void; label: string; hint?: string; icon?: IconName; danger?: boolean }) {
  const inner = (
    <Pressable onPress={onPress} style={st.row} accessibilityRole={href ? 'link' : 'button'} accessibilityHint={hint}>
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
