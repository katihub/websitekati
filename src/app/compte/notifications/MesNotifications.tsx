'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LigneNotification } from '@/components/notifications/ClocheNotifications'
import { ErreurApi, apiDisponible } from '@/lib/api'
import { useAccount } from '@/lib/account'
import { useMarketplaceLanguage } from '@/lib/language'
import { BOITE_CLIENT, cheminInterne, lireNotifications, marquerLue, toutMarquerLu, type NotificationApp } from '@/lib/notifications'
import { useSession } from '@/lib/session'

type Etat =
  | { phase: 'chargement' }
  | { phase: 'refus'; message: string }
  | { phase: 'prete'; notifications: NotificationApp[]; nonLues: number; suivant: string | null }

/** L'HISTORIQUE DE LA CLOCHE DU CLIENT : du plus recent au plus ancien, vingt a la fois. */
export function MesNotifications() {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const router = useRouter()
  const { session, chargement } = useSession()
  const { open: ouvrirCompte } = useAccount()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const [suite, setSuite] = useState(false)

  useEffect(() => {
    if (!apiDisponible || chargement || !session) return
    const controleur = new AbortController()
    lireNotifications(BOITE_CLIENT, { limite: 20, signal: controleur.signal })
      .then((page) => { if (!controleur.signal.aborted) setEtat({ phase: 'prete', notifications: page.elements, nonLues: page.nonLues, suivant: page.suivant }) })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        setEtat({ phase: 'refus', message: e instanceof ErreurApi ? e.message : en ? 'Your notifications could not be loaded.' : 'Vos notifications n’ont pas pu être chargées.' })
      })
    return () => controleur.abort()
  }, [session, chargement, en])

  if (chargement || (session && etat.phase === 'chargement')) return <p className="text-small text-ink-3" role="status">{en ? 'Loading…' : 'Chargement…'}</p>

  if (!session) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">{en ? 'Sign in to view your notifications.' : 'Connectez-vous pour retrouver vos notifications.'}</p>
      <button type="button" onClick={ouvrirCompte} className="press fill mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)]">
        {en ? 'Sign in' : 'Se connecter'}
      </button>
    </div>
  }

  if (etat.phase === 'refus') return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink" role="alert">{etat.message}</p></div>
  if (etat.phase !== 'prete') return null

  const ouvrir = (notification: NotificationApp) => {
    if (!notification.lu) {
      setEtat({ ...etat, nonLues: Math.max(0, etat.nonLues - 1), notifications: etat.notifications.map((n) => (n.id === notification.id ? { ...n, lu: true } : n)) })
      void marquerLue(BOITE_CLIENT, notification.id).catch(() => undefined)
    }
    const chemin = cheminInterne(notification.lien)
    if (chemin) router.push(chemin)
  }

  const toutLire = () => {
    setEtat({ ...etat, nonLues: 0, notifications: etat.notifications.map((n) => ({ ...n, lu: true })) })
    void toutMarquerLu(BOITE_CLIENT).catch(() => undefined)
  }

  const plus = async () => {
    setSuite(true)
    try {
      const page = await lireNotifications(BOITE_CLIENT, { limite: 20, avant: etat.suivant })
      setEtat({ ...etat, notifications: [...etat.notifications, ...page.elements], suivant: page.suivant })
    } catch { /* la page reste telle quelle ; le bouton permet de reessayer */ } finally { setSuite(false) }
  }

  return <div className="grid gap-4" data-testid="mes-notifications">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-small text-ink-3">{etat.nonLues ? (en ? `${etat.nonLues} unread` : `${etat.nonLues} non lue(s)`) : en ? 'Everything is read.' : 'Tout est lu.'}</p>
      {etat.nonLues ? <button type="button" onClick={toutLire} className="text-small font-bold text-secondary underline underline-offset-2" data-testid="notifications-tout-lu">
        {en ? 'Mark all as read' : 'Tout marquer comme lu'}
      </button> : null}
    </div>
    {etat.notifications.length
      ? <div className="grid gap-1 rounded-well border border-rule bg-surface p-1.5">{etat.notifications.map((n) => <LigneNotification key={n.id} notification={n} locale={locale} onOuvrir={ouvrir} />)}</div>
      : <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{en ? 'No notification yet. Your orders, quotes and refunds will show up here.' : 'Aucune notification pour l’instant. Vos commandes, devis et remboursements s’afficheront ici.'}</p></div>}
    {etat.suivant ? <button type="button" onClick={() => void plus()} disabled={suite} className="justify-self-center rounded-control border border-rule px-5 py-2.5 text-small font-bold text-ink disabled:opacity-60" data-testid="notifications-plus">
      {suite ? (en ? 'Loading…' : 'Chargement…') : en ? 'Show older notifications' : 'Voir les notifications plus anciennes'}
    </button> : null}
  </div>
}
