// Shared UI: buttons, price, section headings, image tiles, product card.
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colorway } from '@/lib/colorways';
import { Money, money, onSale, ProductCard as P, sized } from '@/lib/shopify';
import { C, F, R, S, T } from '@/theme';

import { Icon, IconName } from './Icon';

// ---------- buttons ----------
export function Button({ label, onPress, variant = 'solid', icon, loading, disabled, style, accessibilityLabel }: {
  label: string; onPress?: PressableProps['onPress']; variant?: 'solid' | 'ghost'; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const solid = variant === 'solid';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [ui.btn, solid ? ui.btnSolid : ui.btnGhost, (disabled) && { opacity: 0.45 }, pressed && { opacity: 0.8 }, style]}>
      {loading ? <ActivityIndicator color={solid ? C.bg : C.ink} /> : (
        <>
          <Text style={[ui.btnText, { color: solid ? C.bg : C.ink }]}>{label}</Text>
          {icon ? <Icon name={icon} size={16} color={solid ? C.bg : C.ink} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, disabled, mine, accessibilityLabel }: { label: string; active?: boolean; onPress?: () => void; disabled?: boolean; mine?: boolean; accessibilityLabel?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active, disabled: !!disabled }} accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress} disabled={disabled} hitSlop={4}
      style={[ui.chip, active && ui.chipActive, disabled && ui.chipDisabled]}>
      <Text style={[ui.chipText, active && { color: C.bg }, disabled && { color: 'rgba(17,17,17,0.35)', textDecorationLine: 'line-through' }]}>{label}</Text>
      {mine && !active ? <View style={ui.mineDot} /> : null}
    </Pressable>
  );
}

// ---------- price ----------
export function Price({ price, compare, size = 15, showSaving }: { price: Money; compare?: Money | null; size?: number; showSaving?: boolean }) {
  const sale = onSale(price, compare);
  const pct = sale ? Math.floor((1 - parseFloat(price.amount) / parseFloat(compare!.amount)) * 100) : 0;
  return (
    <View style={ui.priceRow} accessible accessibilityLabel={sale ? `Prix réduit ${money(price)}, prix initial ${money(compare)}` : money(price)}>
      <Text style={[T.price, { fontSize: size }]}>{money(price)}</Text>
      {sale ? <Text style={[T.price, ui.strike, { fontSize: size - 2 }]}>{money(compare)}</Text> : null}
      {sale && showSaving ? <View style={ui.save}><Text style={ui.saveText}>−{pct} %</Text></View> : null}
    </View>
  );
}

// ---------- headings ----------
export function SectionHead({ title, eyebrow, action, href }: { title: string; eyebrow?: string; action?: string; href?: string }) {
  return (
    <View style={ui.sectionHead}>
      <View style={{ flex: 1, gap: 6 }}>
        {eyebrow ? <Text style={T.label}>{eyebrow}</Text> : null}
        <Text style={T.h2} accessibilityRole="header">{title}</Text>
      </View>
      {action && href ? (
        <Link href={href as never} asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={ui.linkArrow}>
            <Text style={ui.linkText}>{action}</Text>
            <Icon name="arrow-right" size={14} />
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

// ---------- image tiles (square, 14px radius) ----------
export function Tile({ uri, width = 600, packshot, style, label }: { uri?: string | null; width?: number; packshot?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <View style={[ui.tile, style]} accessible={!!label} accessibilityLabel={label} accessibilityRole={label ? 'image' : undefined}>
      {uri ? <Image source={{ uri: sized(uri, width) }} style={StyleSheet.absoluteFill} contentFit={packshot ? 'contain' : 'cover'} transition={150}
        cachePolicy="memory-disk" recyclingKey={uri} /> : null}
    </View>
  );
}

// ---------- product card ----------
export function ProductCard({ product, width, onQuickAdd }: { product: P; width: number; onQuickAdd?: (p: P) => void }) {
  const way = colorway(product.handle);
  const ways = way?.siblings.length ?? 0;
  const price = product.priceRange.minVariantPrice; const compare = product.compareAtPriceRange.maxVariantPrice;
  const vendorHidden = /bon ?plan/i.test(product.vendor);
  return (
    <View style={{ width }}>
      <Link href={`/produit/${product.handle}`} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={`${product.title}, ${money(price)}${product.availableForSale ? '' : ', épuisé'}`} style={{ gap: 10 }}>
          <View>
            <Tile uri={product.featuredImage?.url} width={Math.round(width * 2)} packshot />
            {!product.availableForSale ? <View style={ui.badge}><Text style={ui.badgeText}>Épuisé</Text></View> : null}
          </View>
          <View style={{ gap: 3 }}>
            {!vendorHidden && product.vendor ? <Text style={T.small} numberOfLines={1}>{product.vendor}</Text> : null}
            <Text style={ui.cardTitle} numberOfLines={2}>{product.title}</Text>
            <Price price={price} compare={compare} size={14} />
            {ways > 1 ? (
              <View style={ui.ways}>
                {way?.hex[0] ? <View style={[ui.swatch, { backgroundColor: way.hex[0] }]} /> : null}
                <Text style={T.small}>{ways} coloris</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Link>
      {onQuickAdd && product.availableForSale ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Choisir une pointure — ${product.title}`} onPress={() => onQuickAdd(product)} hitSlop={6} style={[ui.quick, { top: width - 48 }]}>
          <Icon name="plus" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={{ paddingVertical: 40, gap: 12 }}>
      <Text style={T.h3}>{title}</Text>
      {text ? <Text style={T.bodyMuted}>{text}</Text> : null}
      {children}
    </View>
  );
}

export const ui = StyleSheet.create({
  btn: { minHeight: 52, paddingHorizontal: 24, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1 },
  btnSolid: { backgroundColor: C.ink, borderColor: C.ink },
  btnGhost: { backgroundColor: C.bg, borderColor: C.lineStrong },
  btnText: { fontFamily: F.semibold, fontSize: 15 },
  chip: { minHeight: 44, minWidth: 52, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, borderColor: C.lineStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipDisabled: { borderColor: C.line, backgroundColor: '#FAFAF8' },
  chipText: { fontFamily: F.medium, fontSize: 15, color: C.ink, fontVariant: ['tabular-nums'] },
  mineDot: { position: 'absolute', top: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: C.ink },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  strike: { color: C.muted, textDecorationLine: 'line-through', fontFamily: F.regular },
  save: { borderWidth: 1, borderColor: C.ink, borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 1 },
  saveText: { fontFamily: F.semibold, fontSize: 12, color: C.ink },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 16, paddingHorizontal: S.edge },
  linkArrow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  linkText: { fontFamily: F.semibold, fontSize: 13, color: C.ink },
  tile: { width: '100%', aspectRatio: 1, borderRadius: R.tile, overflow: 'hidden', backgroundColor: C.surface },
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: C.bg, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: F.semibold, fontSize: 12, color: C.ink },
  cardTitle: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink },
  ways: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 11, height: 11, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.2)' },
  quick: { position: 'absolute', right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
