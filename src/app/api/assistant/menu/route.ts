import { NextResponse } from 'next/server'
import { entetesLectureCommune } from '@/lib/appel-backend'

/**
 * L'ARBRE DU MENU GUIDÉ, RELAYÉ COMME SES DEUX VOISINES.
 *
 * Même raison de passer par le serveur : la liste CORS du backend ne porte
 * pas ce domaine, un appel depuis le navigateur serait refusé avant de
 * partir, et l'adresse de l'API reste côté serveur.
 *
 * CELLE-CI SE MET EN CACHE, ET LES DEUX AUTRES NON. Une question est
 * personnelle et datée ; un arbre de navigation est le même pour tout le
 * monde et change quand une fiche change. Cinq minutes de cache épargnent
 * autant d'allers-retours à chaque ouverture du panneau.
 *
 * LA CONTREPARTIE EST ASSUMÉE : une fiche désactivée depuis le panel peut
 * rester proposée pendant cinq minutes. Le service la rattrape — une clé
 * inconnue retombe sur le langage naturel appliqué au libellé du bouton —
 * donc le pire cas est une réponse approchante, jamais une erreur.
 *
 * UN ÉCHEC REND UN ARBRE VIDE, PAS UNE ERREUR. Sans menu, le panneau doit
 * dégrader vers le champ de saisie seul — c'est-à-dire vers l'interface
 * d'avant, qui fonctionne.
 */

export const runtime = 'nodejs'

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''
const DELAI_MS = 10_000

/** Ce que la vitrine rend quand l'arbre n'est pas joignable. */
function vide() {
  return NextResponse.json({ version: null, racine: 'accueil', noeuds: [] }, { status: 200 })
}

export async function GET() {
  if (!API) return vide()

  try {
    const reponse = await fetch(`${API}/v1/assistant/menu`, {
      headers: entetesLectureCommune(),
      signal: AbortSignal.timeout(DELAI_MS),
      next: { revalidate: 300 },
    })
    if (!reponse.ok) {
      console.error(`[assistant] menu : le backend a répondu ${reponse.status}`)
      return vide()
    }

    return NextResponse.json(await reponse.json(), {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (erreur) {
    console.error(`[assistant] menu injoignable : ${(erreur as Error).message}`)
    return vide()
  }
}
