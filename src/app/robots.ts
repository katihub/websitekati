import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/compte/',
        '/commande/',
        '/devis/',
        '/marketplace/commande/',
        '/marketplace/apercu/',
        '/panier/',
        '/paiement-plusieurs-fois/',
        '/recherche/',
        '/connexion',
        '/connexion-vendeur',
        '/inscription',
        '/confirmer-courriel/',
        '/nouveau-mot-de-passe/',
        '/reinitialiser-mot-de-passe/',
        '/espace-vendeur/',
        '/espace-livreur/',
        '/hors-ligne/',
      ],
    },
    sitemap: 'https://www.katimarket.com/sitemap.xml',
  }
}
