/**
 * LES ADRESSES DE L'ANNUAIRE DES BOUTIQUES (page, recherche, ville).
 *
 * Sans import, pour etre testee par `node --test` sans resolveur d'alias.
 */

/** L'adresse d'une page de l'annuaire, avec la recherche et la ville en cours. */
export function adresseAnnuaire(chemin: string, { page, recherche, ville }: { page?: number; recherche?: string; ville?: string }) {
  const query = new URLSearchParams()
  if (recherche?.trim()) query.set('q', recherche.trim())
  if (ville) query.set('ville', ville)
  if (page && page > 1) query.set('page', String(page))
  const texte = query.toString()
  return texte ? `${chemin}?${texte}` : chemin
}

/** Les numeros affiches : la premiere, la derniere, et les voisines de la page courante. */
export function numerosDePage(page: number, pages: number) {
  return [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
}
