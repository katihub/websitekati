# NowTech Center — La vitrine

Le site public de la boutique NowTech Center : catalogue, recherche, fiches
produit, panier, devis, commande (avec ou sans compte), paiement mobile et
suivi. Il ne garde presque rien en propre : produits, prix, stock, bannières et
comptoirs viennent de l'API, et les comptes clients de Supabase.

Next.js 16 · React · Tailwind CSS · hébergé sur Vercel

## Le tutoriel

[`documentation/tutoriel-vitrine.pdf`](documentation/tutoriel-vitrine.pdf) :
ce qui se change depuis le panel et ce qui demande une nouvelle version, les
variables, la mise en ligne sur Vercel, le chemin d'un changement jusqu'au site,
et le dépannage. Sa source est `documentation/tutoriel-vitrine.html`.

L'installation complète de la boutique (serveur, API, Supabase, puis cette
vitrine) est décrite par le guide d'installation livré avec l'API
(`livraison/guide-installation.pdf`).

## Les variables

Le modèle commenté est [`.env.example`](.env.example) : l'adresse de l'API,
l'adresse et la clé publique de Supabase, le secret partagé avec l'API, et un
complément facultatif d'adresses d'images. En production, elles se collent dans
Vercel ; le générateur du kit d'installation de l'API les écrit toutes.

## Développer

Il faut Node.js 20.9 ou plus récent.

```bash
npm install
cp .env.example .env.local   # puis le remplir
npm run dev                  # http://localhost:3000
```

Avant de pousser : `npm run typecheck`, `npm run lint` et `npm run build`.
