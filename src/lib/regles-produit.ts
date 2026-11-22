'use client'

import { useEffect, useState } from 'react'

import { api } from './api'

export type ReglesProduit = {
  version: number
  produit: { nomMin: number; nomMax: number; marqueMax: number; descriptionMax: number; descriptionCourteMin: number; descriptionCourteMax: number; ficheTechniqueMax: number; categoriesSupplementairesMax: number }
  variantes: { minimum: number; maximum: number; libelleMax: number; attributMax: number; prixMinFcfa: number; prixMaxFcfa: number; quantiteMinimaleMax: number; quantiteInitialeMax: number }
  vente: { garantieMaxMois: number; delaiMaxJours: number }
  images: { maximum: number; tailleMaxOctets: number; typesMime: string[]; envoisSimultanesMax: number }
}

/** Repli identique au contrat serveur : le formulaire reste utilisable hors ligne. */
export const REGLES_PRODUIT_REPLI: ReglesProduit = {
  version: 1,
  produit: { nomMin: 2, nomMax: 240, marqueMax: 120, descriptionMax: 10_000, descriptionCourteMin: 10, descriptionCourteMax: 300, ficheTechniqueMax: 20_000, categoriesSupplementairesMax: 2 },
  variantes: { minimum: 1, maximum: 20, libelleMax: 120, attributMax: 60, prixMinFcfa: 1, prixMaxFcfa: 2_000_000_000, quantiteMinimaleMax: 9_999, quantiteInitialeMax: 1_000_000 },
  vente: { garantieMaxMois: 120, delaiMaxJours: 3 },
  images: { maximum: 12, tailleMaxOctets: 5 * 1024 * 1024, typesMime: ['image/jpeg', 'image/png', 'image/webp'], envoisSimultanesMax: 2 },
}

let cache: ReglesProduit | null = null
let lecture: Promise<ReglesProduit> | null = null

function lireRegles() {
  if (cache) return Promise.resolve(cache)
  lecture ??= api<ReglesProduit>('/marketplace/regles-produit', { anonyme: true })
    .then((regles) => (cache = regles))
    .catch(() => REGLES_PRODUIT_REPLI)
  return lecture
}

export function useReglesProduit() {
  const [regles, setRegles] = useState(cache ?? REGLES_PRODUIT_REPLI)
  useEffect(() => {
    let actif = true
    void lireRegles().then((resultat) => { if (actif) setRegles(resultat) })
    return () => { actif = false }
  }, [])
  return regles
}
