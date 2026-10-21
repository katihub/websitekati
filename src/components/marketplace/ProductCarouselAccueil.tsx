'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { OffreMarketplace } from '@/lib/marketplace-data'
import { ProductCard } from './ProductCardAccueil'
import styles from './marketplace-home-v2.module.css'

const DELAI_DEFILEMENT = 4_200

function mouvementReduit() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ProductCarouselAccueil({ offres, label = 'Carrousel de produits', showCategory = false }: { offres: readonly OffreMarketplace[]; label?: string; showCategory?: boolean }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pause, setPause] = useState(false)
  const [position, setPosition] = useState(1)

  const defiler = useCallback((direction: 1 | -1, automatique = false) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const carte = viewport.querySelector<HTMLElement>(`[data-product-carousel-card]`)
    if (!carte) return
    const ecart = Number.parseFloat(getComputedStyle(viewport).columnGap || getComputedStyle(viewport).gap) || 10
    const pas = carte.offsetWidth + ecart
    const fin = viewport.scrollWidth - viewport.clientWidth
    const boucle = direction === 1 && viewport.scrollLeft >= fin - pas / 2
    const debut = direction === -1 && viewport.scrollLeft <= pas / 2
    viewport.scrollTo({
      left: boucle ? 0 : debut ? fin : viewport.scrollLeft + direction * pas,
      behavior: mouvementReduit() || (automatique && boucle) ? 'auto' : 'smooth',
    })
  }, [])

  useEffect(() => {
    if (pause || offres.length < 2 || mouvementReduit()) return
    const intervalle = window.setInterval(() => defiler(1, true), DELAI_DEFILEMENT)
    return () => window.clearInterval(intervalle)
  }, [defiler, offres.length, pause])

  function actualiserPosition() {
    const viewport = viewportRef.current
    const carte = viewport?.querySelector<HTMLElement>(`[data-product-carousel-card]`)
    if (!viewport || !carte) return
    const ecart = Number.parseFloat(getComputedStyle(viewport).columnGap || getComputedStyle(viewport).gap) || 10
    setPosition(Math.min(offres.length, Math.round(viewport.scrollLeft / (carte.offsetWidth + ecart)) + 1))
  }

  return <div
    className={styles.productCarousel}
    onMouseEnter={() => setPause(true)}
    onMouseLeave={() => setPause(false)}
    onFocusCapture={() => setPause(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPause(false) }}
  >
    <div
      ref={viewportRef}
      className={styles.productViewport}
      onScroll={actualiserPosition}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); defiler(1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); defiler(-1) }
      }}
      aria-label={label}
      tabIndex={0}
    >
      <div className={styles.productTrack}>
        {offres.map((offre) => <div className={styles.productSlide} data-product-carousel-card key={offre.id}><ProductCard offre={offre} showCategory={showCategory} /></div>)}
      </div>
    </div>
    {offres.length > 1 ? <>
      <button type="button" className={`${styles.productArrow} ${styles.productPrev}`} onClick={() => defiler(-1)} aria-label="Produits précédents">‹</button>
      <button type="button" className={`${styles.productArrow} ${styles.productNext}`} onClick={() => defiler(1)} aria-label="Produits suivants">›</button>
      <div className={styles.productProgress} aria-live="polite"><span>{position}</span><i aria-hidden="true" /><b>{offres.length}</b></div>
    </> : null}
  </div>
}
