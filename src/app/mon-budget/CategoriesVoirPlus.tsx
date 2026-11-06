'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import styles from './mon-budget.module.css'

export function CategoriesVoirPlus({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const fermerHorsCadre = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node)) {
        if (details.current) details.current.open = false
      }
    }

    document.addEventListener('pointerdown', fermerHorsCadre)
    return () => document.removeEventListener('pointerdown', fermerHorsCadre)
  }, [])

  return (
    <details
      ref={details}
      className={styles.moreCategories}
      onClick={(event) => {
        if ((event.target as Element).closest('a')) {
          event.currentTarget.open = false
        }
      }}
    >
      <summary>Voir plus</summary>
      <div>{children}</div>
    </details>
  )
}
