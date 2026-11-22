'use client'

import { connexionLocaleActive, sessionLocale } from './connexion-locale'
import { supabase } from './supabase'

/**
 * L'APPEL AU BACKEND.
 *
 * IL RECUPERE LE JETON AU MOMENT DE L'APPEL, ET NON AU MONTAGE DU COMPOSANT.
 * Un jeton Supabase vit une heure et se rafraichit tout seul; celui qu'un
 * composant a capture au montage peut donc etre perime quand l'utilisateur
 * clique enfin sur « Commander ». `getSession()` rend celui du moment, et
 * declenche le rafraichissement s'il le faut.
 *
 * ON N'ENVOIE JAMAIS DE PRIX. Le corps d'une commande porte des slugs et des
 * quantites; c'est le backend qui relit les prix en base. Le panier local
 * capture son prix a l'ajout, ce qui est le bon compromis tant que rien n'est
 * encaisse, mais quatre prix ont bouge en trois jours dans ce catalogue: le
 * jour ou un franc est preleve, cet instantane devient une erreur de
 * facturation.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export const apiDisponible = Boolean(BASE)
export const EVENEMENT_SESSION_INVALIDE = 'katimarket:session-invalide'

export class ErreurApi extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'ErreurApi'
  }
}

interface Options {
  methode?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  corps?: unknown
  /**
   * Cle d'idempotence, a generer AU MONTAGE DU FORMULAIRE et non au clic.
   * Generee au clic elle serait differente a chaque clic, donc ne protegerait
   * de rien: c'est exactement le double clic qu'on veut absorber.
   */
  cleIdempotence?: string
  signal?: AbortSignal
  /**
   * LA CLE D'UNE COMMANDE PASSEE SANS COMPTE, rendue a sa creation. Elle part
   * dans l'en-tete `X-Jeton-Suivi`, jamais dans l'URL de l'API : elle ouvre la
   * commande, et une URL finit dans les journaux du serveur. Avec elle, la
   * session n'est pas envoyee — cette commande n'appartient a aucun compte.
   */
  jetonSuivi?: string
  /** Sans l'en-tete d'identite : la commande sans compte refuse un appelant connecte. */
  anonyme?: boolean
}

export type ProgressionEnvoi = { charges: number; total: number; pourcentage: number }
export type OptionsTeleversement = {
  signal?: AbortSignal
  delaiMs?: number
  onProgression?: (progression: ProgressionEnvoi) => void
}

/**
 * L'en-tete d'identite du client connecte, vide pour un visiteur anonyme.
 *
 * EXPORTE PARCE QU'UN APPEL NE PASSE PAS TOUJOURS PAR `api()`. Les routes de
 * l'assistant passent par un proxy de la vitrine (la liste CORS du backend ne
 * porte pas ce domaine) : elles ont besoin du meme jeton, lu au meme moment et
 * de la meme source, sans recopier ce choix entre Supabase et la session locale.
 */
export async function enteteAutorisation(): Promise<Record<string, string>> {
  const client = supabase()
  if (client) {
    const { data } = await client.auth.getSession()
    const jeton = data.session?.access_token
    return jeton ? { Authorization: `Bearer ${jeton}` } : {}
  }
  if (connexionLocaleActive) {
    // Sans Supabase, un poste de developpement porte sa propre session, signee
    // par le backend local. Meme en-tete, meme contrat : rien d'autre ne change.
    const locale = await sessionLocale()
    return locale ? { Authorization: `Bearer ${locale.jeton}` } : {}
  }
  return {}
}

export async function api<T>(chemin: string, options: Options = {}): Promise<T> {
  if (!BASE) {
    throw new ErreurApi(0, "Le service n'est pas configuré")
  }

  const sansSession = options.anonyme || Boolean(options.jetonSuivi)
  const formulaire = typeof FormData !== 'undefined' && options.corps instanceof FormData
  const corpsRequete: BodyInit | undefined = options.corps === undefined
    ? undefined
    : formulaire
      ? options.corps as FormData
      : JSON.stringify(options.corps)

  const construireEntetes = (autorisation: Record<string, string>): Record<string, string> => ({
    Accept: 'application/json',
    ...autorisation,
    ...(options.corps !== undefined && !formulaire ? { 'Content-Type': 'application/json' } : {}),
    ...(options.cleIdempotence ? { 'Cle-Idempotence': options.cleIdempotence } : {}),
    ...(options.jetonSuivi ? { 'X-Jeton-Suivi': options.jetonSuivi } : {}),
  })
  const envoyer = (autorisation: Record<string, string>) => fetch(`${BASE}/v1${chemin}`, {
    method: options.methode ?? 'GET',
    headers: construireEntetes(autorisation),
    body: corpsRequete,
    signal: options.signal,
  })

  let reponse = await envoyer(sansSession ? {} : await enteteAutorisation())
  // Une session peut expirer pendant que l'espace vendeur reste ouvert. Un seul
  // renouvellement, puis une seule nouvelle tentative : jamais de boucle ni de
  // double mutation, puisque le backend refuse le premier appel avant son action.
  if (reponse.status === 401 && !sansSession && !options.signal?.aborted) {
    const client = supabase()
    if (client) {
      try {
        const { data, error } = await client.auth.refreshSession()
        const jeton = data.session?.access_token
        if (!error && jeton) reponse = await envoyer({ Authorization: `Bearer ${jeton}` })
      } catch {
        // Le 401 d'origine reste la reponse utile ; l'interface revient a la connexion.
      }
    }
    if (reponse.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event(EVENEMENT_SESSION_INVALIDE))
  }

  const texte = await reponse.text()
  const donnees = texte ? safeJson(texte) : null

  if (!reponse.ok) {
    // Le message du serveur est preferé quand il existe: il est ecrit pour etre
    // lu par la personne devant l'ecran, alors qu'un « Erreur 409 » ne lui
    // apprend rien de ce qu'elle doit faire.
    const message = extraireMessage(donnees) ?? `Le service a répondu ${reponse.status}`
    throw new ErreurApi(reponse.status, message, donnees)
  }

  return donnees as T
}

/** Multipart suivi octet par octet. XHR est utilise car fetch n'expose pas la progression montante. */
export async function televerserApi<T>(chemin: string, corps: FormData, options: OptionsTeleversement = {}): Promise<T> {
  if (!BASE) throw new ErreurApi(0, "Le service n'est pas configuré")
  const envoyer = (autorisation: Record<string, string>, renouvelerSession: boolean): Promise<T> => new Promise<T>((resoudre, rejeter) => {
    const requete = new XMLHttpRequest()
    const abandonner = () => requete.abort()
    const terminer = () => options.signal?.removeEventListener('abort', abandonner)
    requete.open('POST', `${BASE}/v1${chemin}`)
    requete.timeout = options.delaiMs ?? 120_000
    requete.setRequestHeader('Accept', 'application/json')
    for (const [nom, valeur] of Object.entries(autorisation)) requete.setRequestHeader(nom, valeur)
    requete.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : 0
      options.onProgression?.({ charges: event.loaded, total, pourcentage: total ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0 })
    }
    requete.onload = async () => {
      terminer()
      const donnees = requete.responseText ? safeJson(requete.responseText) : null
      if (requete.status >= 200 && requete.status < 300) resoudre(donnees as T)
      else if (requete.status === 401 && renouvelerSession && !options.signal?.aborted) {
        const client = supabase()
        if (client) {
          try {
            const { data, error } = await client.auth.refreshSession()
            const jeton = data.session?.access_token
            if (!error && jeton) {
              options.onProgression?.({ charges: 0, total: 0, pourcentage: 0 })
              envoyer({ Authorization: `Bearer ${jeton}` }, false).then(resoudre, rejeter)
              return
            }
          } catch {
            // La réponse 401 reste exploitable et l’écran demandera une reconnexion.
          }
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENEMENT_SESSION_INVALIDE))
        rejeter(new ErreurApi(requete.status, extraireMessage(donnees) ?? `Le service a répondu ${requete.status}`, donnees))
      } else rejeter(new ErreurApi(requete.status, extraireMessage(donnees) ?? `Le service a répondu ${requete.status}`, donnees))
    }
    requete.onerror = () => { terminer(); rejeter(new ErreurApi(0, 'La connexion a été interrompue pendant l’envoi.')) }
    requete.ontimeout = () => { terminer(); rejeter(new ErreurApi(0, 'L’envoi prend trop de temps. Vérifiez votre connexion puis reprenez-le.')) }
    requete.onabort = () => { terminer(); rejeter(new DOMException('Envoi annulé', 'AbortError')) }
    if (options.signal?.aborted) {
      terminer()
      rejeter(new DOMException('Envoi annulé', 'AbortError'))
      return
    }
    options.signal?.addEventListener('abort', abandonner, { once: true })
    requete.send(corps)
  })
  return envoyer(await enteteAutorisation(), true)
}

/** `jetonSuivi` : le document d'un devis ou d'une commande sans compte, ouvert par son lien. */
export async function telechargerApi(chemin: string, nom: string, options: { jetonSuivi?: string } = {}): Promise<void> {
  if (!BASE) throw new ErreurApi(0, "Le service n'est pas configure")
  const reponse = await fetch(`${BASE}/v1${chemin}`, { headers: options.jetonSuivi ? { 'X-Jeton-Suivi': options.jetonSuivi } : await enteteAutorisation() })
  if (!reponse.ok) {
    const donnees = safeJson(await reponse.text())
    throw new ErreurApi(reponse.status, extraireMessage(donnees) ?? `Le service a repondu ${reponse.status}`)
  }
  const url = URL.createObjectURL(await reponse.blob())
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

function extraireMessage(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const m = (d as { message?: unknown }).message
  if (typeof m === 'string') return m
  // La validation de Nest rend un tableau de messages: on prend le premier,
  // parce qu'en afficher cinq d'un coup ne se lit pas.
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0]
  return null
}
