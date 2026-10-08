'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import type { PointDeVente } from '@/types/catalogue'

import { useSession } from './session'

/**
 * The customer file.
 *
 * THERE IS NO SERVER BEHIND THIS, AND SAYING SO IS PART OF THE FEATURE. This
 * storefront has no API route that writes, no database, no session cookie and no
 * identity provider, and none is planned in this lot. What follows is therefore
 * not an account system and never pretends to be one.
 *
 * WHAT THE SESSION IS. One JSON object in this browser's `localStorage`, under
 * `nowtech.fiche.v1`, read through `useSyncExternalStore` exactly the way the
 * basket next door is read. It lives on one device, in one browser profile. It
 * does not follow the customer to their phone, it does not survive clearing site
 * data, and two people sharing a machine share the file.
 *
 * WHAT IT DOES NOT DO. It does not authenticate anybody, and it could not: the
 * whole store is readable and writable from the developer console in four
 * seconds. "Signing in" here means filling in a card and keeping it; "signing
 * out" means deleting the card. Nothing in the interface may suggest otherwise,
 * which is why there is no lock, no "forgot your password", and no claim of a
 * secure connection anywhere on the dialog.
 *
 * WHICH IS WHY THERE IS NO PASSWORD FIELD, and that is a security decision
 * rather than a shortcut. A password typed into a form with nothing behind it
 * can only end up in `localStorage`, in plain text, on a shared machine — and
 * the password a customer types into a shop is very often the one they reuse
 * elsewhere. Asking for a secret we cannot protect, cannot verify and do not
 * need is strictly worse than not asking. So the field does not exist, hashed or
 * otherwise: a hash in `localStorage` next to the account it unlocks protects
 * nothing and only makes the pretence look sturdier.
 *
 * WHAT THE FILE IS ACTUALLY FOR, honestly, on this site. Nothing is paid online:
 * the shop is settled in cash at the counter, on delivery, or by Mobile Money
 * against a proforma. So there is no order history to guard and no wallet to
 * protect. What a customer genuinely gains by being known between visits is that
 * the three facts a proforma needs stop being retyped: the name that goes on the
 * document, the WhatsApp number the proforma is sent to, and the counter they
 * collect from. Those three, and the material list that already exists as
 * `lib/cart.tsx`, are the entire contents of an account here.
 */

/**
 * AND THERE IS NO E-MAIL ON THIS CARD, WHICH IS THE SAME DECISION AS THE
 * PASSWORD, TAKEN TWICE. The card used to carry an optional address, collected
 * under the promise "Pour recevoir la proforma en PDF". Nothing in this codebase
 * ever read that field, no route renders a PDF, and no message is sent from
 * anywhere: the proforma is asked for and delivered over WhatsApp, on the number
 * two lines above. A field that collects a real address against a service that
 * does not exist is a promise with a text cursor in it, so it is removed rather
 * than relabelled. {@link parse} drops a stored address on the next read, so the
 * cards written by the previous version shed theirs the first time they are
 * opened, and nothing is left in storage that we cannot account for. If a later
 * lot ever mails a document, the field comes back with the sending.
 */
export interface Account {
  readonly name: string
  /** Normalised to `+237 6XX XX XX XX`. See {@link normalisePhone}. */
  readonly phone: string
  /**
   * The counter's `key`, as `GET /v1/vitrine/points-vente` publishes it and as
   * an order stores it. Not the district: two counters can share one, and Akwa
   * already has two.
   */
  readonly counter: string
}

const STORAGE_KEY = 'nowtech.fiche.v1'
/**
 * The flag lives beside the file rather than inside it, because it has to
 * outlive a sign-out: a customer who closed the invitation and later cleared
 * their file has still been asked once, and asking again on the next page load
 * would be the site nagging.
 */
const GREETED_KEY = 'nowtech.fiche.vu.v1'
const EMPTY = 'null'

/** Long enough for a company name on a proforma, short enough to bound storage. */
const MAX_NAME = 80

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

let fallback = EMPTY
const listeners = new Set<() => void>()

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY
  } catch {
    // Private mode, disabled storage, or a full quota. The file still works for
    // this session; it just will not survive a reload.
    return fallback
  }
}

function writeRaw(account: Account | null): void {
  fallback = account ? JSON.stringify(account) : EMPTY
  try {
    if (account) window.localStorage.setItem(STORAGE_KEY, fallback)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignored for the same reason as above.
  }
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  // Two tabs of the same shop are one customer. Without this, editing the file
  // in one tab leaves the masthead of the other showing the old name.
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

function parse(raw: string): Account | null {
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const { name, phone, counter } = value as Record<string, unknown>
    if (typeof name !== 'string' || typeof phone !== 'string' || typeof counter !== 'string') {
      return null
    }
    if (!name.trim() || !phone.trim()) return null
    // Anything else the stored object happens to carry, an address written by
    // the previous version included, is dropped here rather than carried
    // forward: the file holds the three facts a proforma needs and nothing we
    // have no use for.
    return { name: name.slice(0, MAX_NAME), phone, counter }
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* The invitation flag                                                        */
/* -------------------------------------------------------------------------- */

/** Never call during render: it touches storage, which does not exist on the server. */
export function hasBeenGreeted(): boolean {
  try {
    return window.localStorage.getItem(GREETED_KEY) === '1'
  } catch {
    return false
  }
}

function markGreeted(): void {
  try {
    window.localStorage.setItem(GREETED_KEY, '1')
  } catch {
    // A reader whose storage is refused sees the invitation once per visit
    // rather than once ever, which is the mildest possible failure here.
  }
}

/* -------------------------------------------------------------------------- */
/* Shaping                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A Cameroonian mobile, or nothing.
 *
 * Nine digits beginning with 6, optionally preceded by the country code, in any
 * spacing the customer happens to use: `695549058`, `+237 695 54 90 58`,
 * `00237-695-54-90-58` and `237.695.54.90.58` are the same number and all four
 * are things people actually type. The stored form is one form, so the proforma
 * and the WhatsApp link never have to guess.
 *
 * Landlines (2XX) are deliberately refused. The number on this card is the one
 * the proforma is sent to, and it is sent over WhatsApp.
 */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00237')) digits = digits.slice(5)
  else if (digits.startsWith('237')) digits = digits.slice(3)
  if (!/^6\d{8}$/.test(digits)) return null
  return `+237 ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
}

/** The one word the masthead has room for. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * - `simple` : l'invitation de l'accueil, ou « Mon compte » ; le lien du bas
 *   ferme la fenetre.
 * - `devis` : un devis a envoyer ; sans compte, la fiche nom et numero suit.
 * - `commande` : « Commander » du panier ; toute issue mene a la commande.
 */
export type MotifOuverture = 'simple' | 'devis' | 'commande'

export interface AccountState {
  readonly account: Account | null
  /** The counters the panel publishes, read once by the layout on the server. */
  readonly pointsVente: readonly PointDeVente[]
  readonly isOpen: boolean
  signIn: (fields: Account) => void
  signOut: () => void
  update: (fields: Partial<Account>) => void
  open: () => void
  /**
   * Ouvre la fenetre pour envoyer un devis. La fiche sans compte y sert : le
   * devis part sur WhatsApp avec le nom, le numero et le comptoir.
   */
  openPourDevis: () => void
  /**
   * Ouvre la fenetre depuis « Commander » du panier. Quelle que soit l'issue —
   * connexion, inscription ou « continuer sans compte » —, la fenetre se ferme
   * et le client arrive sur la commande, avec les produits de son panier.
   */
  openPourCommande: () => void
  /** Pourquoi la fenetre est ouverte : c'est ce qui decide de la suite. */
  readonly motif: MotifOuverture
  /** Vrai quand la fenetre propose de continuer sans compte (devis ou commande). */
  readonly sansComptePossible: boolean
  close: () => void
}

const AccountContext = createContext<AccountState | null>(null)

export function AccountProvider({
  children,
  pointsVente,
}: {
  children: ReactNode
  pointsVente: readonly PointDeVente[]
}) {
  // The server snapshot is explicitly "no file", so hydration is safe and the
  // masthead never flashes from "Mon compte" to a first name on the second
  // render the way an effect-based store would.
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY)
  const account = useMemo(() => parse(raw), [raw])

  const [isOpen, setOpen] = useState(false)

  const signIn = useCallback((fields: Account) => {
    writeRaw({
      name: fields.name.trim().slice(0, MAX_NAME),
      phone: fields.phone.trim(),
      counter: fields.counter,
    })
    markGreeted()
    setOpen(false)
  }, [])

  const update = useCallback((fields: Partial<Account>) => {
    // Read through storage rather than through the render's snapshot, so two
    // edits in the same tick do not overwrite one another.
    const current = parse(readRaw())
    if (!current) return
    writeRaw({ ...current, ...fields })
  }, [])

  /* SE DECONNECTER FERME LA SESSION, ET PAS SEULEMENT LA FICHE. Cette
     fonction n'effacait que la fiche de ce navigateur : la session Supabase
     restait ouverte, et le client « deconnecte » pouvait encore commander sous
     son compte (retour du client, 5 octobre). Les deux partent ensemble. */
  const { deconnecter } = useSession()
  const signOut = useCallback(() => {
    writeRaw(null)
    void deconnecter()
  }, [deconnecter])

  // Stable identities: the dialog schedules its own arrival on `open`, and a
  // callback rebuilt on every render would restart that timer on every render.
  const [motif, setMotif] = useState<MotifOuverture>('simple')
  const sansComptePossible = motif !== 'simple'
  const open = useCallback(() => {
    setMotif('simple')
    setOpen(true)
  }, [])
  const openPourDevis = useCallback(() => {
    setMotif('devis')
    setOpen(true)
  }, [])
  const openPourCommande = useCallback(() => {
    setMotif('commande')
    setOpen(true)
  }, [])
  const close = useCallback(() => {
    markGreeted()
    setOpen(false)
  }, [])

  const value = useMemo<AccountState>(
    () => ({
      account,
      pointsVente,
      isOpen,
      signIn,
      signOut,
      update,
      open,
      openPourDevis,
      openPourCommande,
      motif,
      sansComptePossible,
      close,
    }),
    [account, pointsVente, isOpen, signIn, signOut, update, open, openPourDevis, openPourCommande, motif, sansComptePossible, close],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountState {
  const context = useContext(AccountContext)
  if (!context) throw new Error('useAccount doit être appelé dans un AccountProvider')
  return context
}
