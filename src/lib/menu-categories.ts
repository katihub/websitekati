/** La colonne de l'accueil garde onze entrees avant le lien vers le catalogue complet. */
export const LIMITE_CATEGORIES_MENU = 11

/**
 * L'API renvoie deja les categories actives dans l'ordre fixe par la direction.
 * Ne jamais les retrier ici : cette selection ne fait que limiter la colonne.
 */
export function categoriesDuMenu<T>(categories: readonly T[]): T[] {
  return categories.slice(0, LIMITE_CATEGORIES_MENU)
}
