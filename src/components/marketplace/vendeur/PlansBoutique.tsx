'use client'

import { useEffect, useState } from 'react'

import { api, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { dateCourte, LIBELLE_STATUT_PLAN, type StatutPlan } from '@/lib/paiement-plusieurs-fois'

type PlanBoutique = {
  reference: string
  statut: StatutPlan
  quantite: number
  totalProduitsFcfa: number
  progressionBps: number
  stockReserve: number
  echeanceLe: string
  commande: string | null
  offre: { id: string; nom: string }
}

/**
 * LES PAIEMENTS EN PLUSIEURS FOIS SUR LES OFFRES DE LA BOUTIQUE, en lecture
 * seule et sans l'identite des clients : le stock qu'ils retiennent, leur
 * avancement, et la commande qu'ils deviennent une fois payes.
 */
export function PlansBoutique({ shopId }: { shopId: string }) {
  const [plans, setPlans] = useState<PlanBoutique[] | null>(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    const controleur = new AbortController()
    api<PlanBoutique[]>(`/marketplace/boutiques/${shopId}/echelonnement/plans`, { signal: controleur.signal })
      .then((valeur) => { if (!controleur.signal.aborted) setPlans(valeur) })
      .catch((e: unknown) => { if (!controleur.signal.aborted) setErreur(e instanceof ErreurApi ? e.message : 'Les paiements en plusieurs fois ne peuvent pas être lus.') })
    return () => controleur.abort()
  }, [shopId])

  if (erreur) return <p data-testid="plans-boutique-erreur">{erreur}</p>
  if (!plans) return <p>Chargement…</p>
  if (!plans.length) return <p data-testid="plans-boutique-vide">Aucun paiement en plusieurs fois en cours. Cochez « Accepte le paiement en plusieurs fois » sur une offre pour le proposer à vos clients.</p>
  const reserve = plans.reduce((s, p) => s + p.stockReserve, 0)
  return <div data-testid="plans-boutique">
    <p>{plans.length} paiement(s) · {reserve} article(s) réservé(s) dans votre stock. Vous êtes payé comme pour une commande ordinaire, une fois le produit livré.</p>
    <table>
      <thead><tr><th>Plan</th><th>Offre</th><th>Avancement</th><th>Stock réservé</th><th>Échéance</th><th>État</th></tr></thead>
      <tbody>{plans.map((p) => <tr key={p.reference}>
        <td>{p.reference}</td>
        <td>{p.quantite > 1 ? `${p.quantite} × ` : ''}{p.offre.nom}</td>
        <td>{Math.floor(p.progressionBps / 100)} % de {formatPrice(p.totalProduitsFcfa)}</td>
        <td>{p.stockReserve}</td>
        <td>{dateCourte(p.echeanceLe)}</td>
        <td>{p.commande ? `Commande ${p.commande}` : LIBELLE_STATUT_PLAN[p.statut]}</td>
      </tr>)}</tbody>
    </table>
  </div>
}
