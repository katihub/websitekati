/**
 * CE QU'ANNONCE UNE BOUTIQUE QUI NE SUIT PAS SON STOCK. L'API la dit disponible
 * a 9 999 unites : ses offres restent commandables et elle confirme, ou refuse,
 * chaque ligne a la commande (la ligne refusee est remboursee).
 */
export const STOCK_NON_SUIVI = 9999

export const surCommande = (disponible: number | null | undefined) => (disponible ?? 0) >= STOCK_NON_SUIVI

/** Message d'urgence discret, uniquement pour les quantites réellement suivies sous cinq unités. */
export function libelleStockFaible(disponible: number | null | undefined, en = false): string | null {
  if (!disponible || disponible >= 5 || surCommande(disponible)) return null
  return en ? `Only ${disponible} left in stock` : `Plus que ${disponible} en stock`
}

/** La quantite minimale d'une offre (MOQ), 1 par defaut. */
export const minimumDe = (offre: { quantiteMinimale?: number | null } | null | undefined) => Math.max(1, offre?.quantiteMinimale ?? 1)

/** Ce qu'on dit du stock a un client, sans jamais lui montrer 9 999. */
export function libelleDisponibilite(disponible: number | null | undefined) {
  if (surCommande(disponible)) return 'Disponible : la boutique confirme votre commande'
  return disponible ? `${disponible} unité(s) disponible(s)` : 'Hors stock'
}

/**
 * LES TROIS STATUTS DE STOCK (6 novembre 2026), choisis par la boutique : « En
 * stock » et « En reapprovisionnement » se commandent, « Hors stock » se voit
 * sans s'acheter.
 */
export type StatutStock = 'en_stock' | 'reapprovisionnement' | 'rupture'
export const STATUTS_STOCK: readonly StatutStock[] = ['en_stock', 'reapprovisionnement', 'rupture']

export function libelleStatutStock(statut: StatutStock | null | undefined, en = false): string {
  if (statut === 'rupture') return en ? 'Out of stock' : 'Hors stock'
  if (statut === 'reapprovisionnement') return en ? 'Restocking' : 'En réapprovisionnement'
  return en ? 'In stock' : 'En stock'
}
