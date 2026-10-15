'use client'

import { useEffect, useState } from 'react'

import { api, apiDisponible } from './api'

/** Les taux KATI en vigueur, tels que le backend les publie. */
export type PolitiqueKati = {
  version: number
  katiParFcfa: number
  gainClientBps: number
  commissionParrainBps: number
  assiette: 'produits' | 'produits_et_livraison'
  liberationApresLivraisonJours: number
  parrainageDureeMois: number
  depenseMinimumKati: number
  depensePlafondBps: number
  expirationGainsMois: number
  rechargeActive: boolean
}

export type GainEnAttente = { id: string; libelle: string; commande: string | null; commission: boolean; points: number; disponibleLe: string | null }

export type PortefeuilleKati = {
  disponible: number
  enAttente: number
  reserve: number
  valeurFcfa: { disponible: number; enAttente: number }
  katiParFcfa: number
  gainsEnAttente: GainEnAttente[]
}

export type TypeOperationKati = 'attribution' | 'liberation' | 'reservation' | 'utilisation' | 'annulation' | 'expiration' | 'correction'

export type OperationKati = {
  id: string
  type: TypeOperationKati
  libelle: string
  creeLe: string
  commande: string | null
  commission: boolean
  disponible: number
  enAttente: number
  reserve: number
}

export type HistoriqueKati = { total: number; page: number; taille: number; elements: OperationKati[] }

/** Ce que la commande rapporte au client, dans son suivi. */
export type KatiCommande = { points: number; liberes: boolean; disponibleLe: string | null } | null

export const formatKati = (points: number) => `${new Intl.NumberFormat('fr-FR').format(points)} KATI`

/** Les KATI que rapporte un montant, arrondis a l'entier inferieur, comme le backend. */
export function katiPourMontant(montantFcfa: number, tauxBps: number, katiParFcfa: number) {
  if (!Number.isSafeInteger(montantFcfa) || montantFcfa <= 0 || tauxBps <= 0) return 0
  return Math.floor((montantFcfa * tauxBps * katiParFcfa) / 10_000)
}

let politiqueEnCache: Promise<PolitiqueKati | null> | null = null

/** La politique publique, lue une fois par page : elle change rarement. */
export function lirePolitiqueKati(): Promise<PolitiqueKati | null> {
  if (!apiDisponible) return Promise.resolve(null)
  politiqueEnCache ??= api<PolitiqueKati>('/marketplace/kati/politique', { anonyme: true }).catch(() => {
    politiqueEnCache = null
    return null
  })
  return politiqueEnCache
}

export function usePolitiqueKati() {
  const [politique, setPolitique] = useState<PolitiqueKati | null>(null)
  useEffect(() => {
    let actif = true
    void lirePolitiqueKati().then((valeur) => { if (actif) setPolitique(valeur) })
    return () => { actif = false }
  }, [])
  return politique
}

/** Les KATI qu'un montant de produits rapporterait au client, ou null tant que la politique n'est pas lue. */
export function useGainKati(montantFcfa: number) {
  const politique = usePolitiqueKati()
  if (!politique) return null
  return { points: katiPourMontant(montantFcfa, politique.gainClientBps, politique.katiParFcfa), politique }
}
