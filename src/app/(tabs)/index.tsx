import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Sections } from '@/components/Sections';
import content from '@/content/sections.json';
import { C } from '@/theme';

// App-only homepage (the website keeps its own): theme hero, categories and size finder + live product rails.
const theme = (type: string) => (content.home as { type: string }[]).filter(s => s.type === type);
const HOME = [
  ...theme('hero'),
  ...theme('categories'),
  { type: 'listing', listing: 'best-sellers', heading: 'best sellers' },
  ...theme('sizeFinder'),
  { type: 'listing', listing: 'destockage', heading: 'déstockage' },
  { type: 'listing', listing: 'baskets-homme', heading: 'baskets', action: 'Toutes les baskets' },
  { type: 'listing', listing: 'mocassins-homme', heading: 'mocassins', action: 'Tous les mocassins' },
];

export default function Home() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Sections sections={HOME as never} />
      </ScrollView>
    </SafeAreaView>
  );
}
