/**
 * LES VILLES PROPOSEES A L'INSCRIPTION ET AUX BOUTIQUES.
 *
 * Des suggestions, pas une liste fermee : le champ accepte toute autre ville,
 * parce qu'un client de Mbalmayo ne doit pas mentir pour creer son compte.
 * Douala et Yaounde d'abord, la ou la marketplace livre aujourd'hui.
 */
export const VILLES_CAMEROUN = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Buea', 'Limbé', 'Kribi', 'Edéa', 'Nkongsamba',
  'Dschang', 'Kumba', 'Ebolowa', 'Bertoua', 'Ngaoundéré', 'Garoua', 'Maroua',
] as const

/** Une ville saisie, nettoyee : espaces reduits, 2 a 60 caracteres ; `null` sinon. */
export function villeValide(saisie: string): string | null {
  const ville = saisie.trim().replace(/\s+/g, ' ')
  return ville.length >= 2 && ville.length <= 60 ? ville : null
}
