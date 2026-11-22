'use client'

/* eslint-disable @next/next/no-img-element -- apercus blob locaux avant televersement */

import { Fragment } from 'react'

import { libelleStatutStock, STATUTS_STOCK } from '@/lib/stock'
import { LIGNE_VIDE, MAX_VARIANTES, problemesVariantes, type LigneVariante } from '@/lib/variantes-produit'
import styles from './prix-variantes.module.css'

/**
 * LE PRIX ET LES VARIANTES D'UN NOUVEAU PRODUIT (6 novembre 2026) : une ligne par
 * variante, avec sa reference, son prix, son prix barre, son minimum commandable et
 * son statut de stock. Un produit sans variante garde une seule ligne, sans nom.
 *
 * LA REFERENCE EST FACULTATIVE (13 novembre 2026) : laissee vide, KatiMarket la
 * compose (prefixe boutique, nom du produit, numerotation). Une ligne fautive
 * montre son message en rouge, sous elle, et le champ en cause est entoure.
 */
export {
  erreurVariante,
  erreurVariantes,
  LIGNE_VIDE,
  MAX_VARIANTES,
  problemesVariantes,
  problemeVariante,
  variantesPourApi,
  type LigneVariante,
  type ProblemeVariante,
} from '@/lib/variantes-produit'

/**
 * `afficherErreurs` : apres un envoi refuse, toutes les lignes fautives se montrent ;
 * avant, une ligne ne se signale que des que le vendeur a commence a la remplir.
 */
export function PrixEtVariantes({ lignes, onChange, axes = [], photos = [], suiviStock = true, disabled = false, afficherErreurs = false }: { lignes: LigneVariante[]; onChange: (lignes: LigneVariante[]) => void; axes?: string[]; photos?: Array<{ url: string }>; suiviStock?: boolean; disabled?: boolean; afficherErreurs?: boolean }) {
  const changer = (rang: number, champ: keyof LigneVariante, valeur: string | boolean) => onChange(lignes.map((ligne, i) => (i === rang ? { ...ligne, [champ]: valeur } : ligne)))
  const changerAttribut = (rang: number, axe: string, valeur: string) => onChange(lignes.map((ligne, i) => i === rang ? { ...ligne, attributs: { ...ligne.attributs, [axe]: valeur } } : ligne))
  const basculerPhoto = (rang: number, url: string) => onChange(lignes.map((ligne, i) => i === rang ? { ...ligne, imageUrls: ligne.imageUrls.includes(url) ? ligne.imageUrls.filter((image) => image !== url) : [...ligne.imageUrls, url] } : ligne))
  const plusieurs = lignes.length > 1
  const afficherConfiguration = plusieurs || axes.length > 0
  const problemes = problemesVariantes(lignes, suiviStock, axes)
  const entamee = (ligne: LigneVariante) => Boolean(ligne.prix.trim() || ligne.reference.trim() || ligne.libelle.trim() || Object.values(ligne.attributs).some(Boolean))
  const nombreColonnes = (afficherConfiguration ? 1 : 0) + (suiviStock ? 8 : 7)
  return <div className={styles.variantes}>
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead><tr>
          {afficherConfiguration ? <th>{axes.length ? 'Configuration' : 'Variante'} {plusieurs ? <b>*</b> : <small>(recommandé)</small>}</th> : null}<th>Référence <small>(automatique si vide)</small></th><th>Prix FCFA <b>*</b></th><th>Prix barré</th><th>Minimum commandable</th>{suiviStock ? <th>Quantité initiale <small>(facultatif)</small></th> : null}<th>Statut du stock</th><th>Mode de commande</th><th><span className={styles.sr}>Retirer</span></th>
        </tr></thead>
        <tbody>{lignes.map((ligne, rang) => {
          const probleme = afficherErreurs || entamee(ligne) ? problemes[rang] : null
          const fautif = (champ: keyof LigneVariante) => (probleme?.champ === champ ? true : undefined)
          const idErreur = `variante-erreur-${rang}`
          const decrit = (champ: keyof LigneVariante) => (probleme?.champ === champ ? idErreur : undefined)
          return <Fragment key={rang}>
            <tr data-error={probleme ? true : undefined}>
              {afficherConfiguration ? <td>{axes.length ? <div className={styles.axes}>{axes.map((axe) => <label key={axe}>{axe}<input aria-label={`${axe} de la variante ${rang + 1}`} aria-invalid={fautif('attributs')} aria-describedby={decrit('attributs')} value={ligne.attributs[axe] ?? ''} maxLength={60} disabled={disabled} placeholder={`Ex. ${axe === 'Couleur' ? 'Noir' : axe}`} onChange={(e) => changerAttribut(rang, axe, e.target.value)} /></label>)}</div> : <input aria-label={`Nom de la variante ${rang + 1}`} aria-invalid={fautif('libelle')} aria-describedby={decrit('libelle')} value={ligne.libelle} maxLength={120} disabled={disabled} placeholder="Ex. 128 Go / Noir" onChange={(e) => changer(rang, 'libelle', e.target.value)} />}</td> : null}
              <td><input aria-label={`Référence de la variante ${rang + 1}`} aria-invalid={fautif('reference')} aria-describedby={decrit('reference')} value={ligne.reference} maxLength={120} disabled={disabled} placeholder="Automatique" onChange={(e) => changer(rang, 'reference', e.target.value)} /></td>
              <td><input aria-label={`Prix de la variante ${rang + 1}`} aria-invalid={fautif('prix')} aria-describedby={decrit('prix')} value={ligne.prix} inputMode="numeric" disabled={disabled} placeholder="149000" onChange={(e) => changer(rang, 'prix', e.target.value)} /></td>
              <td><input aria-label={`Prix barré de la variante ${rang + 1}`} aria-invalid={fautif('prixBarre')} aria-describedby={decrit('prixBarre')} value={ligne.prixBarre} inputMode="numeric" disabled={disabled} placeholder="Facultatif" onChange={(e) => changer(rang, 'prixBarre', e.target.value)} /></td>
              <td><input aria-label={`Minimum commandable de la variante ${rang + 1}`} aria-invalid={fautif('minimum')} aria-describedby={decrit('minimum')} value={ligne.minimum} inputMode="numeric" disabled={disabled} onChange={(e) => changer(rang, 'minimum', e.target.value)} /></td>
              {suiviStock ? <td><input aria-label={`Quantité initiale de la variante ${rang + 1}`} aria-invalid={fautif('quantite')} aria-describedby={decrit('quantite')} value={ligne.quantite} inputMode="numeric" disabled={disabled} placeholder="Facultatif" onChange={(e) => changer(rang, 'quantite', e.target.value)} /></td> : null}
              <td><select aria-label={`Statut du stock de la variante ${rang + 1}`} value={ligne.statut} disabled={disabled} onChange={(e) => changer(rang, 'statut', e.target.value)}>{STATUTS_STOCK.map((statut) => <option key={statut} value={statut}>{libelleStatutStock(statut)}</option>)}</select></td>
              <td><select aria-label={`Mode de commande de la variante ${rang + 1}`} value={ligne.devisUniquement ? 'devis' : 'direct'} disabled={disabled} onChange={(e) => changer(rang, 'devisUniquement', e.target.value === 'devis')}><option value="direct">Achat direct</option><option value="devis">Uniquement sur devis</option></select></td>
              <td>{plusieurs ? <button type="button" className={styles.retirer} aria-label={`Retirer la variante ${rang + 1}`} disabled={disabled} onClick={() => onChange(lignes.filter((_, i) => i !== rang))}>✕</button> : null}</td>
            </tr>
            {plusieurs && photos.length ? <tr className={styles.photosVariante}><td colSpan={nombreColonnes}><strong>Images de cette variante <small>· la première sélectionnée devient principale</small></strong><div>{photos.map((photo, index) => { const active = ligne.imageUrls.includes(photo.url); return <button key={photo.url} type="button" aria-pressed={active} disabled={disabled} onClick={() => basculerPhoto(rang, photo.url)}><img src={photo.url} alt={`Photo ${index + 1}`} /><span>{active ? ligne.imageUrls.indexOf(photo.url) + 1 : '＋'}</span></button> })}</div></td></tr> : null}
            {probleme ? <tr className={styles.ligneErreur}><td colSpan={nombreColonnes} id={idErreur} role="alert" data-testid={`variante-erreur-${rang}`}>⚠ {plusieurs ? `Variante ${rang + 1} : ` : ''}{probleme.message}</td></tr> : null}
          </Fragment>
        })}</tbody>
      </table>
    </div>
    {lignes.length < MAX_VARIANTES ? <button type="button" className={styles.ajouter} disabled={disabled} onClick={() => onChange([...lignes, { ...LIGNE_VIDE }])} data-testid="ajouter-variante">＋ Ajouter une variante</button> : null}
  </div>
}
