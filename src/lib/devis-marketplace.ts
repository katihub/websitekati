import type { DeliveryMode } from './modes-livraison'

/**
 * LES DEVIS MARKETPLACE, COTE CLIENT ET COTE BOUTIQUE : les formes que l'API
 * rend, et les libelles qu'on en montre.
 */

export type StatutDevis = 'ouvert' | 'accepte' | 'annule'
export type StatutPartieDevis = 'en_attente' | 'confirmee' | 'refusee' | 'acceptee' | 'non_retenue'

export interface LigneDevis {
  id: string
  offreId: string
  rang: number
  produitNomCapture: string
  offreTitreCapture: string
  libelleVarianteCapture: string | null
  prixUnitaireFcfa: number
  quantiteDemandee: number
  quantiteConfirmee: number | null
  totalFcfa: number
  prixActuelFcfa: number | null
}

export interface PartieDevis {
  id: string
  reference: string
  boutiqueId: string
  statut: StatutPartieDevis
  totalFcfa: number
  delaiLivraisonJours: number | null
  valideJusquau: string | null
  messageVendeur: string | null
  motifRefus: string | null
  reponduLe: string | null
  boutique: { id: string; nom: string; slug: string; ville: string | null }
  lignes: LigneDevis[]
  expiree: boolean
  acceptable: boolean
  prixAJour: boolean
  livraison: { modes: DeliveryMode[]; villes: string[] }
}

export interface DevisMarketplace {
  id: string
  reference: string
  statut: StatutDevis
  entreprise: string | null
  message: string | null
  totalFcfa: number
  creeLe: string
  accepteLe: string | null
  commande: { reference: string } | null
  parties: PartieDevis[]
  prixAJour: boolean
}

/** Une partie vue par sa boutique : avec le devis et le client, sans les autres boutiques. */
export interface PartieDevisBoutique extends PartieDevis {
  devis: { reference: string; statut: StatutDevis; entreprise: string | null; message: string | null; creeLe: string; client: { nom: string | null; ville: string | null } }
}

export const LIBELLES_PARTIE: Record<StatutPartieDevis, string> = {
  en_attente: 'En attente de la boutique',
  confirmee: 'Confirmé par la boutique',
  refusee: 'Refusé par la boutique',
  acceptee: 'Accepté',
  non_retenue: 'Non retenu',
}

export const LIBELLES_DEVIS: Record<StatutDevis, string> = { ouvert: 'En cours', accepte: 'Accepté', annule: 'Annulé' }

export const fcfa = (montant: number) => `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`
export const dateCourte = (valeur: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(valeur))

/** Ce que le client peut faire de son devis, resume en une phrase. */
export function resumeDevis(devis: DevisMarketplace): string {
  if (devis.statut === 'accepte') return devis.commande ? `Devenu la commande ${devis.commande.reference}` : 'Accepté'
  const confirmees = devis.parties.filter((p) => p.acceptable).length
  const attente = devis.parties.filter((p) => p.statut === 'en_attente').length
  if (confirmees) return `${confirmees} boutique${confirmees > 1 ? 's ont' : ' a'} confirmé : vous pouvez accepter`
  if (attente) return `En attente de ${attente} boutique${attente > 1 ? 's' : ''}`
  return 'Aucune boutique n’a pu confirmer'
}
