# ZAYOU — application mobile (iPhone + Android)

Application **Expo / React Native** branchée sur la boutique Shopify **zayou-5.myshopify.com** (Storefront API).
Produits, prix, stocks, pointures et collections viennent de Shopify en direct. Le paiement se fait sur la **page de paiement Shopify** (paiement à la livraison compris) : chaque commande arrive dans l'admin Shopify comme une commande du site.

## Lancer l'application
```bash
npm install
npx expo start          # QR code : ouvrir avec Expo Go (Android) ou l'appareil photo (iPhone)
npx expo start --web    # version navigateur, http://localhost:8081
```
Le téléphone doit être sur le **même Wi-Fi** que l'ordinateur.

## Vérifications
| Commande | Rôle |
|---|---|
| `npx tsc --noEmit` | types |
| `npx eslint src` | lint |
| `npx expo-doctor` | configuration Expo |
| `node scripts/flows.js` | 23 tests de bout en bout sur la version web (serveur sur :8090), jusqu'à la page de paiement Shopify, sans passer de commande |

## Contenu
Les textes, choix de produits et photos (accueil, guide des pointures, FAQ, entretien, inspirations, à propos) sont **générés depuis le thème Shopify** :
`node scripts/gen-content.js` (lit `../zayou-redesign/theme/templates`). Les coloris viennent de `src/content/colorways.json` (copie de `zayou-redesign/data/colorways.json`).

## Réglages (`app.json › expo.extra`)
- `shopDomain` : `zayou-5.myshopify.com`
- `storefrontToken` : vide = accès sans jeton (suffisant pour tester). Pour la production, coller le **jeton public Storefront** du canal *Headless* de Shopify (limites de requêtes plus élevées).
- Identifiants : `ma.zayou.app` (iOS et Android).

## Comptes clients (inscription / connexion natives)
Écrans ZAYOU : **S’inscrire** (prénom, nom, e-mail, mot de passe) et **Se connecter** (e-mail, mot de passe), code à 6 chiffres envoyé par e-mail pour confirmer l’adresse et pour « mot de passe oublié ».
Le serveur `server/` (Vercel, sans dépendance ni base de données) gère les mots de passe (scrypt) dans un métachamp privé du client Shopify (`zayou_app.auth`) et lit les commandes / adresses avec l’Admin API.
- Client inconnu → créé dans Shopify (tag `app-zayou`) ; client existant (ex. commande passée sur le site) → rattaché **après** confirmation de l’e-mail.
- Commandes : celles du client Shopify (même e-mail) ; le panier de l’app envoie l’e-mail du client connecté au checkout.
- Sessions : jeton signé 30 jours, révoqué au changement de mot de passe ; blocage 15 min après 8 essais ratés.

Variables d’environnement du serveur (Vercel) :
| Nom | Valeur |
|---|---|
| `AUTH_SECRET` | 64 caractères aléatoires |
| `SHOPIFY_SHOP` | `zayou-5` |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | app du Dev Dashboard (scopes `read_customers`, `write_customers`, `read_orders`) installée sur la boutique |
| `RESEND_API_KEY` / `MAIL_FROM` | envoi des codes (ex. `zayou <compte@zayou.ma>`) |

Puis `app.json › expo.extra.apiUrl` = URL du serveur.
Tests : `node --test server/test/auth.test.js` (logique, Shopify simulé) ; `node server/test/mock-server.js` + `node scripts/account-flows.js` (écrans, apiUrl → http://localhost:8787 le temps du test).

## Structure
```
src/app/(tabs)/       Accueil, Boutique, Recherche, Panier, Compte
src/app/compte/       connexion, inscription, code, mot de passe oublié, profil, commandes, adresses
src/app/favoris.tsx   favoris
src/app/collection/   catégories (filtre pointure, en stock, tri — sur l'appareil)
src/app/produit/      fiche produit (photos originales, coloris, pointures, ajout au panier)
src/app/page/         pages d'info (mêmes contenus que le site)
src/lib/shopify.ts    client Storefront API (produits, collections, recherche, panier)
src/lib/account.ts    client de l’API compte ZAYOU (server/)
server/               API Vercel : inscription, connexion, codes, commandes, adresses, suppression
src/state/            panier (Shopify), compte, favoris, pointure mémorisée
src/components/       sections, cartes produit, sélecteur de pointure, ajout rapide
```
