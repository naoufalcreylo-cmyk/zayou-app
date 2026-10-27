// App icons from the supplied ZAYOU logo (assets/brand/logo.png, transparent black wordmark). The logo is only scaled, never redrawn.
// node scripts/icons.js → assets/images/{icon,android-icon-foreground,android-icon-background,android-icon-monochrome,favicon}.png
const { chromium } = require('playwright-core'); const fs = require('fs'); const path = require('path');
const A = path.join(__dirname, '../assets');
(async () => {
  const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(A, 'brand/logo.png')).toString('base64');
  const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
  const out = await p.evaluate(async logo => {
    const img = new Image(); img.src = logo; await img.decode();
    const make = (size, bg, logoWidth, color) => {
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
      if (bg) { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
      const w = logoWidth, h = w * img.height / img.width;
      if (color) { // recolour the wordmark (monochrome icon keeps the shape, alpha only)
        const t = document.createElement('canvas'); t.width = img.width; t.height = img.height; const tx = t.getContext('2d');
        tx.drawImage(img, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = color; tx.fillRect(0, 0, t.width, t.height);
        x.drawImage(t, (size - w) / 2, (size - h) / 2, w, h);
      } else x.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      return c.toDataURL('image/png');
    };
    return {
      icon: make(1024, '#FFFFFF', 720),                          // iOS / generic: full-bleed white square, wordmark 70% wide
      fg: make(1024, null, 560),                                // Android adaptive foreground: inside the 66% safe zone
      bg: make(1024, '#FFFFFF', 0),
      mono: make(1024, null, 560, '#000000'),
      favicon: make(196, '#FFFFFF', 160),
    };
  }, logo);
  const save = (n, d) => fs.writeFileSync(path.join(A, 'images', n), Buffer.from(d.split(',')[1], 'base64'));
  save('icon.png', out.icon); save('android-icon-foreground.png', out.fg); save('android-icon-background.png', out.bg); save('android-icon-monochrome.png', out.mono); save('favicon.png', out.favicon);
  console.log('icons written'); await b.close();
})();
