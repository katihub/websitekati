'use client'

import { useEffect, useState } from 'react'

import { api } from './api'

/**
 * LES VILLES ET QUARTIERS DES LISTES DEROULANTES, TENUS PAR KATIHUB.
 *
 * Des suggestions : un quartier absent de la liste se saisit librement
 * (« Autre quartier »). Sans reseau, les listes sont vides et les champs
 * restent des champs texte.
 */
export interface Localite { ville: string; quartiers: string[] }

export function useLocalites(): Localite[] {
  const [localites, setLocalites] = useState<Localite[]>([])
  useEffect(() => {
    const controleur = new AbortController()
    void api<Localite[]>('/marketplace/localites', { anonyme: true, signal: controleur.signal })
      .then((valeur) => { if (!controleur.signal.aborted && Array.isArray(valeur)) setLocalites(valeur) })
      .catch(() => { /* Les champs restent libres. */ })
    return () => controleur.abort()
  }, [])
  return localites
}

/** Les quartiers proposes pour une ville ; vide si la ville n'a pas de liste. */
export function quartiersDe(localites: readonly Localite[], ville: string): string[] {
  const cle = ville.trim().toLocaleLowerCase('fr')
  return localites.find((l) => l.ville.toLocaleLowerCase('fr') === cle)?.quartiers ?? []
}
