// node scripts/shot.js <path> [out.png] [--full] — phone-sized screenshot of the web build (390×844, touch)
const { chromium } = require('playwright-core');
(async () => {
  const args = process.argv.slice(2); const full = args.includes('--full'); const [p = '/', out = 'qa/shot.png'] = args.filter(a => !a.startsWith('--'));
  const b = await chromium.launch({ channel: 'chrome' });
  const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.goto('http://localhost:8090' + p, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2500);
  require('fs').mkdirSync(require('path').dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: full });
  console.log(out, errs.length ? 'ERRORS: ' + errs.slice(0, 4).join(' | ') : 'no errors');
  await b.close();
})();
