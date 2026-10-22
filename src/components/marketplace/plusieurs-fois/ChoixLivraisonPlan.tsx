'use client'

import { useState, type FormEvent } from 'react'

import { api, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { quartiersDe, useLocalites } from '@/lib/localites'
import { DESCRIPTION_MODE, LIBELLE_MODE, livraisonADomicile, type DeliveryMode } from '@/lib/modes-livraison'
import type { PlanEchelonnement, VersementPrepare } from '@/lib/paiement-plusieurs-fois'

const champ = 'min-h-11 rounded-control border border-rule bg-surface px-3 text-small text-ink'

/**
 * LE PLAN EST PAYE : LE CLIENT CHOISIT SA LIVRAISON. Les frais sont calcules par
 * le serveur (meme grille qu'au panier) et montres avant d'etre payes ; sans
 * frais, la commande est creee tout de suite.
 */
export function ChoixLivraisonPlan({ plan, onPrepare }: { plan: PlanEchelonnement; onPrepare: (resultat: VersementPrepare) => void }) {
  const localites = useLocalites()
  const modes = plan.livraisonsPossibles?.modes?.length ? plan.livraisonsPossibles.modes : (['katihub'] as DeliveryMode[])
  const [mode, setMode] = useState<DeliveryMode>(modes[0]!)
  const villes = [...new Set([...localites.map((l) => l.ville), ...(plan.livraisonsPossibles?.villes ?? [])])]
  const [ville, setVille] = useState('')
  const villeChoisie = ville || villes[0] || ''
  const quartiers = quartiersDe(localites, villeChoisie)
  const [quartierId, setQuartierId] = useState('')
  const [repere, setRepere] = useState('')
  const [telephone, setTelephone] = useState('')
  const [noteAgence, setNoteAgence] = useState('')
  const [frais, setFrais] = useState<number | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const aDomicile = livraisonADomicile(mode)

  const corps = () => {
    const quartier = quartiers.find((q) => q.id === quartierId)
    return {
      mode,
      ...(mode === 'agence' && noteAgence.trim() ? { noteAgence: noteAgence.trim() } : {}),
      adresse: { ville: villeChoisie, telephoneDestinataire: telephone.trim(), ...(aDomicile ? { quartier: quartier?.nom ?? '', quartierId, repere: repere.trim() } : {}) },
    }
  }
  const reinitialiser = () => setFrais(null)

  async function soumettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (envoi) return
    setEnvoi(true); setErreur('')
    const chemin = `/marketplace/echelonnement/plans/${encodeURIComponent(plan.reference)}/livraison`
    try {
      if (frais === null) {
        const estimation = await api<{ fraisLivraisonFcfa: number }>(`${chemin}/estimation`, { methode: 'POST', corps: corps() })
        setFrais(estimation.fraisLivraisonFcfa)
      } else {
        onPrepare(await api<VersementPrepare>(chemin, { methode: 'POST', corps: corps() }))
      }
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'La livraison n’a pas pu être calculée. Réessayez.')
    } finally {
      setEnvoi(false)
    }
  }

  return <form onSubmit={soumettre} className="flex flex-col gap-4 rounded-well border border-primary p-4" data-testid="choix-livraison-plan">
    <div>
      <p className="text-small font-semibold text-ink">Le prix est entièrement payé : comment voulez-vous le recevoir ?</p>
      <p className="text-micro text-ink-3">Les frais de livraison se paient maintenant ; le retrait en boutique est gratuit.</p>
    </div>
    <fieldset className="flex flex-col gap-2">
      {modes.map((m) => <label key={m} className="flex items-start gap-2 text-small text-ink">
        <input type="radio" name="mode-livraison" checked={mode === m} onChange={() => { setMode(m); reinitialiser() }} className="mt-1"/>
        <span><b>{LIBELLE_MODE[m]}</b><small className="block text-micro text-ink-3">{DESCRIPTION_MODE[m]}</small></span>
      </label>)}
    </fieldset>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-micro text-ink-2">Ville
        <select required value={villeChoisie} onChange={(e) => { setVille(e.target.value); setQuartierId(''); reinitialiser() }} className={champ}>
          {villes.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      {aDomicile ? <label className="flex flex-col gap-1 text-micro text-ink-2">Quartier
        <select required value={quartierId} onChange={(e) => { setQuartierId(e.target.value); reinitialiser() }} className={champ}>
          <option value="" disabled>Choisissez…</option>
          {quartiers.map((q) => <option key={q.id} value={q.id}>{q.nom}</option>)}
        </select>
      </label> : null}
      {aDomicile ? <label className="flex flex-col gap-1 text-micro text-ink-2 sm:col-span-2">Repère
        <input required minLength={3} maxLength={240} value={repere} placeholder="Ex. face à la pharmacie…" onChange={(e) => setRepere(e.target.value)} className={champ}/>
      </label> : null}
      {mode === 'agence' ? <label className="flex flex-col gap-1 text-micro text-ink-2 sm:col-span-2">Agence de voyage (et sa ville)
        <input required minLength={3} maxLength={200} value={noteAgence} onChange={(e) => { setNoteAgence(e.target.value); reinitialiser() }} className={champ}/>
      </label> : null}
      <label className="flex flex-col gap-1 text-micro text-ink-2 sm:col-span-2">Téléphone à joindre
        <input type="tel" required minLength={9} maxLength={20} value={telephone} placeholder="6 77 12 34 56" onChange={(e) => setTelephone(e.target.value)} className={champ}/>
      </label>
    </div>
    {frais !== null ? <p className="text-small text-ink" data-testid="frais-livraison-plan">Frais de livraison : <b className="t-num">{frais ? formatPrice(frais) : 'gratuits'}</b></p> : null}
    {erreur ? <p className="text-small text-warn" role="alert">{erreur}</p> : null}
    <button disabled={envoi} className="press fill inline-flex min-h-11 items-center justify-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60">
      {envoi ? 'Un instant…' : frais === null ? 'Calculer les frais' : frais ? `Confirmer et payer ${formatPrice(frais)}` : 'Confirmer et créer ma commande'}
    </button>
  </form>
}
