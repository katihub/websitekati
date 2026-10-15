'use client'

import { useEffect, useState } from 'react'

import { api, apiDisponible } from '@/lib/api'
import { formatKati, usePolitiqueKati, type PortefeuilleKati } from '@/lib/kati'
import { katiUtilisablesMax, montantAssurance, type ModePaiement, type OptionsServices } from '@/lib/reglement'
import { ShopIcon } from '../ShopIcon'
import { money } from './CheckoutUi'
import styles from './checkout.module.css'

export type ChoixReglement = { mode: ModePaiement; assurance: boolean; installations: string[]; katiUtilises: number }

/** Les options proposables pour les offres du panier ; null tant qu'elles ne sont pas lues. */
export function useOptionsServices(offreIds: readonly string[]) {
  const cle = [...offreIds].sort().join(',')
  const [options, setOptions] = useState<{ cle: string; valeur: OptionsServices } | null>(null)
  useEffect(() => {
    if (!apiDisponible || !cle) return
    let actif = true
    api<OptionsServices>(`/marketplace/services-commande?offres=${encodeURIComponent(cle)}`, { anonyme: true })
      .then((valeur) => { if (actif) setOptions({ cle, valeur }) })
      .catch(() => { if (actif) setOptions({ cle, valeur: { assurance: { active: false, tauxBps: 0 }, installations: [] } }) })
    return () => { actif = false }
  }, [cle])
  return options?.cle === cle ? options.valeur : null
}

/** Le disponible KATI du client connecte, ou null sans session. */
export function useDisponibleKati(actif: boolean) {
  const [disponible, setDisponible] = useState<number | null>(null)
  useEffect(() => {
    if (!apiDisponible || !actif) return
    let vivant = true
    api<PortefeuilleKati>('/marketplace/kati/moi')
      .then((portefeuille) => { if (vivant) setDisponible(portefeuille.disponible) })
      .catch(() => { if (vivant) setDisponible(null) })
    return () => { vivant = false }
  }, [actif])
  return actif ? disponible : null
}

/**
 * LES CHOIX DE REGLEMENT : paiement complet ou acompte, assurance KATI (cochee
 * par defaut), installation par KatiHub pour les categories qui la proposent,
 * et KATI a utiliser sur les produits. Les montants affiches sont estimes ; le
 * serveur les recalcule a la commande.
 */
export function ReglementCommande({ produitsFcfa, options, disponibleKati, choix, onChange }: {
  produitsFcfa: number
  options: OptionsServices | null
  disponibleKati: number | null
  choix: ChoixReglement
  onChange: (choix: ChoixReglement) => void
}) {
  const politique = usePolitiqueKati()
  const maxKati = politique && disponibleKati !== null
    ? katiUtilisablesMax({ produitsFcfa, disponible: disponibleKati, katiParFcfa: politique.katiParFcfa, minimumKati: politique.depenseMinimumKati, plafondBps: politique.depensePlafondBps })
    : 0
  const assurance = options?.assurance.active ? montantAssurance(produitsFcfa, options.assurance.tauxBps) : 0
  const pourcentage = (bps: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(bps / 100)} %`

  return <section className={styles.panel} data-testid="reglement-commande">
    <h2><ShopIcon name="shield"/>Paiement et options</h2>
    <fieldset className={styles.choixReglement}>
      <legend>Comment voulez-vous payer ?</legend>
      <label><input type="radio" name="mode-paiement" checked={choix.mode === 'acompte'} onChange={() => onChange({ ...choix, mode: 'acompte' })}/><span><b>Un acompte maintenant</b><small>Le reste et les frais de livraison se règlent à la livraison.</small></span></label>
      <label><input type="radio" name="mode-paiement" checked={choix.mode === 'complet'} onChange={() => onChange({ ...choix, mode: 'complet' })}/><span><b>Tout payer maintenant</b><small>Rien à régler au livreur.</small></span></label>
    </fieldset>

    {options?.assurance.active && assurance > 0 ? <label className={styles.optionService}>
      <input type="checkbox" checked={choix.assurance} onChange={(event) => onChange({ ...choix, assurance: event.target.checked })} data-testid="option-assurance"/>
      <span><b>Assurance KATI · {money(assurance)}</b><small>{pourcentage(options.assurance.tauxBps)} du montant des produits. Facultative : décochez-la si vous n’en voulez pas.</small></span>
    </label> : null}

    {options?.installations.map((installation) => <label key={installation.categorieId} className={styles.optionService}>
      <input type="checkbox" checked={choix.installations.includes(installation.categorieId)} data-testid={`option-installation-${installation.categorieId}`}
        onChange={(event) => onChange({ ...choix, installations: event.target.checked ? [...choix.installations, installation.categorieId] : choix.installations.filter((id) => id !== installation.categorieId) })}/>
      <span><b>Installation {installation.nom} par KatiHub · {money(installation.prixFcfa)}</b><small>Un technicien KatiHub installe vos produits {installation.nom.toLowerCase()} après la livraison.</small></span>
    </label>)}

    {politique && disponibleKati !== null ? maxKati > 0 ? <div className={styles.optionService} data-testid="option-kati">
      <input type="checkbox" id="utiliser-kati" checked={choix.katiUtilises > 0} onChange={(event) => onChange({ ...choix, katiUtilises: event.target.checked ? maxKati : 0 })}/>
      <span>
        <label htmlFor="utiliser-kati"><b>Utiliser mes KATI</b></label>
        <small>Vous avez {formatKati(disponibleKati)}. Jusqu’à {pourcentage(politique.depensePlafondBps)} des produits, au moins {formatKati(politique.depenseMinimumKati)}.</small>
        {choix.katiUtilises > 0 ? <label className={styles.katiMontant}>KATI utilisés
          <input type="number" min={politique.depenseMinimumKati} max={maxKati} step={politique.katiParFcfa} value={choix.katiUtilises}
            onChange={(event) => onChange({ ...choix, katiUtilises: Math.min(maxKati, Math.max(0, Math.floor(Number(event.target.value) / politique.katiParFcfa) * politique.katiParFcfa)) })}/>
          <span data-testid="remise-kati">soit {money(choix.katiUtilises / politique.katiParFcfa)} de moins</span>
        </label> : null}
      </span>
    </div> : <p className={styles.note}>Vos KATI ({formatKati(disponibleKati)}) seront utilisables à partir de {formatKati(politique.depenseMinimumKati)}.</p> : null}
  </section>
}
