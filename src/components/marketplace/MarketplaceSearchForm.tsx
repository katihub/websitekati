'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { ImageSearchButton } from '@/components/layout/ImageSearchButton'
import { enregistrerRechercheClient } from '@/lib/customer-search'
import type { MarketplaceSuggestReply, MarketplaceSuggestion } from '@/types/marketplace-suggest'
import styles from './marketplace-shell-v2.module.css'

const argent = new Intl.NumberFormat('fr-FR')

export function MarketplaceSearchForm({ className }: { className: string }) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [answer, setAnswer] = useState<{
    query: string
    produits: readonly MarketplaceSuggestion[] | null
  } | null>(null)
  const asked = query.trim()
  const settled = answer?.query === asked ? answer : null
  const loading = asked.length >= 2 && !settled
  const searchHref = `/recherche?q=${encodeURIComponent(asked)}`

  useEffect(() => {
    if (asked.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(`/api/marketplace-suggest?q=${encodeURIComponent(asked)}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status))
          return response.json() as Promise<MarketplaceSuggestReply>
        })
        .then((reply) => {
          if (reply.query === asked) setAnswer({ query: asked, produits: reply.produits })
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setAnswer({ query: asked, produits: null })
        })
    }, 200)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [asked])

  useEffect(() => {
    if (!open) return
    const fermer = (event: PointerEvent) => {
      if (!form.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', fermer)
    return () => document.removeEventListener('pointerdown', fermer)
  }, [open])

  const produits = settled?.produits ?? []
  const nombreOptions = produits.length + (asked.length >= 2 ? 1 : 0)

  const choisir = (href: string) => {
    enregistrerRechercheClient(asked)
    setOpen(false)
    setActive(null)
    router.push(href)
  }

  return (
    <form
      ref={form}
      action="/recherche"
      className={className}
      data-marketplace-search
      onSubmit={(event) => {
        if (open && active !== null) {
          event.preventDefault()
          const produit = produits[active]
          choisir(produit
            ? `/marketplace/produits/${produit.slug}?boutique=${encodeURIComponent(produit.boutique.slug)}`
            : searchHref)
          return
        }
        const donnees = new FormData(event.currentTarget)
        enregistrerRechercheClient(String(donnees.get('q') ?? ''))
        setOpen(false)
      }}
    >
      <label htmlFor="katihub-search" className="sr-only">Rechercher</label>
      <input
        id="katihub-search"
        name="q"
        value={query}
        placeholder="Rechercher un produit, une boutique…"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && asked.length > 0}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active !== null ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => { if (asked.length > 0) setOpen(true) }}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(null)
          setOpen(event.target.value.trim().length > 0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            setActive(null)
            return
          }
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          if (!nombreOptions) return
          event.preventDefault()
          setOpen(true)
          setActive((courant) => {
            const depart = courant ?? (event.key === 'ArrowDown' ? -1 : 0)
            const suivant = depart + (event.key === 'ArrowDown' ? 1 : -1)
            return (suivant + nombreOptions) % nombreOptions
          })
        }}
      />
      <ImageSearchButton />
      <button type="submit" aria-label="Lancer la recherche">⌕</button>

      {open && asked.length > 0 ? (
        <div id={listId} role="listbox" aria-label={`Suggestions pour ${asked}`} className={styles.searchSuggestions}>
          {asked.length < 2 ? (
            <p className={styles.searchMessage}>Saisissez encore une lettre pour voir les produits.</p>
          ) : loading ? (
            <p className={styles.searchMessage} role="status">Recherche des produits…</p>
          ) : settled?.produits === null ? (
            <p className={styles.searchMessage}>Les suggestions sont momentanément indisponibles.</p>
          ) : (
            <>
              {produits.length ? (
                <div className={styles.searchProductList}>
                  {produits.map((produit, index) => {
                    const href = `/marketplace/produits/${produit.slug}?boutique=${encodeURIComponent(produit.boutique.slug)}`
                    return (
                      <Link
                        key={produit.id}
                        id={`${listId}-${index}`}
                        href={href}
                        role="option"
                        aria-selected={active === index}
                        className={active === index ? styles.searchSuggestionActive : undefined}
                        onPointerEnter={() => setActive(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          enregistrerRechercheClient(asked)
                          setOpen(false)
                        }}
                      >
                        <span className={styles.searchSuggestionImage}>
                          {produit.image
                            ? <Image src={produit.image} alt="" fill sizes="56px" />
                            : <span aria-hidden>□</span>}
                        </span>
                        <span className={styles.searchSuggestionCopy}>
                          <strong>{produit.nom}</strong>
                          <small>{produit.boutique.nom}</small>
                        </span>
                        <span className={styles.searchSuggestionPrice}>
                          {produit.prixFcfa === null
                            ? 'Prix sur demande'
                            : `${argent.format(produit.prixFcfa)} FCFA`}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ) : <p className={styles.searchMessage}>Aucun produit ne correspond à cette recherche.</p>}
              <Link
                id={`${listId}-${produits.length}`}
                href={searchHref}
                role="option"
                aria-selected={active === produits.length}
                className={`${styles.searchAllResults} ${active === produits.length ? styles.searchSuggestionActive : ''}`}
                onPointerEnter={() => setActive(produits.length)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  enregistrerRechercheClient(asked)
                  setOpen(false)
                }}
              >
                Voir tous les résultats pour « {asked} » <span aria-hidden>→</span>
              </Link>
            </>
          )}
        </div>
      ) : null}
    </form>
  )
}
