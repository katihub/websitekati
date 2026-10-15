'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * LES COMMANDES PASSEES SANS COMPTE, ET LEUR CLE.
 *
 * Une commande sans compte s'ouvre avec le jeton que le backend rend a sa
 * creation : sans session, c'est lui qui prouve qu'elle est la notre. Il voyage
 * dans l'adresse de la page de suivi — `/commande/CM-XXXXXX?suivi=…` — pour que
 * le lien se garde, se partage sur WhatsApp ou se retrouve dans le courriel de
 * confirmation.
 *
 * IL EST AUSSI GARDE DANS CE NAVIGATEUR, par reference. La page de paiement, un
 * rechargement sans le parametre, un retour depuis l'historique : la commande
 * s'ouvre encore sur l'appareil qui l'a passee. Sur un autre appareil, c'est le
 * lien qui fait foi.
 *
 * Le stockage peut manquer — navigation privee, site bloque : chaque lecture
 * et chaque ecriture est protegee, et le lien reste alors la seule cle.
 */

const CLE = 'nowtech:commandes-sans-compte'
/** Assez pour un client qui commande souvent, pas assez pour grossir sans fin. */
const GARDEES = 20

export const PARAMETRE_SUIVI = 'suivi'

function lire(): Record<string, string> {
  try {
    const brut = window.localStorage.getItem(CLE)
    const valeur: unknown = brut ? JSON.parse(brut) : {}
    return valeur && typeof valeur === 'object' ? (valeur as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function memoriserSuivi(reference: string, jeton: string): void {
  try {
    const entrees = Object.entries(lire()).filter(([ref]) => ref !== reference.toUpperCase())
    const gardees = [...entrees, [reference.toUpperCase(), jeton] as const].slice(-GARDEES)
    window.localStorage.setItem(CLE, JSON.stringify(Object.fromEntries(gardees)))
  } catch {
    /* Le lien reste la cle ; rien d'autre a faire. */
  }
}

export function jetonMemorise(reference: string): string | null {
  return lire()[reference.toUpperCase()] ?? null
}

/**
 * Le jeton de la page : celui de l'adresse s'il y en a un — il est alors garde
 * pour la suite —, sinon celui que ce navigateur a garde.
 */
export function resoudreJeton(reference: string, jetonUrl: string | undefined): string | null {
  if (jetonUrl) {
    memoriserSuivi(reference, jetonUrl)
    return jetonUrl
  }
  return jetonMemorise(reference)
}

const sansAbonnement = () => () => {}

/**
 * Le jeton d'une page sans compte, pour un composant : celui du lien, sinon
 * celui garde par ce navigateur. `undefined` au rendu serveur, le temps que le
 * navigateur le lise ; `null` sans jeton, ou quand `actif` est faux.
 */
export function useJetonSuivi(reference: string, jetonUrl: string | undefined, actif = true): string | null | undefined {
  useEffect(() => { if (actif && jetonUrl) memoriserSuivi(reference, jetonUrl) }, [actif, reference, jetonUrl])
  return useSyncExternalStore(
    sansAbonnement,
    () => (actif ? jetonUrl ?? jetonMemorise(reference) : null),
    () => (actif ? undefined : null),
  )
}

/** La page de la commande — ou `page` en dessous, `/paiement` — jeton compris quand il y en a un. */
export function lienCommande(reference: string, jeton: string | null, page = ''): string {
  const chemin = `/commande/${encodeURIComponent(reference)}${page}`
  return jeton ? `${chemin}?${PARAMETRE_SUIVI}=${encodeURIComponent(jeton)}` : chemin
}
