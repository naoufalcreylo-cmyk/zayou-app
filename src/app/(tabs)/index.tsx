import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Sections } from '@/components/Sections';
import content from '@/content/sections.json';
import { C } from '@/theme';

// App-only homepage (the website keeps its own): seasonal hero, theme categories + live product rails.
const theme = (type: string) => (content.home as { type: string }[]).filter(s => s.type === type);
const HOME = [
  {
    type: 'hero',
    eyebrow: 'Nouvelle saison',
    heading: 'bottines et baskets, pour la saison froide.',
    text: ['Livraison partout au Maroc, paiement à la livraison.'],
    image: { product: 'bottine-homme-002-cuir-tabac', position: 3 },
    image2: { product: 'crest-kaki', position: 5 },
    alt: 'Paire de bottines couleur tabac',
    cta: 'Découvrir les bottines',
    href: '/collection/bottines-homme',
  },
  ...theme('categories'),
  { type: 'listing', listing: 'best-sellers', heading: 'best sellers' },
  { type: 'listing', listing: 'destockage', heading: 'déstockage' },
  { type: 'listing', listing: 'baskets-homme', heading: 'baskets', action: 'Toutes les baskets' },
  { type: 'listing', listing: 'mocassins-homme', heading: 'mocassins', action: 'Tous les mocassins' },
  { type: 'listing', listing: 'sabot-homme', heading: 'sabots', action: 'Tous les sabots' },
  { type: 'listing', listing: 'bottines-homme', heading: 'bottines', action: 'Toutes les bottines' },
  { type: 'listing', listing: 'sandales-homme', heading: 'sandales', action: 'Toutes les sandales' },
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
