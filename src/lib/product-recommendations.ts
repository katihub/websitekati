import type { OffreMarketplace } from './marketplace-data'

/** La découverte commence dans la boutique choisie, puis dans la même catégorie. */
export function selectShopRecommendations(offers: OffreMarketplace[], shopSlug: string, productSlug: string, category: string | null): OffreMarketplace[] {
  const seen = new Set<string>()
  return offers
    .filter(offer => offer.boutique.slug === shopSlug && offer.produit.slug !== productSlug && offer.disponible > 0)
    .sort((a, b) => Number(b.produit.categorie === category) - Number(a.produit.categorie === category))
    .filter(offer => {
      if (seen.has(offer.produit.slug)) return false
      seen.add(offer.produit.slug)
      return true
    })
    .slice(0, 4)
}
