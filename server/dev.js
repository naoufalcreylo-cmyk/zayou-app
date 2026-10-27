// Local server: node dev.js (reads .env.local). MAIL_DEV=1 prints codes in the console instead of e-mailing them.
const fs = require('fs'); const path = require('path');
const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }
const handler = require('./api/index.js');
const port = +process.env.PORT || 8787;
require('http').createServer(handler).listen(port, () => console.log(`API http://localhost:${port}`));
