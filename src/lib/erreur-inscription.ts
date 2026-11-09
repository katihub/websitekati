/**
 * UN VRAI MESSAGE A LA PLACE DE « FAILED TO FETCH » (9 novembre 2026).
 *
 * Quand le navigateur ne recoit aucune reponse lisible (connexion coupee, envoi
 * trop long, requete bloquee en route), fetch leve une erreur generique dont le
 * texte depend du navigateur : « Failed to fetch » (Chrome), « Load failed »
 * (Safari), « NetworkError… » (Firefox). Supabase l'enveloppe dans une
 * AuthRetryableFetchError. Le candidat ne peut rien en faire : on lui dit ce qui
 * s'est passe, si sa candidature est enregistree, et quoi faire.
 *
 * Une erreur 4xx du serveur garde son message, ecrit pour etre lu.
 */
export type EtapeInscription = 'candidature' | 'acces'

const RESEAU = /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_network|err_connection|err_internet|timed? ?out/i

function code(cause: unknown): number | null {
  const valeur = (cause as { code?: unknown; status?: unknown } | null)
  if (typeof valeur?.code === 'number') return valeur.code
  if (typeof valeur?.status === 'number') return valeur.status
  return null
}

/** Aucune reponse lisible : la requete n'a pas abouti, ou sa reponse a ete perdue en route. */
export function estErreurReseau(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false
  if (cause.name === 'AuthRetryableFetchError' || cause.name === 'AbortError') return true
  if (code(cause) === 0) return true
  return RESEAU.test(cause.message)
}

export function messageErreurInscription(cause: unknown, etape: EtapeInscription): string {
  const statut = code(cause)
  if (estErreurReseau(cause)) {
    return etape === 'candidature'
      ? 'La connexion a été interrompue pendant l’envoi : votre candidature n’a pas été enregistrée. Vérifiez votre connexion internet puis appuyez de nouveau sur « Envoyer ma candidature ». Si vous avez joint une photo, une image plus légère passe plus facilement.'
      : 'Votre candidature est bien enregistrée, mais la connexion a été interrompue pendant la création de votre accès. Vérifiez votre connexion internet puis appuyez sur « Réessayer la création du compte ».'
  }
  if (statut === 429) {
    return 'Trop de tentatives en peu de temps. Patientez une minute avant de réessayer.'
  }
  if (statut !== null && statut >= 500) {
    return etape === 'candidature'
      ? 'Un problème technique chez KatiMarket a empêché l’enregistrement de votre candidature. Réessayez dans quelques minutes ; si cela continue, contactez-nous.'
      : 'Votre candidature est bien enregistrée, mais un problème technique chez KatiMarket a empêché la création de votre accès. Réessayez dans quelques minutes.'
  }
  const message = cause instanceof Error ? cause.message.trim() : ''
  return message || 'Une erreur est survenue. Réessayez.'
}
