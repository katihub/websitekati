/** La promesse commune de livraison KatiMarket. */
export const DELAI_LIVRAISON_MAX_JOURS = 3

/**
 * Les anciennes offres peuvent encore porter un délai supérieur en base.
 * La migration les ramène à trois jours ; ce garde-fou évite qu'une ancienne
 * valeur réapparaisse pendant un déploiement progressif.
 */
export function delaiLivraisonMarketplace(delai: number | null | undefined) {
  if (delai === 0) return 0
  if (!Number.isFinite(delai) || delai === null || delai === undefined) return DELAI_LIVRAISON_MAX_JOURS
  return Math.min(DELAI_LIVRAISON_MAX_JOURS, Math.max(0, Math.trunc(delai)))
}

export function libelleDelaiMarketplace(delai: number | null | undefined) {
  const jours = delaiLivraisonMarketplace(delai)
  return jours === 0 ? "Aujourd’hui" : `Sous ${jours} jour${jours > 1 ? 's' : ''} maximum`
}
