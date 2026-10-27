import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Tile } from '@/components/ui';
import content from '@/content/sections.json';
import { getCollectionsSummary, getProductImages, Image } from '@/lib/shopify';
import { useSize } from '@/state/size';
import { C, F, S, T } from '@/theme';

// Category photos: same choices as the homepage tiles in the theme (real product packshots).
const home = (content.home as any[]).find(s => s.type === 'categories');
const tileImage: Record<string, { product: string; position: number }> = Object.fromEntries((home?.items ?? []).map((i: any) => [i.collection, i.image]));

export default function Boutique() {
  const { width } = useWindowDimensions();
  const [summary, setSummary] = useState<Record<string, { title: string; count: number; image: Image | null }>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const { size } = useSize();
  const w = (width - S.edge * 2 - S.gap) / 2;
  useEffect(() => {
    getCollectionsSummary(content.menu.map(m => m[0])).then(setSummary).catch(() => {});
    const refs = Object.entries(tileImage);
    getProductImages(refs.map(([, r]) => r.product)).then(imgs => setPhotos(Object.fromEntries(refs.map(([c, r]) => [c, (imgs[r.product]?.[r.position - 1] ?? imgs[r.product]?.[0])?.url ?? ''])))).catch(() => {});
  }, []);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: S.edge, paddingBottom: 40, gap: 24 }}>
        <Text style={T.display} accessibilityRole="header">boutique</Text>
        <View style={st.grid}>
          {content.menu.filter(([h]) => (summary[h]?.count ?? 1) > 0).map(([h, label]) => (
            <Link key={h} href={`/collection/${h}`} asChild>
              <Pressable style={{ width: w, gap: 10 }} accessibilityRole="link" accessibilityLabel={`${label}, ${summary[h]?.count ?? ''} produits`}>
                <Tile uri={photos[h] || summary[h]?.image?.url} width={500} packshot />
                <Text style={st.label}>{label.toLowerCase()}<Text style={T.small}> {summary[h]?.count ?? ''}</Text></Text>
              </Pressable>
            </Link>
          ))}
        </View>
        <View style={{ gap: 0 }}>
          <Row href="/collection/all" label="Tous les produits" />
          <Row href="/collection/vendor:Broski" label="Modèles Broski" />
          {size ? <Row href={`/collection/all?taille=${size}`} label={`Disponible en ${size} (votre pointure)`} /> : null}
          <Row href="/page/guide-des-pointures" label="Guide des pointures" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={st.row} accessibilityRole="link"><Text style={st.rowText}>{label}</Text><Icon name="chevron-right" size={18} /></Pressable>
    </Link>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.gap, rowGap: 22 },
  label: { fontFamily: F.medium, fontSize: 22, letterSpacing: -0.6, color: C.ink },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: C.line },
  rowText: { fontFamily: F.medium, fontSize: 16, color: C.ink },
});
