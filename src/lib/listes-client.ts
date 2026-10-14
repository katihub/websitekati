'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { api, apiDisponible, ErreurApi } from './api'
import { useSession } from './session'

/**
 * LES LISTES DU CLIENT : FAVORIS ET ARTICLES MIS DE COTE.
 *
 * Le navigateur en garde toujours une copie, lue sans attendre le reseau ;
 * un client connecte a en plus la sienne sur son compte. A la connexion, la
 * copie du navigateur est versee dans le compte (union), puis le compte fait
 * foi et la copie locale le reflete : la liste suit le client d'un appareil a
 * l'autre, et rien de ce qu'il avait note avant de se connecter n'est perdu.
 */

export type ListeClient = 'favori' | 'de_cote'

/** Ce qu'il faut pour afficher et rouvrir un element sans rappeler l'API. */
export interface ElementListe {
  offreId: string
  slug: string
  nom: string
  prixFcfa: number | null
  image: string | null
  boutiqueId: string | null
  boutiqueNom: string | null
  boutiqueSlug: string | null
  quantite: number
}

interface ElementServeur {
  offreId: string
  quantite: number
  offre: {
    titre: string | null
    prixFcfa: number | null
    libelleVariante: string | null
    boutique: { id: string; nom: string; slug: string }
    produit: { nom: string; slug: string; images: Array<{ url: string }> }
  }
}

const CLES: Record<ListeClient, string> = { favori: 'katihub.favoris.v1', de_cote: 'katihub.articles-mis-de-cote.v2' }
const EVENEMENT = 'katihub:listes'
const VIDE = '[]'

function lireBrut(liste: ListeClient): string {
  try { return localStorage.getItem(CLES[liste]) ?? VIDE } catch { return VIDE }
}

export function lireListe(liste: ListeClient): ElementListe[] {
  try {
    const valeur = JSON.parse(lireBrut(liste))
    return Array.isArray(valeur) ? valeur.filter((e) => typeof e?.offreId === 'string' && typeof e?.slug === 'string') : []
  } catch { return [] }
}

function ecrireListe(liste: ListeClient, elements: ElementListe[]) {
  try { localStorage.setItem(CLES[liste], JSON.stringify(elements)) } catch { /* Navigateur sans stockage : la liste vit le temps de la page. */ }
  window.dispatchEvent(new Event(EVENEMENT))
}

function depuisServeur(e: ElementServeur): ElementListe {
  const nom = e.offre.libelleVariante ? `${e.offre.titre ?? e.offre.produit.nom} — ${e.offre.libelleVariante}` : (e.offre.titre ?? e.offre.produit.nom)
  return {
    offreId: e.offreId, slug: e.offre.produit.slug, nom, prixFcfa: e.offre.prixFcfa, image: e.offre.produit.images[0]?.url ?? null,
    boutiqueId: e.offre.boutique.id, boutiqueNom: e.offre.boutique.nom, boutiqueSlug: e.offre.boutique.slug, quantite: e.quantite,
  }
}

const sAbonner = (rappel: () => void) => {
  window.addEventListener('storage', rappel)
  window.addEventListener(EVENEMENT, rappel)
  return () => { window.removeEventListener('storage', rappel); window.removeEventListener(EVENEMENT, rappel) }
}

export function useListeClient(liste: ListeClient) {
  const { session } = useSession()
  const brut = useSyncExternalStore(sAbonner, () => lireBrut(liste), () => VIDE)
  const elements = (() => { try { const v = JSON.parse(brut); return Array.isArray(v) ? (v as ElementListe[]) : [] } catch { return [] } })()
  const fusionne = useRef<string | null>(null)

  // A la connexion : la copie locale rejoint le compte, puis le compte fait foi.
  useEffect(() => {
    if (!apiDisponible || !session || fusionne.current === session.userId) return
    fusionne.current = session.userId
    const locaux = lireListe(liste).map((e) => ({ offreId: e.offreId, quantite: e.quantite }))
    api<ElementServeur[]>(`/marketplace/listes/${liste}/fusion`, { methode: 'PUT', corps: { elements: locaux } })
      .then((serveur) => ecrireListe(liste, serveur.map(depuisServeur)))
      .catch((e) => { if (!(e instanceof ErreurApi && e.code === 401)) fusionne.current = null })
  }, [liste, session])

  const ajouter = useCallback((element: ElementListe) => {
    ecrireListe(liste, [element, ...lireListe(liste).filter((e) => e.offreId !== element.offreId)])
    if (session && apiDisponible) void api(`/marketplace/listes/${liste}`, { methode: 'POST', corps: { offreId: element.offreId, quantite: element.quantite } }).catch(() => undefined)
  }, [liste, session])

  const retirer = useCallback((offreId: string) => {
    ecrireListe(liste, lireListe(liste).filter((e) => e.offreId !== offreId))
    if (session && apiDisponible) void api(`/marketplace/listes/${liste}/${offreId}`, { methode: 'DELETE' }).catch(() => undefined)
  }, [liste, session])

  const contient = useCallback((offreId: string) => elements.some((e) => e.offreId === offreId), [elements])

  return { elements, ajouter, retirer, contient }
}
