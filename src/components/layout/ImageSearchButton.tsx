'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { IconCamera, IconClose, IconSearch } from '@/components/brand/Icons'
import { reduireImage } from '@/lib/reduire-image'

type Etat = 'pret' | 'analyse' | 'erreur'

export function ImageSearchButton() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const apercuActuel = useRef('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [apercu, setApercu] = useState('')
  const [etat, setEtat] = useState<Etat>('pret')
  const [message, setMessage] = useState('')

  useEffect(() => () => {
    if (apercuActuel.current) URL.revokeObjectURL(apercuActuel.current)
  }, [])

  const fermer = useCallback(() => {
    if (apercuActuel.current) URL.revokeObjectURL(apercuActuel.current)
    apercuActuel.current = ''
    setFichier(null)
    setApercu('')
    setEtat('pret')
    setMessage('')
    if (input.current) input.current.value = ''
  }, [])

  useEffect(() => {
    if (!fichier) return
    function fermerAvecEchap(event: KeyboardEvent) {
      if (event.key === 'Escape' && etat !== 'analyse') fermer()
    }
    document.addEventListener('keydown', fermerAvecEchap)
    return () => document.removeEventListener('keydown', fermerAvecEchap)
  }, [fichier, etat, fermer])

  async function rechercher() {
    if (!fichier || etat === 'analyse') return
    setEtat('analyse')
    setMessage('Préparation de la photo…')
    // Trente secondes au plus : le serveur s'arrete a vingt pour l'analyse.
    const delai = new AbortController()
    const minuterie = setTimeout(() => delai.abort(), 30_000)
    try {
      let envoi: Blob = fichier
      try {
        envoi = await reduireImage(fichier)
      } catch {
        // Un navigateur qui ne sait pas lire ce format : le serveur tranchera.
        if (fichier.size > 6 * 1024 * 1024) throw new Error('Cette photo est trop lourde. Choisissez une image de moins de 6 Mo.')
      }
      setMessage('Nous identifions le produit visible…')
      const body = new FormData()
      body.set('image', envoi, 'photo.jpg')
      const reponse = await fetch('/api/recherche-image', { method: 'POST', body, signal: delai.signal })
      const resultat = await reponse.json().catch(() => ({})) as { query?: string; label?: string; total?: number; message?: string }
      if (!reponse.ok || !resultat.query) throw new Error(resultat.message || 'La photo n’a pas pu être analysée. Réessayez dans un instant.')
      setMessage(resultat.total
        ? `${resultat.label || 'Produit reconnu'} — ouverture des résultats…`
        : `${resultat.label || 'Produit reconnu'} — aucun produit identique en vente, voici les plus proches…`)
      const params = new URLSearchParams({ q: resultat.query, source: 'image' })
      router.push(`/recherche?${params}`)
      fermer()
    } catch (cause) {
      setEtat('erreur')
      setMessage(cause instanceof DOMException && cause.name === 'AbortError'
        ? 'L’analyse prend trop de temps. Vérifiez votre connexion et réessayez.'
        : cause instanceof Error ? cause.message : 'La recherche par image est indisponible.')
    } finally {
      clearTimeout(minuterie)
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const prochain = event.target.files?.[0] ?? null
          if (!prochain) return
          if (apercuActuel.current) URL.revokeObjectURL(apercuActuel.current)
          const url = URL.createObjectURL(prochain)
          apercuActuel.current = url
          setApercu(url)
          setFichier(prochain)
          setEtat('pret')
          setMessage('')
        }}
      />
      <button
        type="button"
        data-image-search-trigger
        className="press grid w-11 shrink-0 place-items-center border-l border-rule text-ink-2 transition-colors hover:bg-surface hover:text-secondary"
        aria-label="Rechercher un produit avec une photo"
        title="Rechercher avec une photo"
        onClick={() => input.current?.click()}
      >
        <IconCamera className="text-[1.2rem]" />
      </button>

      {fichier && typeof document !== 'undefined' ? createPortal((
        <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#061f4fcc] p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && etat !== 'analyse') fermer() }}>
          <section role="dialog" aria-modal="true" aria-labelledby="image-search-title" className="w-full max-w-[520px] overflow-hidden rounded-[16px] border border-rule bg-paper shadow-[0_28px_80px_#061f4f66]">
            <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
              <div>
                <p className="t-label text-secondary">Recherche visuelle</p>
                <h2 id="image-search-title" className="mt-1 text-[1.2rem] font-bold text-ink">Retrouver ce produit</h2>
              </div>
              <button type="button" onClick={fermer} disabled={etat === 'analyse'} aria-label="Fermer" className="press grid size-10 place-items-center rounded-full border border-rule text-ink-2 disabled:opacity-40"><IconClose /></button>
            </header>

            <div className="p-5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-surface">
                {apercu ? <Image src={apercu} alt="Photo choisie pour la recherche" fill unoptimized className="object-contain" sizes="480px" /> : null}
                {etat === 'analyse' ? <div className="absolute inset-0 grid place-items-center bg-[#ffffffd9]"><span className="flex items-center gap-3 text-small font-semibold text-ink"><i className="size-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />Analyse de la photo…</span></div> : null}
              </div>
              <p className="mt-4 text-small leading-[1.55] text-ink-2">Pour de meilleurs résultats, cadrez un seul produit et rendez sa marque ou sa référence visible.</p>
              {message ? <p role="status" aria-live="polite" className={`mt-3 rounded-[8px] px-3 py-2 text-small ${etat === 'erreur' ? 'bg-[#fff0ed] text-[#a72d18]' : 'bg-surface text-ink-2'}`}>{message}</p> : null}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => input.current?.click()} disabled={etat === 'analyse'} className="press min-h-11 rounded-[8px] border border-rule px-4 text-small font-semibold text-ink disabled:opacity-50">Choisir une autre photo</button>
                <button type="button" onClick={() => void rechercher()} disabled={etat === 'analyse'} className="press flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-secondary px-5 text-small font-bold text-on-surface disabled:opacity-60"><IconSearch />{etat === 'analyse' ? 'Analyse en cours…' : 'Rechercher ce produit'}</button>
              </div>
            </div>
          </section>
        </div>
      ), document.body) : null}
    </>
  )
}
