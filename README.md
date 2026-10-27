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

## Structure
```
src/app/(tabs)/       Accueil, Boutique, Recherche, Panier, Infos
src/app/collection/   catégories (filtre pointure, en stock, tri — sur l'appareil)
src/app/produit/      fiche produit (photos originales, coloris, pointures, ajout au panier)
src/app/page/         pages d'info (mêmes contenus que le site)
src/lib/shopify.ts    client Storefront API (produits, collections, recherche, panier)
src/state/            panier (Shopify) et pointure mémorisée
src/components/       sections, cartes produit, sélecteur de pointure, ajout rapide
```
