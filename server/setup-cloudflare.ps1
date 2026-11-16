# One-time Cloudflare setup for the ZAYOU app API (run from the server folder, in a visible PowerShell window).
# Logs in to Cloudflare in the browser, deploys the Worker, then stores the secrets. Values are typed here, never written to a file.
Set-Location $PSScriptRoot
Write-Host "1/3  Connexion a Cloudflare : une page s'ouvre dans le navigateur, cliquez sur Allow." -ForegroundColor Cyan
npx -y wrangler@4 login
Write-Host ""
Write-Host "2/3  Mise en ligne du serveur sur Cloudflare..." -ForegroundColor Cyan
npx -y wrangler@4 deploy
Write-Host ""
Write-Host "3/3  Reglages secrets (copiez chaque valeur depuis Vercel > zayou-app-server > Settings > Environment Variables)." -ForegroundColor Cyan
Write-Host "     Collez avec un clic droit puis Entree. Rien ne s'affiche quand vous collez, c'est normal." -ForegroundColor Cyan
# New random signing secret: app users simply log in again once after the switch.
$bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes) | npx -y wrangler@4 secret put AUTH_SECRET
foreach ($name in 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET', 'RESEND_API_KEY', 'MAIL_FROM') {
  Write-Host ""
  Write-Host "-> $name" -ForegroundColor Yellow
  npx -y wrangler@4 secret put $name
}
Write-Host ""
Write-Host "Termine. Revenez dans VS Code et ecrivez : cloudflare c'est fait" -ForegroundColor Green
