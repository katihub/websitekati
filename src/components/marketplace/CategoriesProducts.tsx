'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'

import styles from '@/app/categories/categories.module.css'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import { ProductCard } from './ProductCardAccueil'

type SelectionId = 'nouveautes' | 'selection'

export function CategoriesProducts({
  nouveautes,
  selection,
}: {
  nouveautes: readonly OffreMarketplace[]
  selection: readonly OffreMarketplace[]
}) {
  const [active, setActive] = useState<SelectionId>('nouveautes')
  const panelId = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const offres = active === 'nouveautes' ? nouveautes : selection
  const activeIndex = active === 'nouveautes' ? 0 : 1

  function selectTab(index: number) {
    const next = index === 0 ? 'nouveautes' : 'selection'
    setActive(next)
    tabs.current[index]?.focus()
  }

  return (
    <section className={styles.discovery} aria-labelledby="categories-discovery-title">
      <div className={styles.discoveryShell}>
        <header className={styles.discoveryHead}>
          <div>
            <h2 id="categories-discovery-title">À découvrir maintenant</h2>
            <p>Des arrivages récents et des produits choisis pour vous.</p>
          </div>
          <Link href="/catalogue" className={styles.discoveryLink}>
            Voir tout le catalogue
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </Link>
        </header>

        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Sélections de produits"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') selectTab((activeIndex + 1) % 2)
            else if (event.key === 'ArrowLeft') selectTab((activeIndex + 1) % 2)
            else if (event.key === 'Home') selectTab(0)
            else if (event.key === 'End') selectTab(1)
            else return
            event.preventDefault()
          }}
        >
          <button
            ref={(node) => { tabs.current[0] = node }}
            type="button"
            role="tab"
            id={`${panelId}-nouveautes`}
            aria-selected={active === 'nouveautes'}
            aria-controls={panelId}
            tabIndex={active === 'nouveautes' ? 0 : -1}
            onClick={() => setActive('nouveautes')}
          >
            Nouveautés
          </button>
          <button
            ref={(node) => { tabs.current[1] = node }}
            type="button"
            role="tab"
            id={`${panelId}-selection`}
            aria-selected={active === 'selection'}
            aria-controls={panelId}
            tabIndex={active === 'selection' ? 0 : -1}
            onClick={() => setActive('selection')}
          >
            Notre sélection rien que pour vous
          </button>
        </div>

        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={`${panelId}-${active}`}
          className={styles.products}
          aria-live="polite"
        >
          {offres.length ? (
            offres.map((offre) => (
              <ProductCard
                key={`${active}-${offre.id}`}
                offre={offre}
                fresh={active === 'nouveautes'}
              />
            ))
          ) : (
            <p className={styles.productsEmpty}>
              Les produits seront bientôt disponibles.{' '}
              <Link href="/catalogue">Parcourir le catalogue</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
