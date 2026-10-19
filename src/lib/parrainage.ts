'use client'

import { api, apiDisponible } from './api'

/**
 * LE CODE DE PARRAINAGE GARDE PAR LE NAVIGATEUR.
 *
 * Un visiteur arrive par un lien `?p=CODE` : le code et un jeton de clic sont
 * gardes 30 jours, le temps qu'il cree son compte. Le rattachement lui-meme se
 * fait cote serveur, une fois connecte : le navigateur ne fait que proposer.
 */

const CLE = 'katihub.parrainage.v1'
const DUREE_MS = 30 * 24 * 60 * 60_000

export type ParrainageGarde = { code: string; jeton: string; le: number }

export type MonParrainage = {
  code: string
  lien: string
  commissionBps: number
  dureeMois: number
  parrain: { depuis: string; jusquau: string } | null
  peutEtreParraine: boolean
  filleuls: number
  commissionsGagnees: number
}

export const normaliserCode = (saisie: string) => saisie.trim().toUpperCase().replace(/\s+/g, '')
export const estCodeParrainage = (saisie: string) => /^[A-Z]{2}\d{6}$/.test(normaliserCode(saisie))

function nouveauJeton() {
  const octets = new Uint8Array(24)
  crypto.getRandomValues(octets)
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('')
}

export function lireParrainageGarde(): ParrainageGarde | null {
  try {
    const valeur = JSON.parse(localStorage.getItem(CLE) ?? 'null') as ParrainageGarde | null
    if (!valeur?.code || !valeur.jeton || Date.now() - valeur.le > DUREE_MS) return null
    return valeur
  } catch {
    return null
  }
}

export function oublierParrainage() {
  try { localStorage.removeItem(CLE) } catch { /* stockage indisponible */ }
}

/** Garde un code (lien suivi ou saisie a l'inscription) ; le premier lien suivi l'emporte pendant 30 jours. */
export function garderParrainage(code: string): ParrainageGarde | null {
  const existant = lireParrainageGarde()
  if (existant) return existant
  const normalise = normaliserCode(code)
  if (!estCodeParrainage(normalise)) return null
  const garde = { code: normalise, jeton: nouveauJeton(), le: Date.now() }
  try { localStorage.setItem(CLE, JSON.stringify(garde)) } catch { return null }
  return garde
}

/** Le visiteur arrive par un lien : le clic est note cote serveur (empreinte du jeton seule). */
export async function noterClic(garde: ParrainageGarde) {
  if (!apiDisponible) return
  try {
    const { valide } = await api<{ valide: boolean }>('/marketplace/kati/parrainage/clics', { methode: 'POST', corps: { code: garde.code, jeton: garde.jeton } })
    if (!valide) oublierParrainage()
  } catch { /* le lien reste garde : le rattachement verifiera le code */ }
}

/** Rattache le client connecte a son parrain ; le code garde est oublie en cas de succes ou de refus definitif. */
export async function rattacher(code: string, jeton?: string) {
  const resultat = await api<{ depuis: string; jusquau: string }>('/marketplace/kati/parrainage', {
    methode: 'POST',
    corps: { code: normaliserCode(code), ...(jeton ? { jeton } : {}) },
  })
  oublierParrainage()
  return resultat
}
