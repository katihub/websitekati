'use client'

/**
 * THE LOCAL SIGN-IN, FOR A DEVELOPMENT MACHINE ONLY.
 *
 * WHY IT EXISTS. Customers authenticate with Supabase, in the browser, and a
 * development backend deliberately does not talk to the production instance:
 * a token minted there is signed with a secret this machine does not have, so
 * every authenticated call from a local storefront to a local backend answered
 * 401. The whole purchase path — order, payment, reception — could only be
 * exercised in production.
 *
 * WHAT IT DOES. The backend, when it runs without Supabase, signs its own
 * tokens for any address plus the development password (the admin panel has
 * used that door since day one). This module talks to that door, keeps the
 * pair of tokens in local storage and hands the access token to `api()`,
 * exactly where a Supabase session would.
 *
 * TWO LOCKS, AND BOTH ARE NEEDED. `NEXT_PUBLIC_CONNEXION_LOCALE=1` must be set,
 * AND the build must not be a production one. A Vercel build is always
 * production, so this file is dead code there whatever the variables say; and
 * on a machine it stays off unless someone asks for it by name.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
const CLE = 'nowtech.session-locale.v1'
const EVENEMENT = 'nowtech:session-locale'

export const connexionLocaleActive =
  process.env.NEXT_PUBLIC_CONNEXION_LOCALE === '1' && process.env.NODE_ENV !== 'production'

export interface SessionLocale {
  userId: string
  courriel: string
  jeton: string
  rafraichissement: string
  /** Unix seconds. */
  expireLe: number
}

function lire(): SessionLocale | null {
  if (!connexionLocaleActive || typeof window === 'undefined') return null
  try {
    const brut = window.localStorage.getItem(CLE)
    return brut ? (JSON.parse(brut) as SessionLocale) : null
  } catch {
    return null
  }
}

function ecrire(session: SessionLocale | null) {
  try {
    if (session) window.localStorage.setItem(CLE, JSON.stringify(session))
    else window.localStorage.removeItem(CLE)
  } catch {
    /* private window, blocked storage: the session simply lives in memory. */
  }
  window.dispatchEvent(new Event(EVENEMENT))
}

/** The `sub` of a JWT, read without verifying: the backend verifies, this only labels. */
function sujet(jeton: string): string {
  try {
    const corps = jeton.split('.')[1] ?? ''
    const json = JSON.parse(atob(corps.replace(/-/g, '+').replace(/_/g, '/')))
    return String(json.sub ?? '')
  } catch {
    return ''
  }
}

interface ReponseConnexion {
  access_token: string
  refresh_token: string
  expires_in: number
  message?: string | string[]
}

async function appeler(chemin: string, corps: unknown): Promise<ReponseConnexion> {
  const reponse = await fetch(`${BASE}/v1/auth/${chemin}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(corps),
  })
  const donnees = (await reponse.json().catch(() => ({}))) as ReponseConnexion
  if (!reponse.ok || !donnees.access_token) {
    const m = donnees.message
    throw new Error(Array.isArray(m) ? m[0] : (m ?? `Le service a répondu ${reponse.status}`))
  }
  return donnees
}

export async function seConnecterLocalement(courriel: string, motDePasse: string): Promise<SessionLocale> {
  const d = await appeler('connexion', { email: courriel, motDePasse })
  const session: SessionLocale = {
    userId: sujet(d.access_token),
    courriel,
    jeton: d.access_token,
    rafraichissement: d.refresh_token,
    expireLe: Math.floor(Date.now() / 1000) + d.expires_in,
  }
  ecrire(session)
  return session
}

export function seDeconnecterLocalement() {
  ecrire(null)
}

/**
 * The session of the moment, refreshed when it is about to expire — the same
 * contract `getSession()` offers for a Supabase client, so `api()` needs no
 * special case beyond choosing the source.
 */
export async function sessionLocale(): Promise<SessionLocale | null> {
  const s = lire()
  if (!s) return null
  if (s.expireLe - Math.floor(Date.now() / 1000) > 60) return s
  try {
    const d = await appeler('rafraichir', { refreshToken: s.rafraichissement })
    const neuve: SessionLocale = {
      ...s,
      jeton: d.access_token,
      rafraichissement: d.refresh_token,
      expireLe: Math.floor(Date.now() / 1000) + d.expires_in,
    }
    ecrire(neuve)
    return neuve
  } catch {
    ecrire(null)
    return null
  }
}

/** Synchronous read for the first render; `sessionLocale()` for calls. */
export function sessionLocaleActuelle(): SessionLocale | null {
  return lire()
}

export function surChangementLocal(cb: () => void): () => void {
  window.addEventListener(EVENEMENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENEMENT, cb)
    window.removeEventListener('storage', cb)
  }
}
