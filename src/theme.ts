// ZAYOU design tokens — same system as the Shopify theme: white ground, ink from the logo, square tiles (14px radius),
// round controls like the logo strokes, one typeface (Instrument Sans).
export const C = {
  ink: '#111111',
  ink2: 'rgba(17,17,17,0.72)',
  bg: '#FFFFFF',
  surface: '#F3F3F1',
  muted: '#6A6A66',
  line: '#E5E5E1',
  lineStrong: 'rgba(17,17,17,0.28)',
  error: '#B3261E',
  ok: '#1D6B3C',
};
export const R = { tile: 14, sm: 8, pill: 999 };
export const S = { edge: 16, gap: 12, section: 40 };
export const F = {
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
};
export const T = {
  display: { fontFamily: F.medium, fontSize: 40, lineHeight: 40, letterSpacing: -1.6, color: C.ink },
  h1: { fontFamily: F.medium, fontSize: 30, lineHeight: 32, letterSpacing: -1, color: C.ink },
  h2: { fontFamily: F.medium, fontSize: 24, lineHeight: 27, letterSpacing: -0.6, color: C.ink },
  h3: { fontFamily: F.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.ink },
  bodyMuted: { fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.ink2 },
  small: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.muted },
  label: { fontFamily: F.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' as const, color: C.muted },
  price: { fontFamily: F.medium, fontSize: 15, color: C.ink, fontVariant: ['tabular-nums' as const] },
};
