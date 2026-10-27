// Size grid: explicit sold-out sizes, remembered size marked with a dot, nothing pre-selected.
import { StyleSheet, Text, View } from 'react-native';

import { sizeOf, sizeOptionName, Variant } from '@/lib/shopify';
import { useSize } from '@/state/size';
import { C, T } from '@/theme';

import { Chip } from './ui';

export function SizePicker({ product, selected, onSelect, error }: {
  product: { options: { name: string; optionValues: { name: string }[] }[]; variants: Variant[] };
  selected: string | null; onSelect: (v: Variant) => void; error?: boolean;
}) {
  const { size: mine } = useSize();
  const opt = sizeOptionName(product);
  const mineVariant = mine ? product.variants.find(v => sizeOf(v, opt) === mine) : null;
  return (
    <View style={{ gap: 10 }}>
      <View style={st.grid} accessibilityRole="radiogroup" accessibilityLabel="Pointure">
        {product.variants.map(v => {
          const s = sizeOf(v, opt) ?? v.title;
          return (
            <View key={v.id} style={st.cell}>
              <Chip label={s} active={selected === v.id} disabled={!v.availableForSale} mine={s === mine} onPress={() => onSelect(v)}
                accessibilityLabel={`Pointure ${s}${v.availableForSale ? '' : ', épuisée'}${s === mine ? ', votre pointure enregistrée' : ''}`} />
            </View>
          );
        })}
      </View>
      {error ? <Text style={st.error} accessibilityRole="alert">Choisissez votre pointure pour continuer.</Text> : null}
      {mineVariant && !selected ? <Text style={T.small}>Votre pointure enregistrée : {mine}{mineVariant.availableForSale ? '' : ' — épuisée'}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '25%', padding: 4 },
  error: { color: C.error, fontSize: 14, fontWeight: '500' },
});
