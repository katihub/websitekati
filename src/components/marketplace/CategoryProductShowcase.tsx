'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { OffreMarketplace } from '@/lib/marketplace-data'
import { CATEGORY_ICON } from './ProductCardAccueil'
import { ProductCarouselAccueil } from './ProductCarouselAccueil'
import styles from './marketplace-home-v2.module.css'

export type CategoryProductGroup = {
  nom: string
  slug: string
  offres: OffreMarketplace[]
}

const DELAI_CATEGORIE = 4_000
const DUREE_SORTIE = 160

/** Un carrousel lisible, piloté par des onglets de catégories accessibles. */
export function CategoryProductShowcase({ groupes }: { groupes: CategoryProductGroup[] }) {
  const [active, setActive] = useState(groupes[0]?.slug ?? '')
  const [survol, setSurvol] = useState(false)
  const [sortie, setSortie] = useState(false)
  const [interaction, setInteraction] = useState(0)
  const [mouvementReduit, setMouvementReduit] = useState(false)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const listeTabs = useRef<HTMLDivElement>(null)
  const transition = useRef<number | null>(null)
  const panelId = useId()
  const groupe = groupes.find((item) => item.slug === active) ?? groupes[0]

  const activer = useCallback((slug: string, manuelle = false) => {
    if (manuelle) setInteraction((numero) => numero + 1)
    if (slug === active) return
    if (transition.current !== null) window.clearTimeout(transition.current)
    if (mouvementReduit) {
      setActive(slug)
      setSortie(false)
      return
    }
    setSortie(true)
    transition.current = window.setTimeout(() => {
      setActive(slug)
      setSortie(false)
      transition.current = null
    }, DUREE_SORTIE)
  }, [active, mouvementReduit])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const appliquer = () => setMouvementReduit(media.matches)
    appliquer()
    media.addEventListener('change', appliquer)
    return () => media.removeEventListener('change', appliquer)
  }, [])

  useEffect(() => () => {
    if (transition.current !== null) window.clearTimeout(transition.current)
  }, [])

  useEffect(() => {
    if (survol || sortie || mouvementReduit || groupes.length < 2) return
    const minuterie = window.setTimeout(() => {
      const index = groupes.findIndex((item) => item.slug === active)
      const prochain = groupes[(Math.max(index, 0) + 1) % groupes.length]
      if (prochain && prochain.slug !== active) activer(prochain.slug)
    }, DELAI_CATEGORIE)
    return () => window.clearTimeout(minuterie)
  }, [active, activer, groupes, interaction, mouvementReduit, sortie, survol])

  useEffect(() => {
    const liste = listeTabs.current
    const index = groupes.findIndex((item) => item.slug === active)
    const tab = tabs.current[index]
    if (!liste || !tab) return
    const gauche = tab.offsetLeft
    const droite = gauche + tab.offsetWidth
    if (gauche < liste.scrollLeft || droite > liste.scrollLeft + liste.clientWidth) {
      liste.scrollTo({ left: Math.max(0, gauche - 12), behavior: mouvementReduit ? 'auto' : 'smooth' })
    }
  }, [active, groupes, mouvementReduit])

  if (!groupe) return null

  function choisir(index: number) {
    const prochain = groupes[index]
    if (!prochain) return
    activer(prochain.slug, true)
    tabs.current[index]?.focus()
  }

  const indexActif = groupes.findIndex((item) => item.slug === groupe.slug)

  return (
    <section className={`${styles.shell} ${styles.section} ${styles.categoryShowcase}`} aria-labelledby={`${panelId}-title`} onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}>
      <header className={styles.categoryShowcaseHead}>
        <div>
          <span>Inspirez-vous</span>
          <h2 id={`${panelId}-title`}>Des produits pour chaque envie</h2>
          <p>Passez d’une catégorie à l’autre et faites défiler les produits sans quitter l’accueil.</p>
        </div>
        <Link href="/catalogue">Explorer tout le catalogue <span aria-hidden="true">→</span></Link>
      </header>

      <div
        ref={listeTabs}
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
            onClick={() => activer(item.slug, true)}
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
        data-sortie={sortie || undefined}
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
