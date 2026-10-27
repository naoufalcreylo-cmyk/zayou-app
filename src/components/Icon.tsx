// Monoline icons with round caps (like the logo strokes) — same set as the Shopify theme.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { C } from '@/theme';

export type IconName = 'home' | 'grid' | 'search' | 'bag' | 'info' | 'close' | 'plus' | 'minus' | 'arrow-right' | 'arrow-left' | 'chevron-right' | 'truck' | 'cash' | 'whatsapp' | 'phone' | 'ruler' | 'check' | 'filter';

export function Icon({ name, size = 22, color = C.ink, strokeWidth = 1.5 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z" />}
      {name === 'grid' && <><Rect {...p} x={4} y={4} width={7} height={7} rx={1.5} /><Rect {...p} x={13} y={4} width={7} height={7} rx={1.5} /><Rect {...p} x={4} y={13} width={7} height={7} rx={1.5} /><Rect {...p} x={13} y={13} width={7} height={7} rx={1.5} /></>}
      {name === 'search' && <><Circle {...p} cx={10.5} cy={10.5} r={6.5} /><Path {...p} d="M15.5 15.5L20 20" /></>}
      {name === 'bag' && <><Path {...p} d="M5 8.5h14l-1 11.5H6L5 8.5z" /><Path {...p} d="M9 8.5V7a3 3 0 016 0v1.5" /></>}
      {name === 'info' && <><Circle {...p} cx={12} cy={12} r={8.5} /><Path {...p} d="M12 11v5.5M12 7.8v.2" /></>}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === 'plus' && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === 'minus' && <Path {...p} d="M5 12h14" />}
      {name === 'arrow-right' && <Path {...p} d="M4 12h15M14 7l5 5-5 5" />}
      {name === 'arrow-left' && <Path {...p} d="M20 12H5M10 7l-5 5 5 5" />}
      {name === 'chevron-right' && <Path {...p} d="M9.5 6l6 6-6 6" />}
      {name === 'truck' && <><Path {...p} d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7" /><Circle {...p} cx={7} cy={17.5} r={1.8} /><Circle {...p} cx={17.5} cy={17.5} r={1.8} /></>}
      {name === 'cash' && <><Rect {...p} x={3} y={6.5} width={18} height={11} rx={1.5} /><Circle {...p} cx={12} cy={12} r={2.6} /></>}
      {name === 'whatsapp' && <><Path {...p} d="M4 20l1.3-4A8.3 8.3 0 1112 20.3a8.4 8.4 0 01-4-1l-4 .7z" /><Path {...p} d="M9.2 8.3c.2-.4.6-.4.8 0l.7 1.6c.1.3 0 .5-.2.7l-.5.5c.6 1.2 1.6 2.2 2.9 2.9l.5-.5c.2-.2.4-.3.7-.2l1.6.7c.4.2.4.6 0 .8-.6.6-1.5.9-2.3.5a8 8 0 01-4.2-4.2c-.4-.8-.1-1.7.5-2.3" /></>}
      {name === 'phone' && <Path {...p} d="M6.5 3.5h3l1.5 4-2 1.5a10 10 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5.5a2 2 0 012-2z" />}
      {name === 'ruler' && <><Path {...p} d="M3.5 15.5l12-12 5 5-12 12z" /><Path {...p} d="M7 12l1.8 1.8M9.5 9.5l1.8 1.8M12 7l1.8 1.8" /></>}
      {name === 'check' && <Path {...p} d="M5 12.5l4.5 4.5L19 7.5" />}
      {name === 'filter' && <><Path {...p} d="M4 7h10M18 7h2M4 17h4M12 17h8" /><Circle {...p} cx={16} cy={7} r={2} /><Circle {...p} cx={10} cy={17} r={2} /></>}
    </Svg>
  );
}
