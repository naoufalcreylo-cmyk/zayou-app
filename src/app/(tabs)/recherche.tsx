import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { QuickAdd } from '@/components/QuickAdd';
import { Chip, Empty, ProductCard } from '@/components/ui';
import content from '@/content/sections.json';
import { predictive, ProductCard as P, search } from '@/lib/shopify';
import { C, F, R, S, T } from '@/theme';

export default function Recherche() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState(params.q ?? '');
  const [found, setFound] = useState<{ term: string; results: P[]; collections: { handle: string; title: string }[]; queries: string[] }>({ term: '', results: [], collections: [], queries: [] });
  const [quick, setQuick] = useState<P | null>(null);
  const seq = useRef(0);
  const cardW = (width - S.edge * 2 - S.gap) / 2;
  const term = q.trim();
  const loading = !!term && term !== found.term;
  const results: P[] | null = term ? (found.term === term ? found.results : null) : null;
  const suggest = term && found.term === term ? found : { collections: [], queries: [] as string[] };

  useEffect(() => {
    if (!term) return;
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const [p, full] = await Promise.all([predictive(term), search(term, 40)]);
        if (n === seq.current) setFound({ term, results: full.length ? full : p.products, collections: p.collections, queries: p.queries.filter(x => x.toLowerCase() !== term.toLowerCase()) });
      } catch { if (n === seq.current) setFound({ term, results: [], collections: [], queries: [] }); }
    }, 220);
    return () => clearTimeout(t);
  }, [term]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.bar}>
        <Icon name="search" size={20} />
        <TextInput value={q} onChangeText={setQ} placeholder="Baskets, mocassins, couleur…" placeholderTextColor={C.muted} style={st.input}
          autoCorrect={false} autoCapitalize="none" returnKeyType="search" clearButtonMode="while-editing" accessibilityLabel="Rechercher" />
        {loading ? <ActivityIndicator color={C.ink} /> : q ? <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Effacer"><Icon name="close" size={18} /></Pressable> : null}
      </View>
      {!term ? (
        <ScrollView contentContainerStyle={{ padding: S.edge, gap: 14 }}>
          <Text style={T.label}>Explorer les catégories</Text>
          <View style={st.wrap}>
            {content.menu.map(([h, label]) => <Link key={h} href={`/collection/${h}`} asChild><Pressable style={st.pill} accessibilityRole="link"><Text style={st.pillText}>{label}</Text></Pressable></Link>)}
          </View>
        </ScrollView>
      ) : (
        <FlatList data={results ?? []} keyExtractor={p => p.id} numColumns={2} columnWrapperStyle={{ gap: S.gap, paddingHorizontal: S.edge }} contentContainerStyle={{ gap: 24, paddingBottom: 40 }}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <View style={{ paddingHorizontal: S.edge, gap: 12, paddingTop: 4 }}>
              {suggest.collections.length || suggest.queries.length ? (
                <View style={st.wrap}>
                  {suggest.collections.map(c => <Link key={c.handle} href={`/collection/${c.handle}`} asChild><Pressable style={st.pill} accessibilityRole="link"><Text style={st.pillText}>{c.title}</Text></Pressable></Link>)}
                  {suggest.queries.slice(0, 4).map(x => <Chip key={x} label={x} onPress={() => setQ(x)} />)}
                </View>
              ) : null}
              {results?.length ? <Text style={T.small}>{results.length} résultat{results.length > 1 ? 's' : ''}</Text> : null}
            </View>
          }
          ListEmptyComponent={!loading && results ? <View style={{ paddingHorizontal: S.edge }}><Empty title={`Aucun résultat pour « ${q.trim()} ».`} text="Vérifiez l'orthographe ou essayez un terme plus général, comme « basket », « mocassin » ou une couleur." /></View> : undefined}
          renderItem={({ item }) => <ProductCard product={item} width={cardW} onQuickAdd={setQuick} />}
        />
      )}
      <QuickAdd product={quick} onClose={() => setQuick(null)} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: S.edge, marginVertical: 10, paddingHorizontal: 16, height: 50, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong },
  input: { flex: 1, fontFamily: F.regular, fontSize: 16, color: C.ink, height: '100%' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, justifyContent: 'center' },
  pillText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
});
