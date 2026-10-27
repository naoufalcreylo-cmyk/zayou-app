// Builds src/content/sections.json from the Shopify theme templates (single source of truth for texts and choices).
// node scripts/gen-content.js [path to zayou-redesign/theme]  — re-run after editing the theme templates.
const fs = require('fs'); const path = require('path');
const THEME = path.resolve(process.argv[2] || path.join(__dirname, '../../zayou-redesign/theme'));
const read = f => JSON.parse(fs.readFileSync(path.join(THEME, f), 'utf8').replace(/^﻿/, '').replace(/^\s*\/\*[\s\S]*?\*\//, ''));

// Theme URLs → app routes
function route(u) {
  if (!u) return null;
  u = String(u).trim();
  let m;
  if ((m = u.match(/^shopify:\/\/collections\/(.+)$/)) || (m = u.match(/^\/collections\/([^?#/]+)$/))) return `/collection/${m[1]}`;
  if ((m = u.match(/^\/collections\/vendors\?q=(.+)$/))) return `/collection/vendor:${decodeURIComponent(m[1])}`;
  if ((m = u.match(/^shopify:\/\/pages\/([^#]+)/)) || (m = u.match(/^\/pages\/([^#?]+)/))) return `/page/${m[1]}`;
  if ((m = u.match(/^shopify:\/\/products\/(.+)$/)) || (m = u.match(/^\/products\/([^?#]+)/))) return `/produit/${m[1]}`;
  if ((m = u.match(/^\/search\?q=(.+)$/))) return `/recherche?q=${m[1]}`;
  if (/^https?:\/\//.test(u)) return u;
  if (u.startsWith('/blogs/')) return `https://zayou-5.myshopify.com${u}`;
  return null;
}
// Rich text → paragraphs of plain text (links kept as text)
const paras = html => String(html || '').split(/<\/p>|<br\s*\/?>/).map(s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()).filter(Boolean);
const img = (s, prefix = '') => s[prefix + 'product'] ? { product: s[prefix + 'product'], position: s[prefix + 'image_position'] || 1 } : null;

function convert(section) {
  const s = section.settings || {}; const blocks = (section.block_order || Object.keys(section.blocks || {})).map(k => ({ id: k, ...section.blocks[k] })).filter(b => b && !b.disabled);
  switch (section.type) {
    case 'hero': return { type: 'hero', eyebrow: s.eyebrow, heading: s.heading, text: paras(s.text), image: img(s), image2: img(s, '') && s.product_2 ? { product: s.product_2, position: s.image_position_2 || 1 } : null, alt: s.image_alt, cta: s.button_label, href: route(s.button_link), cta2: s.button2_label, href2: route(s.button2_link) };
    case 'category-tiles': return { type: 'categories', heading: s.heading, items: blocks.map(b => ({ collection: b.settings.collection, label: b.settings.label, image: img(b.settings) })) };
    case 'product-rail': return { type: 'rail', heading: s.heading, products: s.products || [], collection: s.collection, action: s.link_label, href: route(s.link) };
    case 'style-finder': return { type: 'styles', layout: s.layout, heading: s.heading, action: s.link_label, href: route(s.link), items: blocks.map(b => ({ id: b.id, title: b.settings.title, text: paras(b.settings.text), image: { product: b.settings.image_product, position: b.settings.image_position || 1 }, alt: b.settings.image_alt, products: b.settings.products || [], cta: b.settings.link_label, href: route(b.settings.link) })) };
    case 'size-finder': return { type: 'sizeFinder', heading: s.heading, text: paras(s.text) };
    case 'model-spotlight': return { type: 'spotlight', product: s.product, eyebrow: s.eyebrow, heading: s.heading, text: paras(s.text), lineup: s.lineup_position || 0 };
    case 'detail-mosaic': return { type: 'details', heading: s.heading, text: paras(s.text), items: blocks.map(b => ({ product: b.settings.product, position: b.settings.image_position || 1, caption: b.settings.caption, alt: b.settings.image_alt })) };
    case 'brand-intro': return { type: 'brand', eyebrow: s.eyebrow, heading: s.heading, text: paras(s.text), image: img(s), alt: s.image_alt, facts: blocks.map(b => ({ value: b.settings.value, label: b.settings.label })), action: s.link_label, href: route(s.link), surface: !!s.surface };
    case 'link-cards': return { type: 'cards', heading: s.heading, items: blocks.map(b => ({ href: b.settings.page ? `/page/${b.settings.page}` : route(b.settings.link), eyebrow: b.settings.eyebrow, title: b.settings.title, text: b.settings.text, image: img(b.settings), photo: b.settings.photo !== false })).filter(c => c.href) };
    case 'page-hero': return { type: 'pageHero', eyebrow: s.eyebrow, title: s.title, intro: paras(s.intro), image: img(s), alt: s.image_alt };
    case 'content-steps': return { type: 'steps', anchor: s.anchor, eyebrow: s.eyebrow, heading: s.heading, text: paras(s.text), surface: !!s.surface, columns: !!s.columns, items: blocks.map(b => ({ title: b.settings.title, text: paras(b.settings.text), image: img(b.settings), cta: b.settings.link_label, href: route(b.settings.link) })) };
    case 'size-availability': return { type: 'sizes', heading: s.heading, text: paras(s.text), note: paras(s.note), items: blocks.map(b => ({ collection: b.settings.collection, label: b.settings.label })) };
    case 'faq': return { type: 'faq', heading: s.heading, text: paras(s.text), items: blocks.map(b => ({ q: b.settings.question, a: paras(b.settings.answer) })) };
    case 'service-strip': return { type: 'services', items: blocks.map(b => ({ icon: b.settings.icon, title: b.settings.title, text: paras(b.settings.text) })) };
    case 'main-contact': return { type: 'contact' };
    default: return null;
  }
}
const tpl = f => { const t = read(f); return t.order.map(k => t.sections[k]).filter(x => x && !x.disabled).map(convert).filter(Boolean); };

const out = {
  generatedFrom: 'zayou-redesign/theme/templates (' + new Date().toISOString().slice(0, 10) + ')',
  home: tpl('templates/index.json'),
  pages: {
    'a-propos': { title: 'À propos', sections: tpl('templates/page.about.json') },
    'guide-des-pointures': { title: 'Guide des pointures', sections: tpl('templates/page.size-guide.json') },
    entretien: { title: 'Entretien', sections: tpl('templates/page.care.json') },
    inspirations: { title: 'Inspirations', sections: tpl('templates/page.style.json') },
    faq: { title: 'Questions fréquentes', sections: tpl('templates/page.faq.json') },
    contact: { title: 'Contact', sections: tpl('templates/page.contact.json') },
  },
  collections: Object.fromEntries(Object.values(read('templates/collection.json').sections.main.blocks).filter(b => b.type === 'intro').map(b => [b.settings.collection, { title: b.settings.title, text: paras(b.settings.text), image: img(b.settings) }])),
  settings: (() => { const d = read('config/settings_data.json').current; return { whatsapp: d.whatsapp_number, phone: d.phone, delivery: paras(d.pdp_delivery_text), sizes: String(d.size_range || '').split(',').map(x => x.trim()).filter(Boolean) }; })(),
  menu: [['baskets-homme', 'Baskets'], ['mocassins-homme', 'Mocassins'], ['bottines-homme', 'Bottines'], ['sandales-homme', 'Sandales'], ['sabot-homme', 'Sabots'], ['parfums', 'Parfums']],
};
fs.writeFileSync(path.join(__dirname, '../src/content/sections.json'), JSON.stringify(out, null, 1));
console.log('home sections:', out.home.map(s => s.type).join(', '));
for (const [k, p] of Object.entries(out.pages)) console.log(k, '→', p.sections.map(s => s.type).join(', '));
