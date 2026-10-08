'use client'

/**
 * LES COMMANDES, VUES DU CLIENT.
 *
 * Le type et les libellés vivent ici, une fois, parce que trois écrans les
 * partagent : l'écran de validation qui crée la commande, la page détail qui
 * la suit, et la liste « mes commandes ». Le backend est la seule source de
 * vérité sur l'état ; ce fichier ne fait que le nommer en français lisible.
 *
 * LES DEUX NOMS DU PAIEMENT NE SONT PAS UNE FAUTE. On envoie `modePaiement`
 * et on relit `modePaiementSouhaite` : l'écriture et la lecture n'ont pas la
 * même clé côté serveur, et forcer la même ici masquerait ce fait.
 */

export type ModeRemise = 'retrait' | 'domicile' | 'agence'
export type MomentPaiement = 'maintenant' | 'a_la_livraison'
export type ModePaiement =
  | 'especes_comptoir'
  | 'especes_livraison'
  | 'mobile_livraison'
  | 'mobile_plateforme'

export type StatutCommande =
  | 'soumise'
  | 'confirmee'
  | 'refusee'
  | 'en_preparation'
  | 'prete_au_retrait'
  | 'en_remise'
  | 'retour_ouvert'
  | 'annulation_demandee'
  | 'annulee'
  | 'close'

export interface LigneCommande {
  readonly id: string
  readonly rang: number
  readonly slug: string
  readonly nomCapture: string
  readonly prixCapture: number
  readonly quantite: number
}

export interface Commande {
  readonly reference: string
  readonly statut: StatutCommande
  readonly modeRemise: ModeRemise
  readonly modePaiementSouhaite: ModePaiement
  readonly momentPaiement?: MomentPaiement
  readonly comptoir: string | null
  readonly adresseFigee: { ville?: string; quartier?: string; repere?: string } | null
  readonly telephoneLivraison: string | null
  readonly totalEstimeTtc: number
  readonly totalFermeTtc: number | null
  readonly totalFacturableTtc: number | null
  readonly resteAPayer: number
  readonly statutPaiement: 'en_attente' | 'paye' | 'rembourse'
  readonly confirmeParClient: boolean
  readonly recuLe: string | null
  readonly motifCloture: string | null
  readonly livreur: { nom: string; telephone: string | null } | null
  readonly creeLe: string
  readonly closeLe: string | null
  readonly lignes: readonly LigneCommande[]
}

/** Ce que rend `GET /commandes` : une ligne par commande, allégée. */
export interface CommandeResume {
  readonly id: string
  readonly reference: string
  readonly statut: StatutCommande
  readonly modeRemise: ModeRemise
  readonly modePaiementSouhaite: ModePaiement
  readonly totalEstimeTtc: number
  readonly totalFermeTtc: number | null
  readonly resteAPayer: number
  readonly statutPaiement: 'en_attente' | 'paye' | 'rembourse'
  readonly confirmeParClient: boolean
  readonly motifCloture: string | null
  readonly creeLe: string
  readonly closeLe: string | null
  readonly _count?: { lignes: number }
}

/** Le total à afficher : le facturable prime, puis le ferme, puis l'estimé. */
export function totalAffiche(c: {
  totalFacturableTtc?: number | null
  totalFermeTtc: number | null
  totalEstimeTtc: number
}): number {
  return c.totalFacturableTtc ?? c.totalFermeTtc ?? c.totalEstimeTtc
}

const LIBELLES_STATUT: Record<StatutCommande, string> = {
  soumise: 'En attente de confirmation',
  confirmee: 'Confirmée',
  refusee: 'Refusée',
  en_preparation: 'En préparation',
  prete_au_retrait: 'Prête au retrait',
  en_remise: 'En cours de livraison',
  retour_ouvert: 'Retour ouvert',
  annulation_demandee: 'Annulation demandée',
  annulee: 'Annulée',
  close: 'Terminée',
}

export function libelleStatut(s: StatutCommande): string {
  return LIBELLES_STATUT[s] ?? s
}

/** Le ton de la pastille d'état : vert quand ça avance, rouge quand ça s'arrête mal. */
export function tonStatut(s: StatutCommande): 'neutre' | 'progres' | 'succes' | 'alerte' {
  if (s === 'close') return 'succes'
  if (s === 'annulee' || s === 'refusee') return 'alerte'
  if (s === 'soumise' || s === 'annulation_demandee' || s === 'retour_ouvert') return 'neutre'
  return 'progres'
}

const LIBELLES_REMISE: Record<ModeRemise, string> = {
  retrait: 'Retrait au comptoir',
  domicile: 'Livraison à domicile',
  agence: 'Expédition en agence',
}
export function libelleRemise(m: ModeRemise): string {
  return LIBELLES_REMISE[m] ?? m
}

const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  especes_comptoir: 'Espèces au comptoir',
  especes_livraison: 'Espèces à la livraison',
  mobile_livraison: 'Mobile Money à la livraison',
  mobile_plateforme: 'Mobile Money en ligne',
}
export function libellePaiement(m: ModePaiement): string {
  return LIBELLES_PAIEMENT[m] ?? m
}

/** Le client peut confirmer la réception exactement dans ces deux états. */
export function receptionConfirmable(c: Pick<Commande, 'statut' | 'confirmeParClient'>): boolean {
  return !c.confirmeParClient && (c.statut === 'en_remise' || c.statut === 'prete_au_retrait')
}

/** Une commande à régler en ligne dont le solde n'est pas encore soldé. */
export function paiementEnLigneDu(
  c: Pick<Commande, 'modePaiementSouhaite' | 'resteAPayer'>,
): boolean {
  return c.modePaiementSouhaite === 'mobile_plateforme' && c.resteAPayer > 0
}
