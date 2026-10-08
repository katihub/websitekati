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
  const entetes: Record<string, string> = {
    Accept: 'application/json',
    ...(sansSession ? {} : await enteteAutorisation()),
  }

  if (options.corps !== undefined) entetes['Content-Type'] = 'application/json'
  if (options.cleIdempotence) entetes['Cle-Idempotence'] = options.cleIdempotence
  if (options.jetonSuivi) entetes['X-Jeton-Suivi'] = options.jetonSuivi

  const reponse = await fetch(`${BASE}/v1${chemin}`, {
    method: options.methode ?? 'GET',
    headers: entetes,
    body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
    signal: options.signal,
  })

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
