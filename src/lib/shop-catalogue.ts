import type { OffreBoutiqueMarketplace } from './marketplace-data'

export type ShopSort = 'recent' | 'prix_asc' | 'prix_desc'
export function hasShopDiscount(offer: OffreBoutiqueMarketplace): boolean {
  return offer.prixFcfa !== null && offer.prixReferenceFcfa !== null && offer.prixReferenceFcfa > offer.prixFcfa
}

export function filterShopOffers(offers: OffreBoutiqueMarketplace[], { query = '', category = '', promotions = false, sort = 'recent' }: { query?: string; category?: string; promotions?: boolean; sort?: ShopSort } = {}): OffreBoutiqueMarketplace[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim()
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const filtered = offers.filter(offer => {
    const text = normalize([offer.titre, offer.produit.nom, offer.produit.marque, offer.produit.categorie].filter(Boolean).join(' '))
    return offer.disponible > 0 && (!category || offer.produit.categorie === category) && (!promotions || hasShopDiscount(offer)) && terms.every(term => text.includes(term))
  })
  if (sort !== 'recent') filtered.sort((a, b) => {
    if (a.prixFcfa === null) return b.prixFcfa === null ? 0 : 1
    if (b.prixFcfa === null) return -1
    return sort === 'prix_asc' ? a.prixFcfa - b.prixFcfa : b.prixFcfa - a.prixFcfa
  })
  return filtered
}
