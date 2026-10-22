/**
 * LE PAIEMENT EN PLUSIEURS FOIS COTE VITRINE.
 *
 * Un produit paye petit a petit, livre une fois solde. Le serveur fixe tout ce
 * qui compte (prix fige, bornes des versements, frais de livraison) ; la vitrine
 * affiche, propose et envoie des choix, jamais un prix.
 */
import type { DeliveryMode } from './modes-livraison'

export type StatutPlan = 'ouvert' | 'reserve' | 'solde' | 'converti' | 'expire' | 'abandonne' | 'annule_defaillance'

export interface EligibiliteEchelonnement {
  eligible: boolean
  motif?: string
  message?: string
  totalFcfa?: number
  premierVersementMinFcfa?: number
  versementMinFcfa?: number
  dureeMaxJours?: number
  seuilReservationFcfa?: number
  seuilReservationBps?: number
  mode?: 'libre' | 'tranches_fixes'
  nombreTranches?: number | null
}

export interface VersementPlan {
  reference: string
  nature: 'produits' | 'livraison'
  montantFcfa: number
  statut: 'en_attente' | 'recu' | 'echoue'
  recuLe: string | null
  creeLe: string
}

export interface PlanEchelonnement {
  reference: string
  statut: StatutPlan
  quantite: number
  prixUnitaireFcfa: number
  totalProduitsFcfa: number
  montantVerseFcfa: number
  resteFcfa: number
  echeanceLe: string
  stockReserve: number
  reserveLe: string | null
  seuilReservationFcfa: number
  livraison: { mode: DeliveryMode; noteAgence?: string | null; adresse: { ville: string; quartier?: string; repere?: string } } | null
  fraisLivraisonFcfa: number | null
  commande: string | null
  clotureLe: string | null
  motifCloture: string | null
  creeLe: string
  boutique: { nom: string; slug: string }
  produit: { nom: string; slug: string; image: string | null; offreId: string }
  livraisonsPossibles?: { modes: DeliveryMode[]; villes: string[] }
  regles: { mode: 'libre' | 'tranches_fixes'; nombreTranches: number | null; versementMinFcfa: number; dureeJours: number }
  prochainVersement: { minimum: number; maximum: number; reste: number } | null
  versements: VersementPlan[]
}

/** Ce que le serveur rend quand il prepare un versement a payer. */
export interface VersementPrepare { plan: string; versement?: string; montantFcfa?: number; commande?: string }

export const LIBELLE_STATUT_PLAN: Record<StatutPlan, string> = {
  ouvert: 'En cours',
  reserve: 'Produit réservé',
  solde: 'Payé — choisissez la livraison',
  converti: 'Commande créée',
  expire: 'Expiré',
  abandonne: 'Abandonné',
  annule_defaillance: 'Annulé et remboursé',
}

export const TON_STATUT_PLAN: Record<StatutPlan, 'progres' | 'succes' | 'neutre' | 'alerte'> = {
  ouvert: 'progres', reserve: 'progres', solde: 'succes', converti: 'succes', expire: 'alerte', abandonne: 'neutre', annule_defaillance: 'neutre',
}

/** Les plans qui acceptent encore un versement. */
export const plansAVerser = (statut: StatutPlan) => statut === 'ouvert' || statut === 'reserve'

export const CONDITION_NON_REMBOURSEMENT =
  'Je comprends qu’en cas d’abandon ou si l’échéance est dépassée, les sommes versées ne sont pas remboursées. Seule une défaillance de la boutique ou de KatiMarket donne lieu à un remboursement intégral.'

/** Les durees proposees au client : des mois entiers, jusqu'a la duree maximale de la categorie. */
export function dureesProposees(dureeMaxJours: number): Array<{ jours: number; libelle: string }> {
  const mois = Math.floor(dureeMaxJours / 30)
  const durees = Array.from({ length: Math.max(0, mois) }, (_, i) => ({ jours: (i + 1) * 30, libelle: `${i + 1} mois` }))
  if (dureeMaxJours % 30 || !durees.length) durees.push({ jours: dureeMaxJours, libelle: `${dureeMaxJours} jours` })
  return durees
}

export const pourcentage = (verse: number, total: number) => (total > 0 ? Math.min(100, Math.floor((verse * 100) / total)) : 0)

export function joursRestants(echeanceLe: string, maintenant = Date.now()) {
  return Math.max(0, Math.ceil((new Date(echeanceLe).getTime() - maintenant) / 86_400_000))
}

export const dateCourte = (iso: string) => new Intl.DateTimeFormat('fr-CM', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
