// Transactional e-mails (verification and password reset codes) through Resend's HTTP API.
// Env: RESEND_API_KEY, MAIL_FROM (e.g. "zayou <compte@zayou.ma>"). MAIL_DEV=1 logs the code instead (local tests only).
async function sendCode(to, code, purpose) {
  const subject = purpose === 'reset' ? `Votre code pour changer de mot de passe : ${code}` : `Votre code de vérification zayou : ${code}`;
  const intro = purpose === 'reset' ? 'Voici votre code pour choisir un nouveau mot de passe dans l’application zayou :' : 'Bienvenue chez zayou. Voici votre code pour confirmer votre adresse e-mail :';
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#111111">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <p style="font-size:26px;font-weight:600;letter-spacing:-0.5px;margin:0 0 32px">zayou</p>
    <p style="font-size:16px;line-height:24px;margin:0 0 20px">${intro}</p>
    <p style="font-size:34px;font-weight:600;letter-spacing:8px;margin:0 0 20px">${code}</p>
    <p style="font-size:14px;line-height:21px;color:#6A6A66;margin:0">Ce code est valable 15 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
  </div></body></html>`;
  if (process.env.MAIL_DEV === '1' && !process.env.VERCEL) { console.log(`[MAIL_DEV] ${to} ${purpose} code=${code}`); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text: `${intro} ${code}\nCe code est valable 15 minutes.` }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
module.exports = { sendCode };
