import type { StatutStock } from './stock'

/**
 * LES REGLES DES VARIANTES D'UN NOUVEAU PRODUIT (13 novembre 2026), hors de tout
 * composant pour etre testees par `node --test`. La reference est facultative :
 * vide, KatiMarket la compose (prefixe boutique, nom du produit, numerotation).
 */
export type LigneVariante = { libelle: string; attributs: Record<string, string>; imageUrls: string[]; reference: string; prix: string; prixBarre: string; minimum: string; quantite: string; statut: StatutStock; devisUniquement: boolean }

export const LIGNE_VIDE: LigneVariante = { libelle: '', attributs: {}, imageUrls: [], reference: '', prix: '', prixBarre: '', minimum: '1', quantite: '', statut: 'en_stock', devisUniquement: false }
export const MAX_VARIANTES = 20

export type ResultatCombinaisons = { lignes: LigneVariante[]; erreur: string }

/** Produit cartesien des valeurs de chaque axe, borne avant toute creation de lignes. */
export function genererCombinaisonsVariantes(
  axes: readonly string[],
  valeursParAxe: Record<string, string>,
  modele: LigneVariante = LIGNE_VIDE,
  maximum = MAX_VARIANTES,
): ResultatCombinaisons {
  if (!axes.length) return { lignes: [], erreur: 'Cette catégorie ne définit aucun axe de variante.' }
  const valeurs = axes.map((axe) => {
    const vues = new Set<string>()
    return (valeursParAxe[axe] ?? '').split(/[,;\n]/).map((valeur) => valeur.trim()).filter((valeur) => {
      const identifiant = valeur.toLocaleLowerCase('fr')
      if (!identifiant || vues.has(identifiant)) return false
      vues.add(identifiant)
      return true
    })
  })
  const manquant = valeurs.findIndex((liste) => !liste.length)
  if (manquant >= 0) return { lignes: [], erreur: `Ajoutez au moins une valeur pour « ${axes[manquant]} ».` }
  const total = valeurs.reduce((produit, liste) => produit * liste.length, 1)
  if (total > maximum) return { lignes: [], erreur: `${total} combinaisons seraient créées. Réduisez les valeurs à ${maximum} variantes maximum.` }
  let combinaisons: Record<string, string>[] = [{}]
  for (const [index, axe] of axes.entries()) {
    combinaisons = combinaisons.flatMap((combinaison) => valeurs[index]!.map((valeur) => ({ ...combinaison, [axe]: valeur })))
  }
  return { erreur: '', lignes: combinaisons.map((attributs) => ({ ...modele, attributs, libelle: '', reference: '', imageUrls: [] })) }
}

/** Galerie client : photos propres a la variante d'abord, puis le reste de la galerie commune sans doublon. */
export function photosPourVariante<T extends { id: string }>(generales: readonly T[], variante?: readonly T[] | null): T[] {
  if (!variante?.length) return [...generales]
  const ids = new Set(variante.map((image) => image.id))
  return [...variante, ...generales.filter((image) => !ids.has(image.id))]
}

const entier = (valeur: string) => (/^\d+$/.test(valeur.trim()) ? Number(valeur.trim()) : NaN)

export type ProblemeVariante = { champ: keyof LigneVariante; message: string }

/** Le premier probleme d'une ligne, et le champ en cause ; `plusieurs` : un nom est exige des qu'il y a deux lignes. */
export function libelleVariante(ligne: LigneVariante, axes: readonly string[] = []): string {
  const valeurs = axes.map((axe) => ligne.attributs[axe]?.trim()).filter(Boolean)
  return valeurs.length ? valeurs.join(' / ') : ligne.libelle.trim()
}

export function problemeVariante(ligne: LigneVariante, plusieurs: boolean, suiviStock = true, axes: readonly string[] = []): ProblemeVariante | null {
  if (plusieurs && axes.length) {
    const manquant = axes.find((axe) => !ligne.attributs[axe]?.trim())
    if (manquant) return { champ: 'attributs', message: `Renseignez « ${manquant} » pour cette variante.` }
  } else if (plusieurs && !ligne.libelle.trim()) return { champ: 'libelle', message: 'Donnez un nom à chaque variante (ex. 128 Go / Noir).' }
  const prix = entier(ligne.prix)
  if (!(prix >= 1)) return { champ: 'prix', message: 'Indiquez un prix valide en FCFA (chiffres seulement).' }
  if (ligne.prixBarre.trim() && !(entier(ligne.prixBarre) > prix)) return { champ: 'prixBarre', message: 'Le prix barré doit être supérieur au prix de vente.' }
  if (!(entier(ligne.minimum) >= 1)) return { champ: 'minimum', message: 'Le minimum commandable est d’au moins 1.' }
  if (suiviStock && ligne.quantite.trim() && !(entier(ligne.quantite) >= 0 && entier(ligne.quantite) <= 1_000_000)) return { champ: 'quantite', message: 'La quantité doit être comprise entre 0 et 1 000 000.' }
  return null
}

/** Le premier probleme d'une ligne, ou rien. */
export function erreurVariante(ligne: LigneVariante, plusieurs: boolean, suiviStock = true, axes: readonly string[] = []): string {
  return problemeVariante(ligne, plusieurs, suiviStock, axes)?.message ?? ''
}

const cle = (valeur: string) => valeur.trim().toLocaleLowerCase('fr')

/** Les problemes de chaque ligne, doublons compris : seules les references saisies se comparent. */
export function problemesVariantes(lignes: readonly LigneVariante[], suiviStock = true, axes: readonly string[] = []): Array<ProblemeVariante | null> {
  const plusieurs = lignes.length > 1
  const compter = (valeurs: string[]) => valeurs.reduce((total, valeur) => total.set(valeur, (total.get(valeur) ?? 0) + 1), new Map<string, number>())
  const noms = compter(lignes.map((l) => cle(libelleVariante(l, axes))))
  const references = compter(lignes.map((l) => cle(l.reference)).filter(Boolean))
  return lignes.map((ligne) => {
    const probleme = problemeVariante(ligne, plusieurs, suiviStock, axes)
    if (probleme) return probleme
    if (plusieurs && (noms.get(cle(libelleVariante(ligne, axes))) ?? 0) > 1) return { champ: axes.length ? 'attributs' : 'libelle', message: 'Deux variantes représentent la même combinaison.' }
    if (cle(ligne.reference) && (references.get(cle(ligne.reference)) ?? 0) > 1) {
      return { champ: 'reference', message: 'Deux variantes portent la même référence. Changez-en une, ou laissez-la vide.' }
    }
    return null
  })
}

/** Le premier probleme de l'ensemble, pour le bandeau d'erreur du formulaire. */
export function erreurVariantes(lignes: readonly LigneVariante[], suiviStock = true, axes: readonly string[] = []): string {
  const problemes = problemesVariantes(lignes, suiviStock, axes)
  const rang = problemes.findIndex(Boolean)
  if (rang === -1) return ''
  const message = problemes[rang]!.message
  return lignes.length > 1 ? `Variante ${rang + 1} : ${message}` : message
}

/** Ce que l'API attend pour chaque variante ; une reference vide est composee par KatiMarket. */
export function variantesPourApi(lignes: readonly LigneVariante[], suiviStock = true, axes: readonly string[] = []) {
  return lignes.map((ligne) => ({
    ...(libelleVariante(ligne, axes) ? { libelleVariante: libelleVariante(ligne, axes) } : {}),
    ...(axes.length ? { attributsVariante: Object.fromEntries(axes.flatMap((axe) => { const valeur = ligne.attributs[axe]?.trim(); return valeur ? [[axe, valeur] as const] : [] })) } : {}),
    ...(ligne.reference.trim() ? { referenceVendeur: ligne.reference.trim() } : {}),
    prixFcfa: entier(ligne.prix),
    ...(ligne.prixBarre.trim() ? { prixReferenceFcfa: entier(ligne.prixBarre) } : {}),
    quantiteMinimale: entier(ligne.minimum),
    ...(suiviStock && ligne.quantite.trim() ? { quantiteInitiale: entier(ligne.quantite) } : {}),
    devisUniquement: ligne.devisUniquement,
    statutStock: ligne.statut,
  }))
}
