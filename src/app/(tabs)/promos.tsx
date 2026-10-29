import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CollectionView } from '@/components/CollectionView';
import { C } from '@/theme';

// Products on promotion (see getListing('promos')), with the same size / stock / price filters as a collection.
export default function Promos() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />
      <CollectionView handle="promos" inStack={false} />
    </SafeAreaView>
  );
}
