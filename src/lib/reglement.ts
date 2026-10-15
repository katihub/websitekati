import { estimatedDeposit } from './marketplace-checkout'

/**
 * L'ESTIMATION DU REGLEMENT, A L'IDENTIQUE DU SERVEUR (`calculerReglement`).
 *
 * Elle sert a afficher ce qui sera paye maintenant et a la livraison avant de
 * commander. Le serveur recalcule tout a la creation : en cas d'ecart (un taux
 * change entre-temps), c'est son montant qui est demande au paiement.
 */

export type ModePaiement = 'acompte' | 'complet'

export type OptionsServices = {
  assurance: { active: boolean; tauxBps: number }
  installations: Array<{ categorieId: string; nom: string; prixFcfa: number }>
}

export type EstimationReglement = {
  produitsPayesAvanceFcfa: number
  aPayerMaintenantFcfa: number
  aPayerLivraisonFcfa: number
  assuranceFcfa: number
  installationFcfa: number
  remiseKatiFcfa: number
}

export function montantAssurance(produitsFcfa: number, tauxBps: number) {
  if (produitsFcfa <= 0 || tauxBps <= 0) return 0
  return Math.ceil((produitsFcfa * tauxBps) / 10_000)
}

export function estimerReglement(entree: {
  mode: ModePaiement
  produitsFcfa: number
  fraisFcfa: number
  assuranceFcfa: number
  installationFcfa: number
  remiseKatiFcfa: number
}): EstimationReglement {
  const complet = entree.mode === 'complet'
  const services = entree.assuranceFcfa + entree.installationFcfa
  const payesAvance = complet ? entree.produitsFcfa : Math.max(estimatedDeposit(entree.produitsFcfa), entree.remiseKatiFcfa)
  return {
    produitsPayesAvanceFcfa: payesAvance,
    aPayerMaintenantFcfa: payesAvance - entree.remiseKatiFcfa + services + (complet ? entree.fraisFcfa : 0),
    aPayerLivraisonFcfa: entree.produitsFcfa - payesAvance + (complet ? 0 : entree.fraisFcfa),
    assuranceFcfa: entree.assuranceFcfa,
    installationFcfa: entree.installationFcfa,
    remiseKatiFcfa: entree.remiseKatiFcfa,
  }
}

/**
 * LE PLUS DE KATI QU'UNE COMMANDE PEUT UTILISER : le plafond des produits,
 * le disponible, en multiple de la conversion ; 0 sous le minimum.
 */
export function katiUtilisablesMax(entree: { produitsFcfa: number; disponible: number; katiParFcfa: number; minimumKati: number; plafondBps: number }) {
  const plafondKati = Math.floor((entree.produitsFcfa * entree.plafondBps) / 10_000) * entree.katiParFcfa
  const max = Math.floor(Math.min(plafondKati, entree.disponible) / entree.katiParFcfa) * entree.katiParFcfa
  return max >= entree.minimumKati ? max : 0
}
