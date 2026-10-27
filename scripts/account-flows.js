// UI test of the native account screens against the LOCAL mock API (server/test/mock-server.js on :8787, app.json apiUrl → it).
// node scripts/account-flows.js
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8090'; const API = 'http://localhost:8787';
const results = []; let fails = 0;
const ok = (n, c, info = '') => { results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${info ? '  — ' + info : ''}`); if (!c) fails++; };
const code = async email => (await (await fetch(`${API}/__test/code?email=${encodeURIComponent(email)}`)).json()).code;

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const text = () => p.evaluate(() => document.body.innerText);
  const email = `amine.${Date.now()}@example.com`;

  await p.goto(BASE + '/compte', { waitUntil: 'networkidle', timeout: 120000 }); await p.waitForTimeout(2500);
  ok('Compte: two buttons « Se connecter » and « S’inscrire »', (await p.getByRole('button', { name: 'Se connecter' }).count()) > 0 && (await p.getByRole('button', { name: 'S’inscrire' }).count()) > 0);

  // sign up
  await p.getByRole('button', { name: 'S’inscrire' }).click(); await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Créer mon compte' }).click(); await p.waitForTimeout(400);
  ok('Sign-up: empty form shows a message', /Merci de remplir tous les champs/.test(await text()));
  await p.getByRole('textbox', { name: 'Prénom', exact: true }).fill('Amine'); await p.getByRole('textbox', { name: 'Nom', exact: true }).fill('Test'); await p.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email);
  await p.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill('abc'); await p.getByRole('button', { name: 'Créer mon compte' }).click(); await p.waitForTimeout(400);
  ok('Sign-up: weak password refused', /8 caractères minimum/.test(await text()));
  await p.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill('Zayou2026'); await p.getByRole('button', { name: 'Créer mon compte' }).click();
  await p.getByText('vérifiez vos e-mails').waitFor({ timeout: 10000 }).catch(() => {});
  ok('Sign-up: code screen with the e-mail', /vérifiez vos e-mails/.test(await text()) && (await text()).includes(email));
  await p.getByRole('textbox', { name: 'Code', exact: true }).fill('000000'); await p.getByRole('button', { name: 'Confirmer' }).click(); await p.waitForTimeout(1200);
  ok('Code: wrong code refused', /Code invalide ou expiré/.test(await text()));
  await p.getByRole('textbox', { name: 'Code', exact: true }).fill(await code(email)); await p.getByRole('button', { name: 'Confirmer' }).click();
  await p.getByText('Bonjour Amine').waitFor({ timeout: 10000 }).catch(() => {});
  ok('Code: right code → logged in, « Bonjour Amine »', /Bonjour Amine/.test(await text()) && /Mes commandes/.test(await text()) && /Mes adresses/.test(await text()));

  // profile
  await p.getByRole('link', { name: 'Mes informations' }).click(); await p.waitForTimeout(1200);
  ok('Profile: shows name and e-mail', (await p.getByRole('textbox', { name: 'Prénom', exact: true }).inputValue()) === 'Amine' && (await text()).includes(email));
  await p.goBack(); await p.waitForTimeout(1000);

  // logout / login
  await p.getByRole('button', { name: 'Se déconnecter' }).click(); await p.waitForTimeout(1000);
  ok('Logout: back to the two buttons', (await p.getByRole('button', { name: 'Se connecter' }).count()) > 0);
  await p.getByRole('button', { name: 'Se connecter' }).click(); await p.waitForTimeout(1200);
  await p.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email); await p.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill('Mauvais2026'); await p.getByRole('button', { name: 'Se connecter' }).last().click(); await p.waitForTimeout(1200);
  ok('Login: wrong password → generic message', /E-mail ou mot de passe incorrect/.test(await text()));
  await p.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill('Zayou2026'); await p.getByRole('button', { name: 'Se connecter' }).last().click();
  await p.getByText('Bonjour Amine').waitFor({ timeout: 10000 }).catch(() => {});
  ok('Login: e-mail + password → logged in', /Bonjour Amine/.test(await text()));

  // forgot password
  await p.getByRole('button', { name: 'Se déconnecter' }).click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Se connecter' }).click(); await p.waitForTimeout(1000);
  await p.getByRole('textbox', { name: 'E-mail', exact: true }).fill(email); await p.getByRole('link', { name: 'Mot de passe oublié ?' }).click(); await p.waitForTimeout(1000);
  ok('Forgot: e-mail carried over', (await p.getByRole('textbox', { name: 'E-mail', exact: true }).inputValue()) === email);
  await p.getByRole('button', { name: 'Recevoir un code' }).click(); await p.getByText('nouveau mot de passe').first().waitFor({ timeout: 10000 }).catch(() => {});
  await p.getByRole('textbox', { name: 'Code', exact: true }).fill(await code(email)); await p.getByRole('textbox', { name: 'Nouveau mot de passe', exact: true }).fill('Nouveau2026'); await p.getByRole('button', { name: 'Enregistrer et me connecter' }).click();
  await p.getByText('Bonjour Amine').waitFor({ timeout: 10000 }).catch(() => {});
  ok('Forgot: code + new password → logged in', /Bonjour Amine/.test(await text()));

  await p.screenshot({ path: 'qa/account-in.png' });
  ok('No JavaScript errors', !errs.length, errs.slice(0, 2).join(' | '));
  console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} passed`);
  await b.close(); process.exit(fails ? 1 : 0);
})();
