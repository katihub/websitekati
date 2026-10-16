'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'

import type { BoutiqueMarketplace } from '@/lib/marketplace-data'
import styles from './marketplace-home-v2.module.css'

function mouvementReduit() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initiales(nom: string) {
  return nom.split(/\s+/).map((partie) => partie[0]).join('').slice(0, 2).toUpperCase()
}

function zoneLivraison(boutique: BoutiqueMarketplace) {
  const nombre = boutique.villesLivraison.length
  if (!nombre) return 'Livraison disponible'
  return `${nombre} ${nombre > 1 ? 'villes desservies' : 'ville desservie'}`
}

export function ShopCarouselAccueil({ boutiques }: { boutiques: readonly BoutiqueMarketplace[] }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(1)

  const defiler = useCallback((direction: 1 | -1) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const carte = viewport.querySelector<HTMLElement>('[data-shop-carousel-card]')
    if (!carte) return
    const ecart = Number.parseFloat(getComputedStyle(viewport).columnGap || getComputedStyle(viewport).gap) || 10
    const pas = carte.offsetWidth + ecart
    const fin = viewport.scrollWidth - viewport.clientWidth
    const boucle = direction === 1 && viewport.scrollLeft >= fin - pas / 2
    const debut = direction === -1 && viewport.scrollLeft <= pas / 2
    viewport.scrollTo({
      left: boucle ? 0 : debut ? fin : viewport.scrollLeft + direction * pas,
      behavior: mouvementReduit() ? 'auto' : 'smooth',
    })
  }, [])

  function actualiserPosition() {
    const viewport = viewportRef.current
    const carte = viewport?.querySelector<HTMLElement>('[data-shop-carousel-card]')
    if (!viewport || !carte) return
    const ecart = Number.parseFloat(getComputedStyle(viewport).columnGap || getComputedStyle(viewport).gap) || 10
    setPosition(Math.min(boutiques.length, Math.round(viewport.scrollLeft / (carte.offsetWidth + ecart)) + 1))
  }

  return <div className={`${styles.productCarousel} ${styles.shopCarousel}`}>
    <div
      ref={viewportRef}
      className={styles.productViewport}
      onScroll={actualiserPosition}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); defiler(1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); defiler(-1) }
      }}
      aria-label="Boutiques recommandées, carrousel de boutiques"
      tabIndex={0}
    >
      <div className={styles.shopTrack}>
        {boutiques.map((boutique) => <div className={styles.shopSlide} data-shop-carousel-card key={boutique.id}>
          <Link href={`/boutiques/${boutique.slug}`} className={styles.shopCard} aria-label={`Découvrir ${boutique.nom}`}>
            <i className={styles.shopWatermark} aria-hidden="true">{initiales(boutique.nom)}</i>
            <div className={styles.shopIdentity}>
              <span className={styles.shopAvatar} aria-hidden="true">{initiales(boutique.nom)}</span>
              <span className={styles.shopName}>
                <strong>{boutique.nom}<i className={styles.shopVerified} title="Boutique vérifiée" aria-label="Boutique vérifiée">✓</i></strong>
                <small className={styles.shopLocation}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  {boutique.ville ?? boutique.villesLivraison[0] ?? 'Cameroun'}
                </small>
              </span>
            </div>
            <div className={styles.shopCardFooter}>
              <span>{zoneLivraison(boutique)}</span>
              <b aria-hidden="true">↗</b>
            </div>
          </Link>
        </div>)}
      </div>
    </div>
    {boutiques.length > 1 ? <>
      <div className={styles.shopNavigation}>
        <span className={styles.shopProgress} aria-live="polite"><b>{String(position).padStart(2, '0')}</b><i aria-hidden="true" /><span>{String(boutiques.length).padStart(2, '0')}</span></span>
        <span className={styles.shopControls}>
          <button type="button" onClick={() => defiler(-1)} aria-label="Boutiques précédentes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
          <button type="button" onClick={() => defiler(1)} aria-label="Boutiques suivantes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
        </span>
      </div>
    </> : null}
  </div>
}
