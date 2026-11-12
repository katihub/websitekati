import type { StatutStock } from './stock'

/**
 * LES REGLES DES VARIANTES D'UN NOUVEAU PRODUIT (13 novembre 2026), hors de tout
 * composant pour etre testees par `node --test`. La reference est facultative :
 * vide, KatiMarket la compose (prefixe boutique, nom du produit, numerotation).
 */
export type LigneVariante = { libelle: string; reference: string; prix: string; prixBarre: string; minimum: string; statut: StatutStock }

export const LIGNE_VIDE: LigneVariante = { libelle: '', reference: '', prix: '', prixBarre: '', minimum: '1', statut: 'en_stock' }
export const MAX_VARIANTES = 20

const entier = (valeur: string) => (/^\d+$/.test(valeur.trim()) ? Number(valeur.trim()) : NaN)

export type ProblemeVariante = { champ: keyof LigneVariante; message: string }

/** Le premier probleme d'une ligne, et le champ en cause ; `plusieurs` : un nom est exige des qu'il y a deux lignes. */
export function problemeVariante(ligne: LigneVariante, plusieurs: boolean): ProblemeVariante | null {
  if (plusieurs && !ligne.libelle.trim()) return { champ: 'libelle', message: 'Donnez un nom à chaque variante (ex. 128 Go / Noir).' }
  const prix = entier(ligne.prix)
  if (!(prix >= 1)) return { champ: 'prix', message: 'Indiquez un prix valide en FCFA (chiffres seulement).' }
  if (ligne.prixBarre.trim() && !(entier(ligne.prixBarre) > prix)) return { champ: 'prixBarre', message: 'Le prix barré doit être supérieur au prix de vente.' }
  if (!(entier(ligne.minimum) >= 1)) return { champ: 'minimum', message: 'Le minimum commandable est d’au moins 1.' }
  return null
}

/** Le premier probleme d'une ligne, ou rien. */
export function erreurVariante(ligne: LigneVariante, plusieurs: boolean): string {
  return problemeVariante(ligne, plusieurs)?.message ?? ''
}

const cle = (valeur: string) => valeur.trim().toLocaleLowerCase('fr')

/** Les problemes de chaque ligne, doublons compris : seules les references saisies se comparent. */
export function problemesVariantes(lignes: readonly LigneVariante[]): Array<ProblemeVariante | null> {
  const plusieurs = lignes.length > 1
  const compter = (valeurs: string[]) => valeurs.reduce((total, valeur) => total.set(valeur, (total.get(valeur) ?? 0) + 1), new Map<string, number>())
  const noms = compter(lignes.map((l) => cle(l.libelle)))
  const references = compter(lignes.map((l) => cle(l.reference)).filter(Boolean))
  return lignes.map((ligne) => {
    const probleme = problemeVariante(ligne, plusieurs)
    if (probleme) return probleme
    if (plusieurs && (noms.get(cle(ligne.libelle)) ?? 0) > 1) return { champ: 'libelle', message: 'Deux variantes portent le même nom.' }
    if (cle(ligne.reference) && (references.get(cle(ligne.reference)) ?? 0) > 1) {
      return { champ: 'reference', message: 'Deux variantes portent la même référence. Changez-en une, ou laissez-la vide.' }
    }
    return null
  })
}

/** Le premier probleme de l'ensemble, pour le bandeau d'erreur du formulaire. */
export function erreurVariantes(lignes: readonly LigneVariante[]): string {
  const problemes = problemesVariantes(lignes)
  const rang = problemes.findIndex(Boolean)
  if (rang === -1) return ''
  const message = problemes[rang]!.message
  return lignes.length > 1 ? `Variante ${rang + 1} : ${message}` : message
}

/** Ce que l'API attend pour chaque variante ; une reference vide est composee par KatiMarket. */
export function variantesPourApi(lignes: readonly LigneVariante[]) {
  return lignes.map((ligne) => ({
    ...(ligne.libelle.trim() ? { libelleVariante: ligne.libelle.trim() } : {}),
    ...(ligne.reference.trim() ? { referenceVendeur: ligne.reference.trim() } : {}),
    prixFcfa: entier(ligne.prix),
    ...(ligne.prixBarre.trim() ? { prixReferenceFcfa: entier(ligne.prixBarre) } : {}),
    quantiteMinimale: entier(ligne.minimum),
    statutStock: ligne.statut,
  }))
}
