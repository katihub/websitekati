'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'

import { api, ErreurApi } from '@/lib/api'
import { BOITE_CLIENT, cheminInterne } from '@/lib/notifications'
import { ClocheNotifications } from '@/components/notifications/ClocheNotifications'
import { useSession } from '@/lib/session'
import styles from './marketplace-shell-v2.module.css'
import { useMarketplaceLanguage } from '@/lib/language'
import { ShopIcon, type ShopIconName } from './ShopIcon'

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
const ICONE_SORTIE = <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const lien = (href: string, icone: ShopIconName, libelle: string) => <Link href={href} role="menuitem" onClick={() => setOuvert(false)}><ShopIcon name={icone} />{libelle}</Link>
  return <div className={styles.menuCompte} ref={conteneur}>
    <button type="button" className={styles.actionLien} aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? id : undefined} aria-label={text('myAccount')} onClick={() => setOuvert(!ouvert)} data-testid="menu-compte">
      <Icon>{ICONE_PERSONNE}</Icon><span>{text('myAccount')}</span>
    </button>
    {ouvert ? <div id={id} role="menu" className={styles.menuCompteListe}>
      <p>{courriel ?? 'Connecté'}</p>
      {profil === 'marchand' ? lien('/espace-vendeur', 'grid', text('sellerSpace')) : null}
      {lien('/compte/commandes', 'package', text('myOrders'))}
      {lien('/compte/devis', 'receipt', text('myQuotes'))}
      {lien('/compte/paiements-plusieurs-fois', 'wallet', text('myInstallments'))}
      {lien('/compte/notifications', 'message', text('myNotifications'))}
      {lien('/compte/kati', 'star', text('myPoints'))}
      {lien('/compte/favoris', 'heart', text('myFavorites'))}
      <button type="button" role="menuitem" onClick={() => { setOuvert(false); void onDeconnexion() }}><Icon>{ICONE_SORTIE}</Icon>{text('signOut')}</button>
    </div> : null}
  </div>
}

/** Les deux actions de compte de la barre principale, a cote du panier. */
/**
 * LA LANGUE DU SITE EST AUSSI CELLE DES E-MAILS. Le client connecte transmet sa
 * langue a son compte, une fois par langue et par session de navigateur ; une
 * erreur (compte vendeur, reseau) ne gene rien : les e-mails restent en francais.
 */
function useLangueDuCompte(userId: string | null, langue: string) {
  useEffect(() => {
    if (!userId) return
    const cle = 'katimarket.langue-compte'
    const valeur = `${userId}:${langue}`
    try { if (window.sessionStorage.getItem(cle) === valeur) return } catch { /* stockage indisponible */ }
    api('/profil/langue', { methode: 'PUT', corps: { langue } })
      .then(() => { try { window.sessionStorage.setItem(cle, valeur) } catch { /* stockage indisponible */ } })
      .catch(() => undefined)
  }, [userId, langue])
}

export function ActionsCompte() {
  const { text, locale } = useMarketplaceLanguage()
  const { session, chargement, courriel, deconnecter } = useSession()
  useLangueDuCompte(session?.userId ?? null, locale)
  const profil = useProfil(session?.userId ?? null)
  const router = useRouter()
  const deconnexion = async () => { await deconnecter(); router.refresh() }
  const hydrate = useHydrate()

  // Le temps de lire la session, la place est reservee sans montrer de lien faux.
  if (!hydrate || chargement) return <span className={styles.actionsAttente} aria-hidden="true" />
  if (!session) {
    return <>
      <Link href="/connexion" className={styles.actionLien} aria-label={text('signIn')}><Icon>{ICONE_PERSONNE}</Icon><span>{text('signIn')}</span></Link>
      <Link href="/espace-vendeur" className={`${styles.actionLien} ${styles.actionContextuelle}`} aria-label={text('sellerAccount')}><Icon>{ICONE_BOUTIQUE}</Icon><span>{text('sellerAccount')}</span></Link>
    </>
  }
  // Sur mobile, la cloche prend la place des « Mes commandes » du client (ils restent dans le
  // menu du compte) ; la boutique du marchand garde son raccourci, c'est son espace de travail.
  return <>
    {profil === 'marchand'
      ? <Link href="/espace-vendeur" className={styles.actionLien} aria-label={text('myShop')}><Icon>{ICONE_BOUTIQUE}</Icon><span>{text('myShop')}</span></Link>
      : <Link href="/compte/commandes" className={`${styles.actionLien} ${styles.horsMobile}`} aria-label={text('myOrders')}><Icon>{ICONE_COLIS}</Icon><span>{text('myOrders')}</span></Link>}

    <ClocheNotifications boite={BOITE_CLIENT} classeBouton={styles.actionLien} toutVoir="/compte/notifications"
      onOuvrir={(lien) => router.push(cheminInterne(lien) ?? '/compte/notifications')} />
    <MenuCompte profil={profil} courriel={courriel} onDeconnexion={deconnexion} />
  </>
}

/** Le lien de la barre du haut : un seul, qui connecte ou deconnecte le client. */
export function LiensBarreHaut() {
  const { text } = useMarketplaceLanguage()
  const { session, chargement, courriel, deconnecter } = useSession()
  const router = useRouter()
  const hydrate = useHydrate()
  if (!hydrate || chargement) return <span className={styles.topbarLinksWaiting} aria-hidden="true" />
  if (!session) return <Link href="/connexion" className={styles.topbarAction} data-testid="connexion-client"><Icon>{ICONE_PERSONNE}</Icon><span>{text('customerSignIn')}</span></Link>
  const prenom = prenomDe(courriel)
  return <>
    <span className={styles.salutation}>{text('greeting')}{prenom ? `, ${prenom}` : ''}</span>
    <button type="button" className={styles.topbarAction} onClick={() => void deconnecter().then(() => router.refresh())} data-testid="deconnexion-client"><Icon>{ICONE_SORTIE}</Icon><span>{text('customerSignOut')}</span></button>
  </>
}
