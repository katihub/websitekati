'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMarketplaceLanguage } from '@/lib/language'
import styles from './marketplace-avantages.module.css'

/**
 * « LES AVANTAGES KATIMARKET » : un carrousel de cartes texte + image, defilant
 * seul, qui presente ce que la marketplace ajoute a un achat. Rien d'invente :
 * chaque carte decrit un service reel (Kati Express, points KATI, retrait,
 * devis, paiement et assurance, mode locale) et mene a la page qui le sert.
 *
 * Le defilement s'arrete au survol, au focus, au toucher, et sur demande (le
 * bouton pause, exige quand un contenu bouge seul plus de cinq secondes). Il
 * ne demarre pas quand le visiteur a demande moins d'animations.
 */

type Avantage = { titre: string; texte: string; image: string; alt: string; href: string; action: string }

const AVANTAGES: readonly Avantage[] = [
  {
    titre: 'Livré chez vous par Kati Express',
    texte: 'Nos livreurs apportent votre commande à domicile à Douala et Yaoundé. Vous la recevez contre un code personnel : personne d’autre ne la récupère.',
    image: '/home-avantage-livraison.png', alt: 'Un livreur remet une commande à une cliente à Douala', href: '/catalogue', action: 'Commander maintenant',
  },
  {
    titre: 'Des KATI à chaque achat',
    texte: 'Vos commandes livrées vous rapportent des points KATI, qui paient une partie de la suivante. Parrainez un proche : vous en gagnez aussi.',
    image: '/marketplace-telephone-kati.png', alt: 'Un téléphone affichant l’application KatiMarket', href: '/compte/kati', action: 'Voir mes KATI',
  },
  {
    titre: 'Retrait gratuit en boutique',
    texte: 'Passez chercher votre commande quand elle est prête : la boutique vous envoie un code de retrait valable 7 jours. Aucun frais de livraison.',
    image: '/home-avantage-retrait.png', alt: 'Un client retire sa commande dans une boutique high-tech', href: '/boutiques', action: 'Voir les boutiques',
  },
  {
    titre: 'Des devis pour votre entreprise',
    texte: 'Demandez les quantités dont vous avez besoin à plusieurs boutiques à la fois, comparez leurs réponses et commandez en un clic.',
    image: '/home-avantage-devis.png', alt: 'Deux professionnels camerounais étudient un devis sur une tablette', href: '/catalogue', action: 'Choisir mes articles',
  },
  {
    titre: 'Achetez l’esprit tranquille',
    texte: 'Paiement par Orange Money ou MTN Mobile Money, acompte ou paiement complet, et assurance KATI en option sur vos produits.',
    image: '/home-avantage-paiement.png', alt: 'Une cliente effectue un paiement mobile sécurisé', href: '/catalogue', action: 'Ouvrir le catalogue',
  },
  {
    titre: 'La mode des créateurs d’ici',
    texte: 'Vêtements, chaussures et accessoires de boutiques camerounaises vérifiées, livrés ou à retirer près de chez vous.',
    image: '/home-avantage-mode-locale.png', alt: 'Une créatrice camerounaise ajuste une veste confectionnée localement', href: '/recherche?q=Mode', action: 'Découvrir la mode',
  },
]

const AVANTAGES_EN: readonly Avantage[] = [
  { titre: 'Delivered to your door with Kati Express', texte: 'Our couriers deliver your order to your home in Douala and Yaoundé. Collect it with your personal code so no one else can claim it.', image: '/home-avantage-livraison.png', alt: 'A courier handing an order to a customer in Douala', href: '/catalogue', action: 'Shop now' },
  { titre: 'Earn KATI with every purchase', texte: 'Delivered orders earn KATI points that can pay for part of your next purchase. Refer a friend and earn more.', image: '/marketplace-telephone-kati.png', alt: 'A phone displaying the KatiMarket app', href: '/compte/kati', action: 'View my KATI' },
  { titre: 'Free pickup at the shop', texte: 'Pick up your order when it is ready. The shop sends you a pickup code valid for 7 days. No delivery fee.', image: '/home-avantage-retrait.png', alt: 'A customer collecting an order from a high-tech shop', href: '/boutiques', action: 'Browse shops' },
  { titre: 'Request quotes for your business', texte: 'Ask several shops for the quantities you need, compare their offers, and place an order in one click.', image: '/home-avantage-devis.png', alt: 'Two Cameroonian professionals reviewing a quote on a tablet', href: '/catalogue', action: 'Choose my items' },
  { titre: 'Shop with peace of mind', texte: 'Pay with Orange Money or MTN Mobile Money, choose a deposit or full payment, and add optional KATI cover to your products.', image: '/home-avantage-paiement.png', alt: 'A customer making a secure mobile payment', href: '/catalogue', action: 'Browse the catalogue' },
  { titre: 'Fashion from local creators', texte: 'Clothing, shoes, and accessories from verified Cameroonian shops, delivered or ready for pickup near you.', image: '/home-avantage-mode-locale.png', alt: 'A Cameroonian designer fitting a locally made jacket', href: '/recherche?q=Mode', action: 'Discover fashion' },
]

const INTERVALLE_MS = 6000

export function MarketplaceAvantages() {
  const { locale, text } = useMarketplaceLanguage()
  const avantages = locale === 'fr' ? AVANTAGES : AVANTAGES_EN
  const piste = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(Math.ceil(AVANTAGES.length / 3))
  const [enPause, setEnPause] = useState(false)
  const [suspendu, setSuspendu] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)

  /** Le nombre de cartes visibles a la fois suit la largeur réellement disponible. */
  const parVue = useCallback(() => {
    const element = piste.current
    const carte = element?.firstElementChild as HTMLElement | null
    return element && carte ? Math.max(1, Math.round(element.clientWidth / carte.offsetWidth)) : 3
  }, [])

  const allerA = useCallback((cible: number) => {
    const element = piste.current
    if (!element) return
    const carte = element.children[Math.min(cible * parVue(), AVANTAGES.length - 1)] as HTMLElement | undefined
    if (!carte) return
    element.scrollTo({ left: carte.offsetLeft - element.offsetLeft, behavior: mouvementReduit ? 'auto' : 'smooth' })
  }, [parVue, mouvementReduit])

  // Le nombre de pages suit la largeur de l'ecran ; la page courante suit le defilement (doigt ou boutons).
  useEffect(() => {
    const element = piste.current
    if (!element) return
    const mesurer = () => setPages(Math.ceil(AVANTAGES.length / parVue()))
    const suivre = () => {
      const carte = element.firstElementChild as HTMLElement | null
      if (!carte) return
      const pas = carte.offsetWidth + parseFloat(getComputedStyle(element).columnGap || '0')
      setPage(Math.round(element.scrollLeft / (pas * parVue())))
    }
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    element.addEventListener('scroll', suivre, { passive: true })
    return () => { observateur.disconnect(); element.removeEventListener('scroll', suivre) }
  }, [parVue])

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)')
    const appliquer = () => setMouvementReduit(requete.matches)
    requete.addEventListener('change', appliquer)
    const minuterie = window.setTimeout(appliquer, 0)
    return () => { requete.removeEventListener('change', appliquer); window.clearTimeout(minuterie) }
  }, [])

  // L'avance automatique : une page toutes les six secondes, sauf pause, survol, focus ou mouvement reduit.
  useEffect(() => {
    if (enPause || suspendu || mouvementReduit || pages < 2) return
    const minuterie = window.setInterval(() => allerA((page + 1) % pages), INTERVALLE_MS)
    return () => window.clearInterval(minuterie)
  }, [enPause, suspendu, mouvementReduit, pages, page, allerA])

  const autoActif = !enPause && !mouvementReduit

  return <section className={styles.section} aria-roledescription="carrousel" aria-labelledby="avantages-titre">
    <header className={styles.entete}>
      <div>
        <h2 id="avantages-titre">{text('moreThanCart')}</h2>
        <p>{text('benefitsText')}</p>
      </div>
      <Link href="/catalogue">{text('openCatalogue')}</Link>
    </header>

    <div
      ref={piste}
      className={styles.piste}
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuspendu(false) }}
      onTouchStart={() => setSuspendu(true)}
      aria-live={autoActif ? 'off' : 'polite'}
    >
      {avantages.map((avantage, index) => <article key={avantage.titre} className={styles.carte} role="group" aria-roledescription="diapositive" aria-label={text('carouselSlide', { number: index + 1, total: avantages.length })}>
        <div className={styles.texte}>
          <h3>{avantage.titre}</h3>
          <p>{avantage.texte}</p>
          <Link href={avantage.href}>{avantage.action}<span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.visuel}><Image src={avantage.image} alt={avantage.alt} fill sizes="(max-width: 900px) 40vw, 280px" /></div>
      </article>)}
    </div>

    <div className={styles.controles}>
      <div className={styles.points}>{Array.from({ length: pages }, (_, index) => <button key={index} type="button" aria-label={text('carouselSlide', { number: index + 1, total: pages })} aria-current={index === page} onClick={() => allerA(index)} />)}</div>
      {!mouvementReduit ? <button type="button" className={styles.pause} onClick={() => setEnPause(!enPause)} aria-label={enPause ? text('resumeScroll') : text('pauseScroll')}>{enPause ? '▶' : '❚❚'}</button> : null}
    </div>
  </section>
}
