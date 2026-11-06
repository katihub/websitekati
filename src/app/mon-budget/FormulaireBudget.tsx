'use client'

import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react'

import styles from './mon-budget.module.css'

export function FormulaireBudget({ children }: { children: ReactNode }) {
  const form = useRef<HTMLFormElement>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current)
  }, [])

  function actualiser(event: ChangeEvent<HTMLFormElement>) {
    const cible = event.target
    if (
      (!(cible instanceof HTMLInputElement) && !(cible instanceof HTMLSelectElement))
      || !cible.matches('[data-auto-submit]')
    ) return
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => form.current?.requestSubmit(), 120)
  }

  return (
    <form ref={form} action="/mon-budget" method="get" className={styles.filters} onChange={actualiser}>
      {children}
    </form>
  )
}
