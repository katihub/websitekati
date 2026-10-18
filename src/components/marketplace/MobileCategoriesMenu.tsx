'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import type { CategorieArbre } from '@/lib/marketplace-data'
import styles from './marketplace-shell-v2.module.css'

export function MobileCategoriesMenu({ categories }: { categories: readonly CategorieArbre[] }) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      container.current?.querySelector<HTMLButtonElement>('button')?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div
      ref={container}
      className={styles.mobileCategories}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setOpen(false)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        className={styles.mobileCategoriesButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">▦</span>
        Toutes les catégories
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {open ? (
        <section
          id={panelId}
          className={styles.mobileMegaMenu}
          aria-label="Toutes les catégories et sous-catégories"
          onClick={(event) => {
            if ((event.target as Element).closest('a')) setOpen(false)
          }}
        >
          <header>
            <div>
              <strong>Explorez les catégories</strong>
              <p>Trouvez rapidement le rayon qui vous intéresse.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu des catégories">×</button>
          </header>
          <div className={styles.mobileMegaGrid}>
            {categories.map((categorie) => (
              <section key={categorie.id} className={styles.mobileMegaCategory}>
                <Link href={`/categories/${categorie.slug}`} className={styles.mobileMegaTitle}>
                  {categorie.nom}<span aria-hidden="true">→</span>
                </Link>
                {categorie.sousCategories.length ? (
                  <ul>
                    {categorie.sousCategories.map((sousCategorie) => (
                      <li key={sousCategorie.id}>
                        <Link href={`/categories/${sousCategorie.slug}`}>{sousCategorie.nom}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.mobileMegaEmpty}>Voir tous les produits</span>
                )}
              </section>
            ))}
          </div>
          <Link href="/categories" className={styles.mobileMegaAll}>Voir la page de toutes les catégories <span aria-hidden="true">→</span></Link>
        </section>
      ) : null}
    </div>
  )
}
