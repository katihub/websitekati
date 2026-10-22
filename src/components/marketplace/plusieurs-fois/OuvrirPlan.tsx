'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

import { useAccount } from '@/lib/account'
import { api, apiDisponible, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { CONDITION_NON_REMBOURSEMENT, dureesProposees, type EligibiliteEchelonnement, type VersementPrepare } from '@/lib/paiement-plusieurs-fois'

const champ = 'min-h-11 rounded-control border border-rule bg-surface px-3 text-small text-ink'

/**
 * OUVRIR UN PAIEMENT EN PLUSIEURS FOIS. Le recapitulatif vient du serveur (prix
 * fige a l'ouverture, minimums, seuil de reservation) ; le client choisit sa
 * duree et son premier versement, accepte explicitement la regle de
 * non-remboursement, puis paie le premier versement depuis son espace.
 */
export function OuvrirPlan({ offreId, quantite, nom }: { offreId: string; quantite: number; nom: string }) {
  const router = useRouter()

  const { open: ouvrirCompte } = useAccount()
  const [conditions, setConditions] = useState<EligibiliteEchelonnement | null>(null)
  const [erreur, setErreur] = useState('')
  const [duree, setDuree] = useState<number | null>(null)
  const [premier, setPremier] = useState<number | null>(null)
  const [accepte, setAccepte] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (!apiDisponible) return
    let actif = true
    api<EligibiliteEchelonnement>(`/marketplace/echelonnement/offres/${encodeURIComponent(offreId)}?quantite=${quantite}`, { anonyme: true })
      .then((valeur) => { if (actif) setConditions(valeur) })
      .catch(() => { if (actif) setErreur('Les conditions de paiement ne peuvent pas être lues. Réessayez.') })
    return () => { actif = false }
  }, [offreId, quantite])

  if (!conditions) return <p className="text-small text-ink-3" role="status">{erreur || 'Chargement des conditions…'}</p>
  if (!conditions.eligible) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">{conditions.message ?? 'Ce produit ne peut pas être payé en plusieurs fois.'}</p>
      <Link href="/" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">Retour au catalogue</Link>
    </div>
  }

  const total = conditions.totalFcfa!
  const minimum = conditions.premierVersementMinFcfa!
  const durees = dureesProposees(conditions.dureeMaxJours!)
  const dureeChoisie = duree ?? durees[durees.length - 1]!.jours
  const premierChoisi = premier ?? minimum
  const tranches = conditions.mode === 'tranches_fixes' && conditions.nombreTranches
  const premierInvalide = !Number.isSafeInteger(premierChoisi) || premierChoisi < minimum || premierChoisi > total

  async function ouvrir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!accepte || premierInvalide || envoi) return
    setEnvoi(true); setErreur('')
    try {
      const reponse = await api<VersementPrepare>('/marketplace/echelonnement/plans', {
        methode: 'POST',
        corps: { offreId, quantite, dureeJours: dureeChoisie, premierVersementFcfa: premierChoisi, conditionsAcceptees: true },
      })
      router.push(`/compte/paiements-plusieurs-fois/${encodeURIComponent(reponse.plan)}?versement=${encodeURIComponent(reponse.versement ?? '')}`)
    } catch (cause) {
      // Un compte est obligatoire : sans session, la connexion s'ouvre et le formulaire reste rempli.
      if (cause instanceof ErreurApi && cause.code === 401) { ouvrirCompte(); setErreur('Connectez-vous pour ouvrir ce paiement : un compte est nécessaire pour suivre vos versements.') }
      else setErreur(cause instanceof ErreurApi ? cause.message : 'Le paiement n’a pas pu être ouvert. Réessayez.')
      setEnvoi(false)
    }
  }

  return <form onSubmit={ouvrir} className="flex flex-col gap-5" data-testid="ouvrir-plan">
    <section className="rounded-well border border-rule bg-space p-4">
      <p className="text-micro text-ink-3">Produit</p>
      <p className="text-body font-semibold text-ink">{quantite > 1 ? `${quantite} × ` : ''}{nom}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small">
        <dt className="text-ink-3">Prix total, figé aujourd’hui</dt><dd className="t-num text-right font-semibold text-ink" data-testid="total-plan">{formatPrice(total)}</dd>
        <dt className="text-ink-3">Produit réservé pour vous à partir de</dt><dd className="t-num text-right text-ink">{formatPrice(conditions.seuilReservationFcfa!)} versés</dd>
        <dt className="text-ink-3">{tranches ? 'Nombre de mensualités' : 'Versement minimum ensuite'}</dt><dd className="t-num text-right text-ink">{tranches ? `${conditions.nombreTranches} × ${formatPrice(minimum)}` : formatPrice(conditions.versementMinFcfa ?? 0)}</dd>
        <dt className="text-ink-3">Frais de livraison</dt><dd className="text-right text-ink">payés à la fin</dd>
      </dl>
      <p className="mt-3 text-micro text-ink-3">Vous versez à votre rythme. Le produit vous est livré dès que le prix est entièrement payé : ce n’est pas un crédit.</p>
    </section>

    <section className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-micro text-ink-2">Durée pour tout payer
        <select value={dureeChoisie} onChange={(e) => setDuree(Number(e.target.value))} className={champ} data-testid="duree-plan">
          {durees.map((d) => <option key={d.jours} value={d.jours}>{d.libelle}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-micro text-ink-2">Premier versement (FCFA)
        <input type="number" inputMode="numeric" min={minimum} max={total} step={1} value={premierChoisi} readOnly={Boolean(tranches)} aria-invalid={premierInvalide}
          onFocus={(e) => e.currentTarget.select()} onChange={(e) => setPremier(e.target.value === '' ? null : Math.floor(Number(e.target.value)))} className={champ} data-testid="premier-versement"/>
        <small className="text-ink-3">{tranches ? 'La première mensualité.' : `Au moins ${formatPrice(minimum)}, jusqu’à ${formatPrice(total)}.`}</small>
      </label>
    </section>

    <label className="flex items-start gap-3 rounded-well border border-warn p-4 text-small text-ink" data-testid="conditions-plan">
      <input type="checkbox" required checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1"/>
      <span>{CONDITION_NON_REMBOURSEMENT}</span>
    </label>

    {erreur ? <p className="text-small text-warn" role="alert">{erreur}</p> : null}
    <p className="text-micro text-ink-3">Un compte KatiMarket est nécessaire : vous y suivez vos versements et recevez les rappels avant l’échéance.</p>
    <button disabled={envoi || !accepte || premierInvalide} className="press fill inline-flex min-h-11 items-center justify-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60" data-testid="valider-plan">
      {envoi ? 'Ouverture…' : `Ouvrir et verser ${formatPrice(premierInvalide ? minimum : premierChoisi)}`}
    </button>
  </form>
}
