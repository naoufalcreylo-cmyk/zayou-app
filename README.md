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

## Compte client (Shopify « nouveaux comptes clients »)
Connexion par code e-mail via la **Customer Account API** (OAuth + PKCE, client public). À configurer dans Shopify : *Canaux de vente › Headless › (storefront) › Customer Account API* :
- Type de client : **Public**
- URL de rappel (callback) : **`shop.62344691777.app://callback`**
- Copier le **Client ID** dans `app.json › expo.extra.customerAccountClientId`.

La connexion ne fonctionne pas dans Expo Go (Shopify impose le schéma `shop.62344691777.app`) : il faut une **version de développement** (`npx eas-cli build --profile development`).
Comptes : commandes (suivi via la page de statut Shopify), adresses (ajout, modification, suppression, par défaut), favoris (sur l’appareil), déconnexion, demande de suppression du compte (WhatsApp, à traiter dans l’admin : *Clients › client › Effacer les données personnelles*).

## Structure
```
src/app/(tabs)/       Accueil, Boutique, Recherche, Panier, Compte
src/app/compte/       commandes, détail commande, adresses
src/app/favoris.tsx   favoris
src/app/collection/   catégories (filtre pointure, en stock, tri — sur l'appareil)
src/app/produit/      fiche produit (photos originales, coloris, pointures, ajout au panier)
src/app/page/         pages d'info (mêmes contenus que le site)
src/lib/shopify.ts    client Storefront API (produits, collections, recherche, panier)
src/lib/account.ts    Customer Account API (connexion, commandes, adresses)
src/state/            panier (Shopify), compte, favoris, pointure mémorisée
src/components/       sections, cartes produit, sélecteur de pointure, ajout rapide
```
