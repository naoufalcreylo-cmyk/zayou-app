import { useLocalSearchParams } from 'expo-router';

import { CollectionView } from '@/components/CollectionView';

export default function Collection() {
  const { handle, taille } = useLocalSearchParams<{ handle: string; taille?: string }>();
  return <CollectionView handle={handle} taille={taille} />;
}
