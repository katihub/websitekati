/**
 * LES VRAIS AVIS D'UN PRODUIT SUR SA CARTE (9 novembre 2026).
 *
 * Le backend joint la note moyenne et le nombre d'avis « produit » publies.
 * Sans avis, la carte dit « Nouveau » : aucune etoile, aucun nombre invente.
 */
export type AvisProduit = { moyenne: number; nombre: number } | null | undefined

/** Les cinq etoiles d'une note : pleines jusqu'a la note arrondie a l'entier le plus proche. */
export function etoilesNote(moyenne: number): string {
  const pleines = Math.max(0, Math.min(5, Math.round(moyenne)))
  return '★'.repeat(pleines) + '☆'.repeat(5 - pleines)
}

/** Ce que la carte affiche : la note et le nombre d'avis, ou null pour « Nouveau ». */
export function resumeAvis(avis: AvisProduit): { etoiles: string; note: string; nombre: string; libelle: string } | null {
  if (!avis || avis.nombre < 1) return null
  const note = avis.moyenne.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const nombre = `${avis.nombre} avis`
  return { etoiles: etoilesNote(avis.moyenne), note, nombre, libelle: `Note ${note} sur 5, ${nombre}` }
}
