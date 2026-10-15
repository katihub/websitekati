/**
 * CE QU'ANNONCE UNE BOUTIQUE QUI NE SUIT PAS SON STOCK. L'API la dit disponible
 * a 9 999 unites : ses offres restent commandables et elle confirme, ou refuse,
 * chaque ligne a la commande (la ligne refusee est remboursee).
 */
export const STOCK_NON_SUIVI = 9999

export const surCommande = (disponible: number | null | undefined) => (disponible ?? 0) >= STOCK_NON_SUIVI

/** La quantite minimale d'une offre (MOQ), 1 par defaut. */
export const minimumDe = (offre: { quantiteMinimale?: number | null } | null | undefined) => Math.max(1, offre?.quantiteMinimale ?? 1)

/** Ce qu'on dit du stock a un client, sans jamais lui montrer 9 999. */
export function libelleDisponibilite(disponible: number | null | undefined) {
  if (surCommande(disponible)) return 'Disponible : la boutique confirme votre commande'
  return disponible ? `${disponible} unité(s) disponible(s)` : 'Indisponible'
}
