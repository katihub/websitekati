'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './marketplace-avantages.module.css'

/**
 * « LES AVANTAGES KATIHUB » : un carrousel de cartes texte + image, defilant
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
    image: '/marketplace-hero-douala.png', alt: 'Une rue commerçante de Douala', href: '/catalogue', action: 'Commander maintenant',
  },
  {
    titre: 'Des KATI à chaque achat',
    texte: 'Vos commandes livrées vous rapportent des points KATI, qui paient une partie de la suivante. Parrainez un proche : vous en gagnez aussi.',
    image: '/marketplace-telephone-kati.png', alt: 'Un téléphone affichant l’application KatiHub', href: '/compte/kati', action: 'Voir mes KATI',
  },
  {
    titre: 'Retrait gratuit en boutique',
    texte: 'Passez chercher votre commande quand elle est prête : la boutique vous envoie un code de retrait valable 7 jours. Aucun frais de livraison.',
    image: '/marketplace-shop-tech-cover.png', alt: 'Le comptoir d’une boutique high-tech', href: '/boutiques', action: 'Voir les boutiques',
  },
  {
    titre: 'Des devis pour votre entreprise',
    texte: 'Demandez les quantités dont vous avez besoin à plusieurs boutiques à la fois, comparez leurs réponses et commandez en un clic.',
    image: '/marchande-katihub-cameroun.png', alt: 'Une commerçante camerounaise dans sa boutique', href: '/catalogue', action: 'Choisir mes articles',
  },
  {
    titre: 'Achetez l’esprit tranquille',
    texte: 'Paiement par Orange Money ou MTN Mobile Money, acompte ou paiement complet, et assurance KATI en option sur vos produits.',
    image: '/marketplace-catalogue-cover.png', alt: 'Une sélection de produits du catalogue KatiHub', href: '/catalogue', action: 'Ouvrir le catalogue',
  },
  {
    titre: 'La mode des créateurs d’ici',
    texte: 'Vêtements, chaussures et accessoires de boutiques camerounaises vérifiées, livrés ou à retirer près de chez vous.',
    image: '/marketplace-mode-cameroun.png', alt: 'Une cliente présente une tenue d’une boutique locale', href: '/recherche?q=Mode', action: 'Découvrir la mode',
  },
]

const INTERVALLE_MS = 6000

export function MarketplaceAvantages() {
  const piste = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(Math.ceil(AVANTAGES.length / 2))
  const [enPause, setEnPause] = useState(false)
  const [suspendu, setSuspendu] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)

  /** Le nombre de cartes visibles a la fois : deux sur un ecran large, une sur un telephone. */
  const parVue = useCallback(() => {
    const element = piste.current
    const carte = element?.firstElementChild as HTMLElement | null
    return element && carte ? Math.max(1, Math.round(element.clientWidth / carte.offsetWidth)) : 2
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
        <h2 id="avantages-titre">Plus qu’un panier : les avantages KatiHub</h2>
        <p>Livraison Kati Express, points KATI, retrait gratuit en boutique, devis pour les pros : ce que la marketplace ajoute à chacun de vos achats, sans frais cachés.</p>
      </div>
      <Link href="/catalogue">Ouvrir le catalogue</Link>
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
      {AVANTAGES.map((avantage, index) => <article key={avantage.titre} className={styles.carte} role="group" aria-roledescription="diapositive" aria-label={`${index + 1} sur ${AVANTAGES.length}`}>
        <div className={styles.texte}>
          <h3>{avantage.titre}</h3>
          <p>{avantage.texte}</p>
          <Link href={avantage.href}>{avantage.action}<span aria-hidden="true">→</span></Link>
        </div>
        <div className={styles.visuel}><Image src={avantage.image} alt={avantage.alt} fill sizes="(max-width: 900px) 40vw, 280px" /></div>
      </article>)}
    </div>

    <div className={styles.controles}>
      <div className={styles.points}>{Array.from({ length: pages }, (_, index) => <button key={index} type="button" aria-label={`Afficher les avantages ${index + 1} sur ${pages}`} aria-current={index === page} onClick={() => allerA(index)} />)}</div>
      {!mouvementReduit ? <button type="button" className={styles.pause} onClick={() => setEnPause(!enPause)} aria-label={enPause ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}>{enPause ? '▶' : '❚❚'}</button> : null}
    </div>
  </section>
}
