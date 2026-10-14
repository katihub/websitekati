/**
 * Des donnees a la forme exacte des reponses du backend, figees pour les tests.
 * Les identifiants sont des UUID valides : certains ecrans les recopient dans
 * des URL que le backend valide.
 */

const MAINTENANT = '2026-10-13T09:00:00.000Z'

export const IDS = {
  commande: '00000000-0000-4000-8000-000000000001',
  sousCommande: '00000000-0000-4000-8000-000000000002',
  ligne: '00000000-0000-4000-8000-000000000003',
  expedition: '00000000-0000-4000-8000-000000000004',
  demande: '00000000-0000-4000-8000-000000000005',
  retour: '00000000-0000-4000-8000-000000000006',
  message: '00000000-0000-4000-8000-000000000007',
  boutique: '00000000-0000-4000-8000-000000000008',
}

export function commande(surcharge: Record<string, unknown> = {}) {
  return {
    id: IDS.commande,
    reference: 'CM-E2E',
    statut: 'livree',
    totalFermeTtc: 200_000,
    acompteDu: 40_000,
    acompteRecu: 40_000,
    resteAPayer: 0,
    sousCommandes: [{
      id: IDS.sousCommande,
      reference: 'CM-E2E-1',
      statut: 'livree',
      boutique: { nom: 'Maison Kati', slug: 'maison-kati' },
      lignes: [{ id: IDS.ligne, offreTitreCapture: 'Téléphone recette', quantite: 1, quantiteLivree: 1, quantiteRetournee: 0, quantiteRemboursee: 0, totalNetFcfa: 200_000 }],
      expeditions: [{
        id: IDS.expedition, reference: 'CM-E2E-E1', statut: 'livree', ville: 'Douala', montantACollecterFcfa: 0, livreeLe: MAINTENANT,
        evenements: [{ id: 'evt-1', type: 'livraison_confirmee', versStatut: 'livree', motif: null, creeLe: MAINTENANT }],
      }],
    }],
    ...surcharge,
  }
}

export function demandeClient(surcharge: Record<string, unknown> = {}) {
  return {
    id: IDS.demande,
    reference: 'DC-20261013-E2E',
    statut: 'en_attente_vendeur',
    objet: 'Écran fissuré à la réception',
    modifieLe: MAINTENANT,
    boutique: { nom: 'Maison Kati' },
    ligne: { id: IDS.ligne, offreTitreCapture: 'Téléphone recette', quantite: 1, quantiteLivree: 1, quantiteRetournee: 0, quantiteRemboursee: 0, totalNetFcfa: 200_000 },
    messages: [{ id: IDS.message, auteurType: 'client', contenu: 'L’écran était fissuré dans le carton scellé.', creeLe: MAINTENANT, pieces: [] }],
    retour: null,
    capacites: { repondre: true, expedier: false, contester: false },
    ...surcharge,
  }
}

const garantie = (mois: number, heritee = false) => ({ mois, unite: mois % 12 === 0 && mois ? 'annees' : 'mois', heritee, libelle: mois === 12 ? '1 an' : mois % 12 === 0 && mois ? `${mois / 12} ans` : `${mois} mois` })

/** L'arbre des categories tel que `GET /marketplace/categories` le rend. */
export function categories() {
  return [
    {
      id: '00000000-0000-4000-8000-000000000401', nom: 'Électronique', slug: 'electronique', garantie: garantie(12),
      sousCategories: [
        { id: '00000000-0000-4000-8000-000000000402', nom: 'Téléphones', slug: 'electronique-telephones', garantie: garantie(12, true) },
        { id: '00000000-0000-4000-8000-000000000403', nom: 'Téléviseurs', slug: 'electronique-televiseurs', garantie: garantie(24) },
      ],
    },
    { id: '00000000-0000-4000-8000-000000000404', nom: 'Mode & Style', slug: 'mode-style', garantie: garantie(0), sousCategories: [] },
  ]
}

export function boutique() {
  return {
    id: IDS.boutique, vendeurId: '00000000-0000-4000-8000-000000000009', nom: 'Maison Kati', slug: 'maison-kati', description: null,
    statut: 'active', modesLivraison: ['katihub'], villesLivraison: ['Douala'],
  }
}

export function espaceBoutique() {
  return {
    ...boutique(),
    vendeur: { type: 'entreprise', nomLegal: 'Maison Kati SARL', statutVerification: 'approuve', statut: 'actif' },
    mesRoles: ['proprietaire'],
  }
}

export function litigeBoutique(surcharge: Record<string, unknown> = {}) {
  return {
    id: IDS.demande,
    reference: 'DC-20261013-E2E',
    statut: 'en_attente_vendeur',
    objet: 'Écran fissuré à la réception',
    modifieLe: MAINTENANT,
    commande: { reference: 'CM-E2E' },
    client: { courriel: 'cliente@exemple.cm' },
    messages: [{ id: IDS.message, auteurType: 'client', contenu: 'L’écran était fissuré dans le carton scellé.', creeLe: MAINTENANT, pieces: [] }],
    retour: null,
    capacites: { repondre: true, decider: false, recevoir: false, contester: false },
    ...surcharge,
  }
}

export function mission(surcharge: Record<string, unknown> = {}) {
  return {
    id: IDS.expedition, reference: 'CM-E2E-E1', statut: 'en_livraison', ville: 'Douala',
    adresseFigee: { quartier: 'Akwa', repere: 'Face mairie' }, montantACollecterFcfa: 160_000,
    livraisonPrevueDebut: MAINTENANT, livraisonPrevueFin: null,
    sousCommande: { reference: 'CM-E2E-1', boutique: { nom: 'Maison Kati' }, commande: { reference: 'CM-E2E', telephoneLivraison: '699000000' } },
    evenements: [],
    ...surcharge,
  }
}
