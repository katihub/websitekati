import { api } from '@/lib/api'

/**
 * LES NOTIFICATIONS DANS L'INTERFACE (BackendKati/src/notifications/notifications-app.service.ts).
 *
 * Une boite par espace : `/notifications-app/client` pour le client, et
 * `/notifications-app/boutiques/<id>` pour chaque boutique dont on est membre.
 * Le lien est un chemin du site (`/commande/KM-…`, `/espace-vendeur?rubrique=…`).
 */
export interface NotificationApp {
  id: string
  type: string
  titre: string
  texte: string
  lien: string | null
  creeLe: string
  lu: boolean
}

export interface PageNotifications {
  elements: NotificationApp[]
  nonLues: number
  suivant: string | null
}

export const BOITE_CLIENT = '/notifications-app/client'
export const boiteBoutique = (boutiqueId: string) => `/notifications-app/boutiques/${encodeURIComponent(boutiqueId)}`

/** Le compteur de la cloche est relu toutes les 30 secondes, et au retour sur l'onglet. */
export const RAFRAICHISSEMENT_CLOCHE_MS = 30_000

export function lireNotifications(boite: string, options: { limite?: number; avant?: string | null; signal?: AbortSignal } = {}) {
  const parametres = new URLSearchParams()
  if (options.limite) parametres.set('limite', String(options.limite))
  if (options.avant) parametres.set('avant', options.avant)
  const requete = parametres.toString() ? `?${parametres}` : ''
  return api<PageNotifications>(`${boite}${requete}`, { signal: options.signal })
}

export const compterNonLues = (boite: string, signal?: AbortSignal) => api<{ nonLues: number }>(`${boite}/compteur`, { signal })
export const marquerLue = (boite: string, id: string) => api<{ nonLues: number }>(`${boite}/${encodeURIComponent(id)}/lue`, { methode: 'POST' })
export const toutMarquerLu = (boite: string) => api<{ nonLues: number }>(`${boite}/tout-lu`, { methode: 'POST' })

/** La pastille ne depasse jamais deux chiffres. */
export const pastille = (nombre: number) => (nombre > 99 ? '99+' : String(nombre))

/** Seul un chemin du site est suivi : un lien qui sortirait du site est ignore. */
export function cheminInterne(lien: string | null): string | null {
  return lien && lien.startsWith('/') && !lien.startsWith('//') ? lien : null
}

/** La rubrique de l'espace vendeur visee par un lien `/espace-vendeur?rubrique=…`. */
export function rubriqueDe(lien: string | null): string | null {
  const chemin = cheminInterne(lien)
  if (!chemin?.startsWith('/espace-vendeur')) return null
  return new URL(chemin, 'https://site.invalid').searchParams.get('rubrique')
}

const UNITES: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60],
]

/** « il y a 5 min », « hier »… ; moins d'une minute se lit « maintenant ». */
export function ilYA(iso: string, locale: string, maintenant: Date = new Date()): string {
  const secondes = Math.round((new Date(iso).getTime() - maintenant.getTime()) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  for (const [unite, taille] of UNITES) {
    if (Math.abs(secondes) >= taille) return format.format(Math.round(secondes / taille), unite)
  }
  return format.format(0, 'second')
}
