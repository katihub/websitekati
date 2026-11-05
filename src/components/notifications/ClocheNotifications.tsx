'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'

import { useMarketplaceLanguage } from '@/lib/language'
import {
  compterNonLues,
  ilYA,
  lireNotifications,
  marquerLue,
  pastille,
  RAFRAICHISSEMENT_CLOCHE_MS,
  toutMarquerLu,
  type NotificationApp,
} from '@/lib/notifications'
import styles from './cloche-notifications.module.css'

/**
 * LA CLOCHE D'UN ESPACE : le client sur le site, ou une boutique dans l'espace vendeur.
 *
 * Le compteur est relu toutes les 30 secondes et au retour sur l'onglet ; la
 * liste n'est lue qu'a l'ouverture. Ouvrir une notification la marque lue puis
 * passe son lien a `onOuvrir`, qui sait ou aller dans cet espace.
 */
export function ClocheNotifications({ boite, onOuvrir, toutVoir, classeBouton }: {
  boite: string
  onOuvrir: (lien: string | null) => void
  toutVoir?: string
  classeBouton?: string
}) {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const [nonLues, setNonLues] = useState(0)
  const [ouvert, setOuvert] = useState(false)
  const [liste, setListe] = useState<NotificationApp[] | null>(null)
  const [erreur, setErreur] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({})
  const conteneur = useRef<HTMLDivElement>(null)
  const id = useId()

  /** Le panneau s'aligne sur la cloche, ou qu'elle soit, sans jamais sortir de l'ecran (16 px de marge). */
  const basculer = () => {
    const bouton = conteneur.current?.getBoundingClientRect()
    if (!ouvert && bouton) {
      const largeur = Math.min(360, window.innerWidth - 32)
      const gauche = Math.min(Math.max(16, bouton.right - largeur), window.innerWidth - 16 - largeur)
      setPosition({ top: bouton.bottom + 8, left: gauche, width: largeur })
    }
    setOuvert(!ouvert)
  }

  const compter = useCallback(() => {
    compterNonLues(boite).then((r) => setNonLues(r.nonLues)).catch(() => undefined)
  }, [boite])

  useEffect(() => {
    const premier = window.setTimeout(compter, 0)
    const minuterie = window.setInterval(compter, RAFRAICHISSEMENT_CLOCHE_MS)
    const auRetour = () => { if (document.visibilityState === 'visible') compter() }
    document.addEventListener('visibilitychange', auRetour)
    return () => { window.clearTimeout(premier); window.clearInterval(minuterie); document.removeEventListener('visibilitychange', auRetour) }
  }, [compter])

  useEffect(() => {
    if (!ouvert) return
    const controleur = new AbortController()
    lireNotifications(boite, { limite: 8, signal: controleur.signal })
      .then((page) => { setListe(page.elements); setNonLues(page.nonLues); setErreur(false) })
      .catch(() => { if (!controleur.signal.aborted) setErreur(true) })
    const fermer = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !conteneur.current?.contains(event.target as Node)) setOuvert(false)
    }
    // Place sous la cloche a l'ouverture, le panneau se referme si la page bouge.
    const refermer = () => setOuvert(false)
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    window.addEventListener('scroll', refermer, { passive: true })
    window.addEventListener('resize', refermer)
    return () => {
      controleur.abort()
      document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', fermer)
      window.removeEventListener('scroll', refermer); window.removeEventListener('resize', refermer)
    }
  }, [ouvert, boite])

  const ouvrir = (notification: NotificationApp) => {
    setOuvert(false)
    if (!notification.lu) {
      setNonLues((n) => Math.max(0, n - 1))
      marquerLue(boite, notification.id).then((r) => setNonLues(r.nonLues)).catch(() => undefined)
    }
    onOuvrir(notification.lien)
  }

  const toutLire = () => {
    setNonLues(0)
    setListe((l) => l?.map((n) => ({ ...n, lu: true })) ?? l)
    toutMarquerLu(boite).catch(() => compter())
  }

  const libelle = nonLues ? (en ? `Notifications, ${nonLues} unread` : `Notifications, ${nonLues} non lue(s)`) : 'Notifications'
  return <div className={styles.cloche} ref={conteneur}>
    <button type="button" className={classeBouton ?? styles.bouton} aria-haspopup="dialog" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined}
      aria-label={libelle} onClick={basculer} data-testid="cloche-notifications">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9ZM10 20a2.2 2.2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {nonLues ? <b className={styles.pastille} data-testid="cloche-pastille">{pastille(nonLues)}</b> : null}
    </button>
    {ouvert ? <div id={id} role="dialog" aria-label="Notifications" className={styles.panneau} style={position} data-testid="cloche-panneau">
      <header>
        <strong>Notifications</strong>
        {nonLues ? <button type="button" onClick={toutLire} data-testid="cloche-tout-lu">{en ? 'Mark all as read' : 'Tout marquer comme lu'}</button> : null}
      </header>
      <div className={styles.liste}>
        {erreur ? <p className={styles.vide} role="alert">{en ? 'The notifications could not be loaded.' : 'Les notifications n’ont pas pu être chargées.'}</p>
          : liste === null ? <p className={styles.vide} role="status">{en ? 'Loading…' : 'Chargement…'}</p>
          : !liste.length ? <p className={styles.vide}>{en ? 'No notification yet.' : 'Aucune notification pour l’instant.'}</p>
          : liste.map((n) => <LigneNotification key={n.id} notification={n} locale={locale} onOuvrir={ouvrir} />)}
      </div>
      {toutVoir ? <Link href={toutVoir} className={styles.toutVoir} onClick={() => setOuvert(false)} data-testid="cloche-tout-voir">{en ? 'See all notifications' : 'Voir toutes les notifications'}</Link> : null}
    </div> : null}
  </div>
}

/** Une notification ; non lue, elle porte un point et un titre plus appuye. */
export function LigneNotification({ notification, locale, onOuvrir }: { notification: NotificationApp; locale: string; onOuvrir: (n: NotificationApp) => void }) {
  return <button type="button" className={styles.ligne} data-lu={notification.lu ? 'oui' : 'non'} onClick={() => onOuvrir(notification)} data-testid="notification-ligne">
    <span className={styles.point} aria-hidden="true" />
    <span>
      <strong>{notification.titre}</strong>
      <small>{notification.texte}</small>
      <time dateTime={notification.creeLe}>{ilYA(notification.creeLe, locale)}</time>
    </span>
  </button>
}
