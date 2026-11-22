const RESEAU = /failed to fetch|network\s?error|load failed|fetch failed|connexion.*(perdue|interrompue)/i
const DELAI = /timeout|timed out|délai.*dépassé|aborted/i
const SERVEUR_TECHNIQUE = /internal server error|erreur interne|service unavailable|bad gateway|gateway timeout|prisma|unique constraint|\bP\d{4}\b|ECONN(?:REFUSED|RESET)/i

/** Transforme une erreur technique en explication lisible et en action concrète. */
export function erreurActionnable(cause: unknown, action = 'Réessayez dans un instant.'): string {
  const brut = cause instanceof Error ? cause.message.trim() : ''
  const horsLigne = typeof navigator !== 'undefined' && navigator.onLine === false

  if (horsLigne || RESEAU.test(brut)) {
    return `La connexion Internet a été interrompue. Vérifiez votre réseau, puis réessayez. ${action}`.trim()
  }
  if (DELAI.test(brut)) {
    return `Le service a mis trop de temps à répondre. Votre action n’est pas perdue. ${action}`.trim()
  }
  const code = cause && typeof cause === 'object' && typeof (cause as { code?: unknown }).code === 'number'
    ? (cause as { code: number }).code
    : null
  if (code !== null) {
    if (code === 0) return `La connexion au service KatiMarket est impossible. Vérifiez votre réseau, puis actualisez la page. ${action}`.trim()
    if (code === 401) return 'Votre session a expiré. Reconnectez-vous, puis reprenez cette action.'
    if (code === 403) return 'Votre compte ne dispose pas de l’autorisation nécessaire. Consultez la vérification de votre boutique ou contactez un gestionnaire.'
    if (code === 413) return `Le fichier est trop volumineux pour être envoyé. Réduisez sa taille, puis réessayez.`
    if (code === 429) return 'Trop de demandes ont été envoyées en peu de temps. Attendez une minute, puis réessayez une seule fois.'
    if (code >= 500 && (!brut || /^le service a répondu/i.test(brut) || SERVEUR_TECHNIQUE.test(brut))) {
      return `Le service KatiMarket est momentanément indisponible. ${action}`.trim()
    }
  }
  return brut || `L’action n’a pas pu aboutir. ${action}`.trim()
}
