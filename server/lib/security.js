// Password hashing (scrypt), short codes, and signed session tokens (HS256 JWT) — Node crypto only.
const crypto = require('crypto');

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}
function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, N, r, p, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash, 'base64');
  const got = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(got, expected);
}

/** 6-digit code; only its hash is stored. */
function newCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
const hashCode = (code, email) => crypto.createHmac('sha256', secret()).update(`${email}:${code}`).digest('base64url');
const sameHash = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET missing or too short (32+ chars)');
  return s;
}
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function signToken(payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(body)}`;
  return `${data}.${crypto.createHmac('sha256', secret()).update(data).digest('base64url')}`;
}
function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const sig = crypto.createHmac('sha256', secret()).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!sameHash(sig, parts[2])) return null;
  try { const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); return body.exp > Date.now() / 1000 ? body : null; } catch { return null; }
}

/** Password rules shown in the app: 8+ characters with at least one letter and one digit. */
function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (pw.length > 128) return 'Le mot de passe est trop long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  return null;
}
const normEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

module.exports = { hashPassword, verifyPassword, newCode, hashCode, sameHash, signToken, verifyToken, passwordProblem, normEmail, validEmail };
