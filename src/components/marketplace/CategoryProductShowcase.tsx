'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'

import type { OffreMarketplace } from '@/lib/marketplace-data'
import { CATEGORY_ICON } from './ProductCardAccueil'
import { ProductCarouselAccueil } from './ProductCarouselAccueil'
import styles from './marketplace-home-v2.module.css'

export type CategoryProductGroup = {
  nom: string
  slug: string
  offres: OffreMarketplace[]
}

/** Un carrousel lisible, piloté par des onglets de catégories accessibles. */
export function CategoryProductShowcase({ groupes }: { groupes: CategoryProductGroup[] }) {
  const [active, setActive] = useState(groupes[0]?.slug ?? '')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = useId()
  const groupe = groupes.find((item) => item.slug === active) ?? groupes[0]

  if (!groupe) return null

  function choisir(index: number) {
    const prochain = groupes[index]
    if (!prochain) return
    setActive(prochain.slug)
    tabs.current[index]?.focus()
  }

  const indexActif = groupes.findIndex((item) => item.slug === groupe.slug)

  return (
    <section className={`${styles.shell} ${styles.section} ${styles.categoryShowcase}`} aria-labelledby={`${panelId}-title`}>
      <header className={styles.categoryShowcaseHead}>
        <div>
          <span>Inspirez-vous</span>
          <h2 id={`${panelId}-title`}>Des produits pour chaque envie</h2>
          <p>Passez d’une catégorie à l’autre et faites défiler les produits sans quitter l’accueil.</p>
        </div>
        <Link href="/catalogue">Explorer tout le catalogue <span aria-hidden="true">→</span></Link>
      </header>

      <div
        className={styles.categoryShowcaseTabs}
        role="tablist"
        aria-label="Catégories de produits"
        onKeyDown={(event) => {
          let index = indexActif
          if (event.key === 'ArrowRight') index = (indexActif + 1) % groupes.length
          else if (event.key === 'ArrowLeft') index = (indexActif - 1 + groupes.length) % groupes.length
          else if (event.key === 'Home') index = 0
          else if (event.key === 'End') index = groupes.length - 1
          else return
          event.preventDefault()
          choisir(index)
        }}
      >
        {groupes.map((item, index) => (
          <button
            key={item.slug}
            ref={(node) => { tabs.current[index] = node }}
            type="button"
            role="tab"
            id={`${panelId}-${item.slug}`}
            aria-selected={item.slug === groupe.slug}
            aria-controls={`${panelId}-panel`}
            tabIndex={item.slug === groupe.slug ? 0 : -1}
            onClick={() => setActive(item.slug)}
          >
            <span aria-hidden="true">{CATEGORY_ICON[item.nom] ?? '📦'}</span>
            {item.nom}
          </button>
        ))}
      </div>

      <div
        key={groupe.slug}
        id={`${panelId}-panel`}
        role="tabpanel"
        aria-labelledby={`${panelId}-${groupe.slug}`}
        className={styles.categoryShowcasePanel}
      >
        <div className={styles.categoryShowcaseMeta}>
          <strong>{groupe.nom}</strong>
          <Link href={`/categories/${encodeURIComponent(groupe.slug)}`}>Voir toute la catégorie <span aria-hidden="true">→</span></Link>
        </div>
        <ProductCarouselAccueil offres={groupe.offres} label={`Produits de la catégorie ${groupe.nom}`} />
      </div>
    </section>
  )
}
