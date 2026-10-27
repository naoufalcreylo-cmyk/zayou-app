// End-to-end checks of the app (web build, live Shopify data): node scripts/flows.js  (dev server on :8090)
// Stops at Shopify's checkout page: no order is ever placed.
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8090';
const results = []; let fails = 0;
const ok = (n, c, info = '') => { results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${info ? '  — ' + info : ''}`); if (!c) fails++; };

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  // count failed requests from the app itself only (the Shopify checkout page loads its own resources)
  p.on('response', r => { if (r.status() >= 400 && p.url().startsWith(BASE)) errs.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  const text = () => p.evaluate(() => document.body.innerText);

  // home
  await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500);
  const home = await text();
  ok('Home: campaign hero and sections from the theme', /souples, du matin au soir/.test(home) && /par catégorie/.test(home) && /la sélection zayou/.test(home) && /trouvez votre style/.test(home) && /dans le détail/.test(home));
  ok('Home: real products with prices in dh', /Crest - Tabac/.test(home) && /\d+ dh/.test(home));

  // collection with size filter
  await p.goto(BASE + '/collection/baskets-homme', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  const all = (await text()).match(/(\d+) produits?/); const totalAll = all ? +all[1] : 0;
  ok('Collection: lists the baskets', totalAll >= 60, `${totalAll} produits`);
  await p.getByRole('button', { name: 'Disponible en pointure 45' }).click(); await p.waitForTimeout(800);
  const f = (await text()).match(/(\d+) produits?/); const total45 = f ? +f[1] : 0;
  ok('Collection: size chip filters to models in stock in that size', total45 > 0 && total45 < totalAll, `${totalAll} → ${total45} en 45`);

  // product: size required
  await p.goto(BASE + '/produit/crest-tabac', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  const btnLabel = await p.getByRole('button', { name: /Choisir une pointure|Ajouter au panier/ }).last().textContent();
  ok('Product: no size pre-selected (button asks for a size)', /Choisir une pointure/.test(btnLabel));
  await p.getByRole('button', { name: 'Choisir une pointure' }).last().click(); await p.waitForTimeout(600);
  ok('Product: adding without a size shows the size message', /Choisissez votre pointure pour continuer/.test(await text()));
  ok('Product: colourways of the model are listed', (await p.getByRole('button', { name: /Bleu|Kaki|Marron|Noir/ }).count()) >= 3);
  const size = p.getByRole('button', { name: /^Pointure 42/ }); await size.first().click(); await p.waitForTimeout(300);
  ok('Product: choosing 42 switches the button to "Ajouter au panier"', (await p.getByRole('button', { name: 'Ajouter au panier' }).count()) > 0);
  await p.getByRole('button', { name: 'Ajouter au panier' }).last().click();
  const toast = await p.getByText('Ajouté au panier').first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  ok('Product: "Ajouté au panier" confirmation', toast);
  await p.waitForTimeout(1500);

  // cart
  await p.goto(BASE + '/panier', { waitUntil: 'networkidle' }); await p.waitForTimeout(3500);
  const cart = await text();
  ok('Cart: line with product, size 42 and colour', /Crest - Tabac/.test(cart) && /Pointure : 42/.test(cart) && /Tabac/.test(cart));
  await p.getByRole('button', { name: 'Augmenter la quantité' }).first().click(); await p.waitForTimeout(3500);
  ok('Cart: quantity + updates subtotal (2 × 299 dh)', /598 dh/.test(await text()));
  ok('Cart: tab badge shows the item count', (await p.getByRole('tab', { name: /Panier, 2 articles/ }).count() + await p.getByRole('button', { name: /Panier, 2 articles/ }).count() + await p.getByRole('link', { name: /Panier, 2 articles/ }).count()) > 0);
  await Promise.all([p.waitForURL(/checkouts?\//, { timeout: 30000 }).catch(() => {}), p.getByRole('button', { name: 'Commander' }).click()]);
  await p.waitForLoadState('domcontentloaded').catch(() => {});
  ok('Checkout: hands off to Shopify checkout (order created in Shopify)', /zayou-5\.myshopify\.com\/checkouts\//.test(p.url()), p.url().replace(/\?.*/, '').replace(/[A-Za-z0-9]{20,}/g, '…'));
  await p.screenshot({ path: 'qa/checkout.png' });

  // pages
  for (const [path, re] of [['/page/guide-des-pointures', /mesurer son pied/], ['/page/faq', /Comment payer ma commande/], ['/page/entretien', /Daim et nubuck/], ['/page/inspirations', /le casual net/], ['/page/a-propos', /marque marocaine/]]) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
    ok(`Page ${path}`, re.test(await text()));
  }
  await p.goto(BASE + '/page/guide-des-pointures', { waitUntil: 'networkidle' }); await p.waitForTimeout(5000);
  ok('Size guide: sizes per category computed from Shopify', /Proposées : 39 · 40 · 41 · 42 · 43/.test(await text()));

  // search
  await p.goto(BASE + '/recherche', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.getByLabel('Rechercher').fill('crest'); await p.waitForTimeout(3500);
  ok('Search: finds the Crest models', /Crest - Kaki/.test(await text()));
  await p.getByLabel('Rechercher').fill('zzzzqq'); await p.waitForTimeout(3500);
  ok('Search: helpful empty state', /Aucun résultat pour « zzzzqq »/.test(await text()));

  // clean the test cart
  await p.goto(BASE + '/panier', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
  while (await p.getByRole('button', { name: /^Retirer/ }).count()) { await p.getByRole('button', { name: /^Retirer/ }).first().click(); await p.waitForTimeout(2500); }
  ok('Cart: remove empties the cart', /Votre panier est vide/.test(await text()));

  ok('No JavaScript errors', !errs.length, errs.slice(0, 3).join(' | '));
  console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} passed`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
