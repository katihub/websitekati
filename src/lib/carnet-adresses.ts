'use client'

import { useEffect, useState } from 'react'

import { api } from './api'

/**
 * LE CARNET D'ADRESSES DU CLIENT CONNECTE, A LA COMMANDE.
 *
 * Le client choisit une adresse enregistree, ou en saisit une nouvelle qu'il
 * peut garder pour la prochaine fois. Seules les adresses de livraison a
 * domicile servent ici : le retrait marketplace se fait a la boutique.
 */
export interface AdresseClient {
  id: string
  mode: 'domicile' | 'retrait' | 'agence'
  ville: string
  quartier: string | null
  repere: string | null
  telephoneDestinataire: string | null
  parDefaut: boolean
}

export function useCarnetAdresses(actif: boolean): AdresseClient[] {
  const [adresses, setAdresses] = useState<AdresseClient[]>([])
  useEffect(() => {
    if (!actif) return
    const controleur = new AbortController()
    void api<{ adresses?: AdresseClient[] }>('/profil', { signal: controleur.signal })
      .then((reponse) => {
        if (!controleur.signal.aborted) setAdresses((reponse?.adresses ?? []).filter((a) => a.mode === 'domicile'))
      })
      .catch(() => { /* Sans carnet, le client saisit son adresse. */ })
    return () => controleur.abort()
  }, [actif])
  return actif ? adresses : []
}

/** Enregistre une nouvelle adresse de livraison ; un echec n'empeche pas la commande. */
export async function enregistrerAdresse(adresse: { ville: string; quartier: string; repere: string; telephoneDestinataire: string }): Promise<boolean> {
  try {
    await api('/adresses', { methode: 'POST', corps: { mode: 'domicile', ...adresse } })
    return true
  } catch {
    return false
  }
}

export function libelleAdresse(a: Pick<AdresseClient, 'ville' | 'quartier' | 'repere'>): string {
  return [a.quartier, a.ville].filter(Boolean).join(', ') + (a.repere ? ` — ${a.repere}` : '')
}
