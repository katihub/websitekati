import type { Page, Request } from '@playwright/test'

/**
 * LE BACKEND SIMULE, A LA FRONTIERE RESEAU.
 *
 * Chaque test declare les routes qu'il attend. Une requete que personne n'a
 * declaree recoit 501 ET est consignee : `nonPrevues` doit etre vide en fin de
 * test. Sans cette regle, un ecran qui appelle une route renommee passerait au
 * vert en affichant son etat d'erreur.
 */

type Methode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Reponse = { status?: number; body: unknown }
type Gestionnaire = (requete: Request, correspondance: RegExpMatchArray) => Reponse | unknown

interface Route {
  methode: Methode
  motif: RegExp
  gestionnaire: Gestionnaire
}

export interface Appel {
  methode: string
  chemin: string
  corps: unknown
}

export interface ApiSimulee {
  quand(methode: Methode, motif: RegExp, reponse: Gestionnaire | unknown): ApiSimulee
  appels: Appel[]
  nonPrevues: string[]
  erreursNavigateur: string[]
  appelsVers(methode: Methode, motif: RegExp): Appel[]
}

function estReponse(valeur: unknown): valeur is Reponse {
  return Boolean(valeur) && typeof valeur === 'object' && 'body' in (valeur as object) && Object.keys(valeur as object).every((cle) => cle === 'body' || cle === 'status')
}

/** La politique KATI publique : lue par le panier et la fiche produit sur toutes les pages. */
export const POLITIQUE_KATI = {
  version: 1, katiParFcfa: 10, gainClientBps: 100, commissionParrainBps: 50, assiette: 'produits', liberationApresLivraisonJours: 5,
  parrainageDureeMois: 12, depenseMinimumKati: 10_000, depensePlafondBps: 5_000, expirationGainsMois: 12, rechargeActive: false,
  rechargeMinimumFcfa: 1_000, rechargeMaximumFcfa: 500_000,
}

export async function simulerApi(page: Page): Promise<ApiSimulee> {
  // Une route de fond, lue partout : declaree d'office, un test peut la remplacer.
  const routes: Route[] = [
    { methode: 'GET', motif: /^\/marketplace\/kati\/politique$/, gestionnaire: () => POLITIQUE_KATI },
    // Les services du panier : sans assurance ni installation par defaut, un test les active.
    { methode: 'GET', motif: /^\/marketplace\/services-commande\?/, gestionnaire: () => ({ assurance: { active: false, tauxBps: 0 }, installations: [] }) },
  ]
  const appels: Appel[] = []
  const nonPrevues: string[] = []
  const erreursNavigateur: string[] = []

  page.on('pageerror', (erreur) => erreursNavigateur.push(erreur.message))
  page.on('console', (message) => {
    // Une requete simulee en erreur (409, 422) est un cas teste, pas un defaut.
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) erreursNavigateur.push(message.text())
  })

  await page.route(/\/v1\//, async (route) => {
    const requete = route.request()
    const url = new URL(requete.url())
    const chemin = `${url.pathname.replace(/^.*?\/v1/, '')}${url.search}`
    let corps: unknown = null
    try { corps = requete.postDataJSON() } catch { corps = requete.postData() }
    appels.push({ methode: requete.method(), chemin, corps })

    for (const candidate of [...routes].reverse()) {
      if (candidate.methode !== requete.method()) continue
      const correspondance = chemin.match(candidate.motif)
      if (!correspondance) continue
      const resultat = candidate.gestionnaire(requete, correspondance)
      const reponse = estReponse(resultat) ? resultat : { status: 200, body: resultat }
      await route.fulfill({ status: reponse.status ?? 200, contentType: 'application/json', body: JSON.stringify(reponse.body) })
      return
    }
    nonPrevues.push(`${requete.method()} ${chemin}`)
    await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ message: 'route non simulee' }) })
  })

  const api: ApiSimulee = {
    quand(methode, motif, reponse) {
      const gestionnaire: Gestionnaire = typeof reponse === 'function' ? (reponse as Gestionnaire) : () => reponse
      routes.push({ methode, motif, gestionnaire })
      return api
    },
    appels,
    nonPrevues,
    erreursNavigateur,
    appelsVers: (methode, motif) => appels.filter((appel) => appel.methode === methode && motif.test(appel.chemin)),
  }
  return api
}
