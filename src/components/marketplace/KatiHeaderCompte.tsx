'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

import { api, ErreurApi } from '@/lib/api'
import { useSession } from '@/lib/session'
import styles from './marketplace-shell-v2.module.css'
import { useMarketplaceLanguage } from '@/lib/language'

/**
 * CE QUE L'EN-TETE PROPOSE SELON QUI EST LA.
 *
 * L'en-tete est rendu par le serveur, qui ne connait pas la session (elle vit
 * dans le navigateur) : ces liens sont donc rendus ici, une fois la session lue.
 * - un visiteur : se connecter, ou ouvrir un compte marchand ;
 * - un client connecte : ses commandes et son compte ;
 * - un marchand connecte : sa boutique et son compte.
 * Un marchand est reconnu a ses boutiques (`/vendeurs/mes-boutiques`) ; un
 * client recoit un refus, qui le classe simplement client.
 */

type Profil = 'client' | 'marchand'

const sansAbonnement = () => () => {}
/**
 * Vrai une fois la page hydratee. Le serveur ne connait pas la session : le
 * premier rendu du navigateur doit donc etre le meme que le sien (la place
 * reservee), et les vrais liens ne viennent qu'ensuite.
 */
function useHydrate() {
  return useSyncExternalStore(sansAbonnement, () => true, () => false)
}

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

const ICONE_PERSONNE = <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
const ICONE_BOUTIQUE = <path d="M3 9.5 4.5 4h15L21 9.5M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M4.5 12.5V20h15v-7.5M9.5 20v-4.5h5V20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
const ICONE_COLIS = <path d="M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />

/** Le prenom affichable tire de l'adresse e-mail : « awa.ngono@… » donne « Awa ». */
function prenomDe(courriel: string | null) {
  const debut = (courriel ?? '').split('@')[0]?.split(/[._-]/)[0] ?? ''
  return debut ? debut.charAt(0).toUpperCase() + debut.slice(1) : ''
}

/** Client ou marchand : lu une fois par session, et retenu le temps de la visite. */
function useProfil(userId: string | null): Profil | null {
  const [profils, setProfils] = useState<Record<string, Profil>>({})
  useEffect(() => {
    if (!userId || profils[userId]) return
    const controleur = new AbortController()
    api<unknown[]>('/vendeurs/mes-boutiques', { signal: controleur.signal })
      .then((boutiques) => { if (!controleur.signal.aborted) setProfils((p) => ({ ...p, [userId]: Array.isArray(boutiques) && boutiques.length ? 'marchand' : 'client' })) })
      .catch((cause: unknown) => { if (!controleur.signal.aborted && cause instanceof ErreurApi) setProfils((p) => ({ ...p, [userId]: 'client' })) })
    return () => controleur.abort()
  }, [userId, profils])
  return userId ? profils[userId] ?? null : null
}

function MenuCompte({ profil, courriel, onDeconnexion }: { profil: Profil | null; courriel: string | null; onDeconnexion: () => Promise<void> }) {
  const { text } = useMarketplaceLanguage()
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!ouvert) return
    const fermer = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !conteneur.current?.contains(event.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', fermer)
    document.addEventListener('keydown', fermer)
    return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', fermer) }
  }, [ouvert])
  const lien = (href: string, libelle: string) => <Link href={href} role="menuitem" onClick={() => setOuvert(false)}>{libelle}</Link>
  return <div className={styles.menuCompte} ref={conteneur}>
    <button type="button" className={styles.actionLien} aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined} aria-label={text('myAccount')} onClick={() => setOuvert(!ouvert)} data-testid="menu-compte">
      <Icon>{ICONE_PERSONNE}</Icon><span>{text('myAccount')}</span>
    </button>
    {ouvert ? <div id={id} role="menu" className={styles.menuCompteListe}>
      <p>{courriel ?? 'Connecté'}</p>
      {profil === 'marchand' ? lien('/espace-vendeur', text('sellerSpace')) : null}
      {lien('/compte/commandes', text('myOrders'))}
      {lien('/compte/devis', text('myQuotes'))}
      {lien('/compte/kati', text('myPoints'))}
      {lien('/compte/favoris', text('myFavorites'))}
      <button type="button" role="menuitem" onClick={() => { setOuvert(false); void onDeconnexion() }}>{text('signOut')}</button>
    </div> : null}
  </div>
}

/** Les deux actions de compte de la barre principale, a cote du panier. */
export function ActionsCompte() {
  const { text } = useMarketplaceLanguage()
  const { session, chargement, courriel, deconnecter } = useSession()
  const profil = useProfil(session?.userId ?? null)
  const router = useRouter()
  const deconnexion = async () => { await deconnecter(); router.refresh() }
  const hydrate = useHydrate()

  // Le temps de lire la session, la place est reservee sans montrer de lien faux.
  if (!hydrate || chargement) return <span className={styles.actionsAttente} aria-hidden="true" />
  if (!session) {
    return <>
      <Link href="/connexion" className={styles.actionLien} aria-label={text('signIn')}><Icon>{ICONE_PERSONNE}</Icon><span>{text('signIn')}</span></Link>
      <Link href="/espace-vendeur" className={styles.actionLien} aria-label={text('sellerAccount')}><Icon>{ICONE_BOUTIQUE}</Icon><span>{text('sellerAccount')}</span></Link>
    </>
  }
  return <>
    {profil === 'marchand'
      ? <Link href="/espace-vendeur" className={styles.actionLien} aria-label={text('myShop')}><Icon>{ICONE_BOUTIQUE}</Icon><span>{text('myShop')}</span></Link>
      : <Link href="/compte/commandes" className={styles.actionLien} aria-label={text('myOrders')}><Icon>{ICONE_COLIS}</Icon><span>{text('myOrders')}</span></Link>}
    <MenuCompte profil={profil} courriel={courriel} onDeconnexion={deconnexion} />
  </>
}

/** Les liens de la barre du haut : se connecter, ou saluer le client connecte. */
export function LiensBarreHaut() {
  const { text } = useMarketplaceLanguage()
  const { session, chargement, courriel, deconnecter } = useSession()
  const router = useRouter()
  const hydrate = useHydrate()
  if (!hydrate || chargement) return null
  if (!session) return <><Link href="/connexion">{text('signIn')}</Link><Link href="/inscription">{text('createAccount')}</Link></>
  const prenom = prenomDe(courriel)
  return <>
    <span className={styles.salutation}>{text('greeting')}{prenom ? `, ${prenom}` : ''}</span>
    <button type="button" className={styles.lienBarre} onClick={() => void deconnecter().then(() => router.refresh())}>{text('signOut')}</button>
  </>
}
