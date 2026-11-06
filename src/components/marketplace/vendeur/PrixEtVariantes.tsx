'use client'

import { libelleStatutStock, STATUTS_STOCK, type StatutStock } from '@/lib/stock'
import styles from './prix-variantes.module.css'

/**
 * LE PRIX ET LES VARIANTES D'UN NOUVEAU PRODUIT (6 novembre 2026) : une ligne par
 * variante, avec sa reference, son prix, son prix barre, son minimum commandable et
 * son statut de stock. Un produit sans variante garde une seule ligne, sans nom.
 */
export type LigneVariante = { libelle: string; reference: string; prix: string; prixBarre: string; minimum: string; statut: StatutStock }

export const LIGNE_VIDE: LigneVariante = { libelle: '', reference: '', prix: '', prixBarre: '', minimum: '1', statut: 'en_stock' }
export const MAX_VARIANTES = 20

const entier = (valeur: string) => (/^\d+$/.test(valeur.trim()) ? Number(valeur.trim()) : NaN)

/** Le premier probleme d'une ligne, ou rien ; `plusieurs` : un nom est exige des qu'il y a deux lignes. */
export function erreurVariante(ligne: LigneVariante, plusieurs: boolean): string {
  if (plusieurs && !ligne.libelle.trim()) return 'Donnez un nom à chaque variante (ex. 128 Go / Noir).'
  if (!ligne.reference.trim()) return 'Indiquez la référence de chaque variante.'
  const prix = entier(ligne.prix)
  if (!(prix >= 1)) return 'Indiquez un prix valide en FCFA.'
  if (ligne.prixBarre.trim() && !(entier(ligne.prixBarre) > prix)) return 'Le prix barré doit être supérieur au prix de vente.'
  if (!(entier(ligne.minimum) >= 1)) return 'Le minimum commandable est d’au moins 1.'
  return ''
}

/** Les problemes de l'ensemble : une ligne invalide, ou deux noms ou references en double. */
export function erreurVariantes(lignes: readonly LigneVariante[]): string {
  const plusieurs = lignes.length > 1
  for (const ligne of lignes) {
    const erreur = erreurVariante(ligne, plusieurs)
    if (erreur) return erreur
  }
  const doublon = (valeurs: string[]) => new Set(valeurs).size !== valeurs.length
  if (doublon(lignes.map((l) => l.libelle.trim().toLocaleLowerCase('fr')))) return 'Deux variantes portent le même nom.'
  if (doublon(lignes.map((l) => l.reference.trim().toLocaleLowerCase('fr')))) return 'Deux variantes portent la même référence.'
  return ''
}

/** Ce que l'API attend pour chaque variante. */
export function variantesPourApi(lignes: readonly LigneVariante[]) {
  return lignes.map((ligne) => ({
    ...(ligne.libelle.trim() ? { libelleVariante: ligne.libelle.trim() } : {}),
    referenceVendeur: ligne.reference.trim(),
    prixFcfa: entier(ligne.prix),
    ...(ligne.prixBarre.trim() ? { prixReferenceFcfa: entier(ligne.prixBarre) } : {}),
    quantiteMinimale: entier(ligne.minimum),
    statutStock: ligne.statut,
  }))
}

export function PrixEtVariantes({ lignes, onChange, disabled = false }: { lignes: LigneVariante[]; onChange: (lignes: LigneVariante[]) => void; disabled?: boolean }) {
  const changer = (rang: number, champ: keyof LigneVariante, valeur: string) => onChange(lignes.map((ligne, i) => (i === rang ? { ...ligne, [champ]: valeur } : ligne)))
  const plusieurs = lignes.length > 1
  return <div className={styles.variantes}>
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead><tr>
          <th>Variante {plusieurs ? <b>*</b> : <small>(facultatif)</small>}</th><th>Référence <b>*</b></th><th>Prix FCFA <b>*</b></th><th>Prix barré</th><th>Minimum commandable</th><th>Statut du stock</th><th><span className={styles.sr}>Retirer</span></th>
        </tr></thead>
        <tbody>{lignes.map((ligne, rang) => <tr key={rang} data-error={Boolean((ligne.prix || ligne.reference) && erreurVariante(ligne, plusieurs)) || undefined}>
          <td><input aria-label={`Nom de la variante ${rang + 1}`} value={ligne.libelle} maxLength={120} disabled={disabled} placeholder={plusieurs ? 'Ex. 128 Go / Noir' : 'Sans variante'} onChange={(e) => changer(rang, 'libelle', e.target.value)} /></td>
          <td><input aria-label={`Référence de la variante ${rang + 1}`} value={ligne.reference} maxLength={120} disabled={disabled} placeholder="Ex. A15-128-NOIR" onChange={(e) => changer(rang, 'reference', e.target.value)} /></td>
          <td><input aria-label={`Prix de la variante ${rang + 1}`} value={ligne.prix} inputMode="numeric" disabled={disabled} placeholder="149000" onChange={(e) => changer(rang, 'prix', e.target.value)} /></td>
          <td><input aria-label={`Prix barré de la variante ${rang + 1}`} value={ligne.prixBarre} inputMode="numeric" disabled={disabled} placeholder="Facultatif" onChange={(e) => changer(rang, 'prixBarre', e.target.value)} /></td>
          <td><input aria-label={`Minimum commandable de la variante ${rang + 1}`} value={ligne.minimum} inputMode="numeric" disabled={disabled} onChange={(e) => changer(rang, 'minimum', e.target.value)} /></td>
          <td><select aria-label={`Statut du stock de la variante ${rang + 1}`} value={ligne.statut} disabled={disabled} onChange={(e) => changer(rang, 'statut', e.target.value)}>{STATUTS_STOCK.map((statut) => <option key={statut} value={statut}>{libelleStatutStock(statut)}</option>)}</select></td>
          <td>{plusieurs ? <button type="button" className={styles.retirer} aria-label={`Retirer la variante ${rang + 1}`} disabled={disabled} onClick={() => onChange(lignes.filter((_, i) => i !== rang))}>✕</button> : null}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {lignes.length < MAX_VARIANTES ? <button type="button" className={styles.ajouter} disabled={disabled} onClick={() => onChange([...lignes, { ...LIGNE_VIDE }])} data-testid="ajouter-variante">＋ Ajouter une variante</button> : null}
  </div>
}
