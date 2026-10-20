'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api'

/**
 * LES CATEGORIES DE LA MARKETPLACE, TELLES QUE LE MARCHAND LES CHOISIT.
 *
 * KatiMarket seul les cree. Une categorie qui a des sous-categories ne recoit pas
 * de produit directement : le marchand choisit alors la sous-categorie. La
 * garantie est un minimum que ses offres ne peuvent pas descendre.
 */

export type GarantieCategorie = { mois: number; unite: 'mois' | 'annees'; heritee: boolean; libelle: string }
export type SousCategorie = { id: string; nom: string; slug: string; garantie: GarantieCategorie; sousCategories: SousCategorie[] }
export type CategorieMarketplace = SousCategorie & { sousCategories: SousCategorie[] }

/** La categorie d'un produit telle que l'API la rend avec lui. */
export type CategorieProduit = {
  id: string
  nom: string
  slug: string
  parent: { id: string; nom: string; slug: string } | null
  garantieMinimaleMois: number
  garantie: string
} | null

export function cheminCategorie(categorie: CategorieProduit | undefined, repli?: string | null): string {
  if (!categorie) return repli || 'Sans catégorie'
  return categorie.parent ? `${categorie.parent.nom} › ${categorie.nom}` : categorie.nom
}

/** « 6 mois », « 1 an », « 2 ans » ; « aucune garantie imposée » pour 0. */
export function libelleMois(mois: number): string {
  if (mois <= 0) return 'aucune garantie imposée'
  if (mois % 12 === 0) return mois === 12 ? '1 an' : `${mois / 12} ans`
  return `${mois} mois`
}

export function useCategoriesMarketplace() {
  const [categories, setCategories] = useState<CategorieMarketplace[] | null>(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    let actif = true
    api<CategorieMarketplace[]>('/marketplace/categories', { anonyme: true })
      .then((arbre) => { if (actif) setCategories(arbre) })
      .catch(() => { if (actif) setErreur('Les catégories ne peuvent pas être chargées. Réessayez dans un instant.') })
    return () => { actif = false }
  }, [])
  return { categories, erreur }
}
