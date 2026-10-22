'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useAccount } from '@/lib/account'
import { api, apiDisponible, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { joursRestants, LIBELLE_STATUT_PLAN, plansAVerser, pourcentage, TON_STATUT_PLAN, type PlanEchelonnement } from '@/lib/paiement-plusieurs-fois'
import { useSession } from '@/lib/session'

export const PASTILLE: Record<'neutre' | 'progres' | 'succes' | 'alerte', string> = {
  neutre: 'border-rule text-ink-2',
  progres: 'border-secondary text-ink',
  succes: 'border-primary text-primary',
  alerte: 'border-warn bg-warn text-on-surface',
}

export function BarreProgression({ verse, total }: { verse: number; total: number }) {
  const p = pourcentage(verse, total)
  return <div className="h-2 w-full overflow-hidden rounded-pill bg-space-2" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${p} % payé`}>
    <div className="h-full rounded-pill bg-secondary" style={{ width: `${p}%` }}/>
  </div>
}

/** « Mes paiements en plusieurs fois » : chaque plan, son avancement et ce qu'il attend. */
export function MesPlans() {
  const { session } = useSession()
  const { open: ouvrirCompte } = useAccount()
  const [plans, setPlans] = useState<PlanEchelonnement[] | null>(null)
  const [erreur, setErreur] = useState('')
  const [connexion, setConnexion] = useState(false)

  // La session decide de relire, l'API decide de l'acces : un 401 propose la connexion.
  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    api<PlanEchelonnement[]>('/marketplace/echelonnement/plans', { signal: controleur.signal })
      .then((valeur) => { if (!controleur.signal.aborted) { setPlans(valeur); setConnexion(false) } })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        if (e instanceof ErreurApi && e.code === 401) setConnexion(true)
        else setErreur(e instanceof ErreurApi ? e.message : 'Vos paiements n’ont pas pu être chargés.')
      })
    return () => controleur.abort()
  }, [session])

  if (connexion) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Connectez-vous pour suivre vos paiements en plusieurs fois.</p>
      <button type="button" onClick={ouvrirCompte} className="press fill mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)]">Se connecter</button>
    </div>
  }
  if (erreur) return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{erreur}</p></div>
  if (!plans) return <p className="text-small text-ink-3" role="status">Chargement…</p>
  if (!plans.length) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Vous n’avez pas de paiement en plusieurs fois.</p>
      <p className="mt-1 text-micro text-ink-3">Sur la fiche d’un produit éligible, choisissez « Payer en plusieurs fois » : vous versez à votre rythme et le produit est livré une fois payé.</p>
      <Link href="/" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">Parcourir le catalogue</Link>
    </div>
  }

  return <ul className="flex flex-col gap-2" data-testid="mes-plans">
    {plans.map((plan) => <li key={plan.reference}>
      <Link href={`/compte/paiements-plusieurs-fois/${encodeURIComponent(plan.reference)}`} className="press flex flex-col gap-2 rounded-well border border-rule px-4 py-3 transition-colors hover:border-ink">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{plan.produit.nom}</span>
            <span className="t-num block text-micro text-ink-3">{plan.reference} · {plan.boutique.nom}</span>
          </span>
          <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${PASTILLE[TON_STATUT_PLAN[plan.statut]]}`}>{LIBELLE_STATUT_PLAN[plan.statut]}</span>
        </span>
        <BarreProgression verse={plan.montantVerseFcfa} total={plan.totalProduitsFcfa}/>
        <span className="flex justify-between text-micro text-ink-2">
          <span className="t-num">{formatPrice(plan.montantVerseFcfa)} sur {formatPrice(plan.totalProduitsFcfa)}</span>
          <span>{plansAVerser(plan.statut) ? `${joursRestants(plan.echeanceLe)} jours restants` : plan.commande ? `Commande ${plan.commande}` : ''}</span>
        </span>
      </Link>
    </li>)}
  </ul>
}
