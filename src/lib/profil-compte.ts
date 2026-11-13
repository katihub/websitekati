/**
 * CLIENT OU MARCHAND : CE QUE DIT LA REPONSE DE `/vendeurs/mes-boutiques`.
 *
 * Seul un refus (401, 403) classe le compte client pour de bon. Une API
 * occupee (429), en panne (5xx) ou injoignable ne dit rien du compte : la
 * classer « client » cachait le raccourci « Ma Boutique » au marchand pour toute
 * la visite (signale le 6 novembre 2026). On redemande plutot, apres ces delais.
 */
export type Profil = 'client' | 'marchand'

export const DELAIS_NOUVEL_ESSAI_MS = [1_000, 3_000, 8_000] as const

export function profilDesBoutiques(boutiques: unknown): Profil {
  return Array.isArray(boutiques) && boutiques.length ? 'marchand' : 'client'
}

/**
 * Le profil que fixe une erreur, ou `null` quand il faut redemander.
 *
 * SEUL UN REFUS D'ACCES (403) DIT « CLIENT » (13 novembre 2026). Un 401 dit
 * seulement que le jeton n'est plus accepte : telephone sorti de veille,
 * rafraichissement manque sur un reseau instable, horloge en retard. Le classer
 * client cachait « Ma boutique » a un vendeur pour toute la visite ; on
 * renouvelle la session et on redemande.
 */
export function profilApresErreur(code: number | null): Profil | null {
  return code === 403 ? 'client' : null
}

/** Un 401 : la session doit etre renouvelee avant de redemander. */
export function sessionARenouveler(code: number | null): boolean {
  return code === 401
}
