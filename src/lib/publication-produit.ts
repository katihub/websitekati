/**
 * PUBLIE TOUT DE SUITE (7 novembre 2026).
 *
 * Une boutique active met ses produits en ligne sans attendre l'equipe. Sans
 * prix, un produit ne s'affiche pas : la liste le signale et le vendeur ajoute
 * son prix sur place. Les photos : un format carre est conseille, et une photo
 * trop petite ou trop allongee est signalee, sans bloquer l'envoi.
 */

const REVISIONS_OUVERTES = ['soumise', 'en_verification']

type OffreLue = { statut: string; revisions?: Array<{ statut: string }> }

/** Un produit en ligne qui n'a ni prix publie, ni prix en attente de validation. */
export function produitSansPrix(produit: { statut: string }, offres: readonly OffreLue[]): boolean {
  if (produit.statut !== 'actif') return false
  return !offres.some((offre) => offre.statut === 'publiee' || (offre.revisions ?? []).some((revision) => REVISIONS_OUVERTES.includes(revision.statut)))
}

export type Livraison = { modesLivraison: readonly string[]; villesLivraison: readonly string[] }

/**
 * L'offre d'un produit qui n'avait pas de prix : le prix saisi, et pour le reste
 * les reglages de la boutique et la garantie minimale de la categorie.
 */
export function offreDuPrix(
  produit: { id: string; nom: string; slug: string; garantieMinimaleMois?: number | null },
  prixFcfa: number,
  livraison: Livraison,
) {
  return {
    produitId: produit.id,
    referenceVendeur: produit.slug.slice(0, 80),
    titre: produit.nom.slice(0, 240),
    prixFcfa,
    etat: 'neuf',
    garantieMois: produit.garantieMinimaleMois ?? 0,
    modesLivraison: livraison.modesLivraison.slice(0, 2),
    villesLivraison: livraison.villesLivraison.slice(0, 10),
    delaiMaxJours: 2,
    quantiteMinimale: 1,
  }
}

/** Le prix saisi, en francs entiers ; null s'il n'est pas valable. */
export function lirePrix(saisie: string): number | null {
  const valeur = Number(saisie.replace(/[\s .]/g, ''))
  return Number.isInteger(valeur) && valeur >= 1 && valeur <= 2_000_000_000 ? valeur : null
}

export const CONSEIL_PHOTOS = 'Format carré conseillé : 1 000 × 1 000 px (800 px minimum) · produit centré sur fond blanc ou clair · JPEG, PNG ou WebP, 5 Mo max.'
export const COTE_MINIMUM_PX = 800
export const RAPPORT_MAXIMUM = 1.5

/** L'avertissement d'une photo mesuree, ou null si elle convient. Il ne bloque jamais l'envoi. */
export function avertissementPhoto(largeur: number, hauteur: number): string | null {
  if (!largeur || !hauteur) return null
  if (Math.min(largeur, hauteur) < COTE_MINIMUM_PX) return `Cette photo fait ${largeur} × ${hauteur} px : elle risque d’être floue. Visez 1 000 × 1 000 px.`
  if (Math.max(largeur, hauteur) / Math.min(largeur, hauteur) > RAPPORT_MAXIMUM) return `Cette photo est très allongée (${largeur} × ${hauteur} px) : elle sera réduite dans un cadre carré.`
  return null
}
