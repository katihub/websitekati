/**
 * LES MODES DE REMISE D'UNE COMMANDE MARKETPLACE, ET LEURS LIBELLES.
 *
 * - Kati Express : la livraison faite par KatiHub ;
 * - la livraison par la boutique ;
 * - le retrait a la boutique, gratuit ;
 * - l'expedition en agence de voyage : le client nomme l'agence, et tout se
 *   paie a la commande.
 *
 * Un seul endroit pour les libelles : le site, l'espace vendeur et les devis
 * disent la meme chose.
 */
export type DeliveryMode = 'vendeur' | 'katihub' | 'retrait' | 'agence'

export const MODES_LIVRAISON: readonly DeliveryMode[] = ['katihub', 'vendeur', 'retrait', 'agence']

export const LIBELLE_MODE: Readonly<Record<DeliveryMode, string>> = {
  katihub: 'Kati Express',
  vendeur: 'Livraison par la boutique',
  retrait: 'Retrait à la boutique',
  agence: 'Expédition en agence',
}

/** Ce que le mode promet, en une phrase. */
export const DESCRIPTION_MODE: Readonly<Record<DeliveryMode, string>> = {
  katihub: 'Un livreur KatiHub vous apporte la commande.',
  vendeur: 'La boutique vous livre avec ses propres livreurs.',
  retrait: 'Vous passez chercher la commande à la boutique : c’est gratuit.',
  agence: 'La boutique dépose le colis à l’agence de voyage de votre choix ; tout se règle à la commande.',
}

/** Pour le vendeur : ce qu'il propose quand il coche ce mode. */
export const CHOIX_VENDEUR: Readonly<Record<DeliveryMode, string>> = {
  vendeur: 'Je livre moi-même',
  retrait: 'Le client vient sur place (retrait gratuit)',
  katihub: 'Kati Express (KatiHub livre pour moi)',
  agence: 'J’expédie en agence de voyage',
}

/** Kati Express et la boutique livrent a l'adresse du client : la ville doit etre desservie. */
export function livraisonADomicile(mode: DeliveryMode): boolean {
  return mode === 'katihub' || mode === 'vendeur'
}

export function estModeLivraison(valeur: unknown): valeur is DeliveryMode {
  return typeof valeur === 'string' && (MODES_LIVRAISON as readonly string[]).includes(valeur)
}
