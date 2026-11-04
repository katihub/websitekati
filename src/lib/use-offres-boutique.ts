'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { BoutiquePubliqueMarketplace, OffreBoutiqueMarketplace } from '@/lib/marketplace-data'
import type { ShopSort } from '@/lib/shop-catalogue'

interface Filtres { query: string; category: string; sort: ShopSort }
type Statut = 'pret' | 'chargement' | 'erreur'
interface Etat { cle: string; offres: OffreBoutiqueMarketplace[]; page: number; pages: number; total: number; statut: Statut }
interface Lot { offres: OffreBoutiqueMarketplace[]; pagination: { page: number; pages: number; total: number } }

const CLE_DEPART = JSON.stringify(['', '', 'recent'])

async function lireLot(slug: string, { query, category, sort }: Filtres, page: number, signal: AbortSignal): Promise<Lot> {
  const parametres = new URLSearchParams({ boutique: slug, page: String(page), tri: sort })
  if (query) parametres.set('q', query)
  if (category) parametres.set('categorie', category)
  const reponse = await fetch(`/api/boutique-offres?${parametres}`, { signal })
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`)
  return await reponse.json() as Lot
}

const etatDuLot = (cle: string, deja: OffreBoutiqueMarketplace[], lot: Lot): Etat => ({
  cle,
  offres: [...deja, ...lot.offres],
  page: lot.pagination.page,
  pages: lot.pagination.pages,
  total: lot.pagination.total,
  statut: 'pret',
})

/**
 * LES PRODUITS D'UNE BOUTIQUE, LOT PAR LOT. Le serveur rend le premier lot sans
 * filtre ; recherche, categorie et tri relisent le backend, car le navigateur ne
 * tient plus tout le catalogue de la boutique.
 */
export function useOffresBoutique(shop: BoutiquePubliqueMarketplace, filtres: Filtres) {
  const { query, category, sort } = filtres
  const slug = shop.slug
  const cle = JSON.stringify([query, category, sort])
  const [depart] = useState<Etat>(() => ({
    cle: CLE_DEPART,
    offres: shop.offres,
    page: 1,
    pages: shop.pagination?.pages ?? 1,
    total: shop.pagination?.total ?? shop.offres.length,
    statut: 'pret',
  }))
  const [etat, setEtat] = useState(depart)
  const lotSuivant = useRef<AbortController | null>(null)

  useEffect(() => {
    lotSuivant.current?.abort()
    if (cle === CLE_DEPART) return
    const controleur = new AbortController()
    lireLot(slug, { query, category, sort }, 1, controleur.signal)
      .then((lot) => { if (!controleur.signal.aborted) setEtat(etatDuLot(cle, [], lot)) })
      .catch(() => { if (!controleur.signal.aborted) setEtat({ cle, offres: [], page: 0, pages: 1, total: 0, statut: 'erreur' }) })
    return () => controleur.abort()
  }, [cle, slug, query, category, sort])

  // Tant que le premier lot d'un nouveau filtre n'est pas la, la liste est vide
  // et en chargement ; revenir sans filtre retrouve aussitot le rendu du serveur.
  const courant = useMemo<Etat>(() => (
    etat.cle === cle ? etat : cle === CLE_DEPART ? depart : { cle, offres: [], page: 0, pages: 1, total: 0, statut: 'chargement' }
  ), [etat, cle, depart])

  const suivant = useMemo(() => () => {
    if (courant.statut === 'chargement') return
    const controleur = new AbortController()
    lotSuivant.current = controleur
    setEtat({ ...courant, statut: 'chargement' })
    lireLot(slug, { query, category, sort }, courant.page + 1, controleur.signal)
      .then((lot) => { if (!controleur.signal.aborted) setEtat(etatDuLot(courant.cle, courant.offres, lot)) })
      .catch(() => { if (!controleur.signal.aborted) setEtat({ ...courant, statut: 'erreur' }) })
  }, [courant, slug, query, category, sort])

  return {
    offres: courant.offres,
    page: courant.page,
    total: courant.total,
    statut: courant.statut,
    reste: courant.page < courant.pages,
    suivant,
  }
}
