'use client'

import { useCallback, useEffect, useState } from 'react'

import { api } from '@/lib/api'
import type { DeliveryMode } from '@/lib/modes-livraison'

/**
 * LA GRILLE DES FRAIS DE LIVRAISON, LUE POUR LES AFFICHER AVANT LA COMMANDE.
 *
 * Elle est tenue par KatiMarket et la commande recalcule les frais cote serveur ;
 * l'ecran envoie ce qu'il a affiche, et un changement de grille entre-temps est
 * refuse (409) plutot que facture sans que le client l'ait vu.
 */

export interface TarifLivraison { quartierId: string; quartier: string; ville: string; mode: DeliveryMode; montantFcfa: number; gratuitDesFcfa: number | null }

/** Les frais d'une boutique ; `null` quand ce mode n'est pas propose dans cette ville. Meme regle que le serveur : le retrait est gratuit. */
export function fraisBoutique(tarifs: readonly TarifLivraison[], quartierId: string, mode: DeliveryMode, totalProduitsFcfa: number): number | null {
  if (mode === 'retrait') return 0
  if (!['katihub', 'vendeur'].includes(mode)) return null
  const tarif = tarifs.find((t) => t.mode === mode && t.quartierId === quartierId)
  if (!tarif) return null
  return tarif.gratuitDesFcfa !== null && totalProduitsFcfa >= tarif.gratuitDesFcfa ? 0 : tarif.montantFcfa
}

export function useTarifsLivraison() {
  const [tarifs, setTarifs] = useState<TarifLivraison[] | null>(null)
  const [erreur, setErreur] = useState('')
  const charger = useCallback(async () => {
    try {
      setTarifs(await api<TarifLivraison[]>('/marketplace/livraison/tarifs', { anonyme: true }))
      setErreur('')
    } catch {
      setErreur('Les frais de livraison ne peuvent pas être calculés pour le moment.')
    }
  }, [])
  useEffect(() => {
    const minuterie = window.setTimeout(() => void charger(), 0)
    return () => window.clearTimeout(minuterie)
  }, [charger])
  return { tarifs, erreur, recharger: charger }
}
