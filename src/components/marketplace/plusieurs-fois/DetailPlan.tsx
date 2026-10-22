'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { useAccount } from '@/lib/account'
import { api, apiDisponible, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { LIBELLE_MODE } from '@/lib/modes-livraison'
import {
  dateCourte, joursRestants, LIBELLE_STATUT_PLAN, plansAVerser, TON_STATUT_PLAN,
  type PlanEchelonnement, type VersementPrepare,
} from '@/lib/paiement-plusieurs-fois'
import { useSession } from '@/lib/session'
import { ChoixLivraisonPlan } from './ChoixLivraisonPlan'
import { BarreProgression, PASTILLE } from './MesPlans'
import { PaiementVersement } from './PaiementVersement'

type VersementActif = { reference: string; montantFcfa: number; libelle: string }
const champ = 'min-h-11 rounded-control border border-rule bg-surface px-3 text-small text-ink'
const bouton = 'press fill inline-flex min-h-11 items-center justify-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60'

/** Un plan : son avancement, le prochain versement, la livraison une fois paye, l'abandon. */
export function DetailPlan({ reference, versementUrl }: { reference: string; versementUrl?: string }) {
  const { session } = useSession()
  const { open: ouvrirCompte } = useAccount()
  const [plan, setPlan] = useState<PlanEchelonnement | null>(null)
  const [erreur, setErreur] = useState('')
  const [actif, setActif] = useState<VersementActif | null>(null)
  const [montant, setMontant] = useState<number | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [abandon, setAbandon] = useState(false)
  const [changerLivraison, setChangerLivraison] = useState(false)
  const [connexion, setConnexion] = useState(false)
  const chemin = `/marketplace/echelonnement/plans/${encodeURIComponent(reference)}`

  const recevoir = useCallback((lu: PlanEchelonnement) => {
    setPlan(lu)
    setActif((courant) => {
      // Le versement en cours reste a l'ecran tant que le serveur ne le dit ni recu ni abandonne.
      if (courant) return lu.versements.some((v) => v.reference === courant.reference && v.statut !== 'en_attente') ? null : courant
      const demande = versementUrl ? lu.versements.find((v) => v.reference === versementUrl && v.statut === 'en_attente') : null
      return demande ? { reference: demande.reference, montantFcfa: demande.montantFcfa, libelle: demande.nature === 'livraison' ? 'Frais de livraison' : 'Versement' } : null
    })
  }, [versementUrl])

  // La session decide de relire, l'API decide de l'acces : un 401 propose la connexion.
  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    api<PlanEchelonnement>(chemin, { signal: controleur.signal })
      .then((lu) => { if (!controleur.signal.aborted) { recevoir(lu); setConnexion(false) } })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        if (e instanceof ErreurApi && e.code === 401) setConnexion(true)
        else setErreur(e instanceof ErreurApi ? e.message : 'Ce paiement n’a pas pu être chargé.')
      })
    return () => controleur.abort()
  }, [session, chemin, recevoir])

  const relire = useCallback(() => api<PlanEchelonnement>(chemin).then(recevoir).catch(() => undefined), [chemin, recevoir])

  if (connexion) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Connectez-vous pour suivre ce paiement.</p>
      <button type="button" onClick={ouvrirCompte} className={`${bouton} mt-4`}>Se connecter</button>
    </div>
  }
  if (erreur && !plan) return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{erreur}</p></div>
  if (!plan) return <p className="text-small text-ink-3" role="status">Chargement…</p>

  const prochain = plan.prochainVersement
  const montantChoisi = montant ?? prochain?.minimum ?? 0
  const montantInvalide = !prochain || !Number.isSafeInteger(montantChoisi) || montantChoisi < prochain.minimum || montantChoisi > prochain.maximum
  const fraisEnAttente = plan.statut === 'solde' && !plan.commande
    ? plan.versements.find((v) => v.nature === 'livraison' && v.statut === 'en_attente')
    : undefined
  const fraisPayes = plan.versements.some((v) => v.nature === 'livraison' && v.statut === 'recu')

  async function verser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (montantInvalide || envoi) return
    setEnvoi(true); setErreur('')
    try {
      const prepare = await api<VersementPrepare>(`${chemin}/versements`, { methode: 'POST', corps: { montantFcfa: montantChoisi } })
      setActif({ reference: prepare.versement!, montantFcfa: prepare.montantFcfa!, libelle: 'Versement' })
      void relire()
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'Le versement n’a pas pu être préparé. Réessayez.')
    } finally {
      setEnvoi(false)
    }
  }

  async function abandonner() {
    if (envoi) return
    setEnvoi(true); setErreur('')
    try {
      recevoir(await api<PlanEchelonnement>(`${chemin}/abandon`, { methode: 'POST', corps: { renonceAuRemboursement: true } }))
      setAbandon(false)
    } catch (cause) {
      setErreur(cause instanceof ErreurApi ? cause.message : 'L’abandon n’a pas pu être enregistré.')
    } finally {
      setEnvoi(false)
    }
  }

  function livraisonPreparee(resultat: VersementPrepare) {
    setChangerLivraison(false)
    if (resultat.versement && resultat.montantFcfa) setActif({ reference: resultat.versement, montantFcfa: resultat.montantFcfa, libelle: 'Frais de livraison' })
    void relire()
  }

  return <div className="flex flex-col gap-5" data-testid="detail-plan">
    <section className="rounded-well border border-rule bg-space p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/marketplace/produits/${plan.produit.slug}`} className="block font-semibold text-ink hover:underline">{plan.quantite > 1 ? `${plan.quantite} × ` : ''}{plan.produit.nom}</Link>
          <p className="t-num text-micro text-ink-3">{plan.reference} · {plan.boutique.nom}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${PASTILLE[TON_STATUT_PLAN[plan.statut]]}`} data-testid="statut-plan">{LIBELLE_STATUT_PLAN[plan.statut]}</span>
      </div>
      <div className="mt-4"><BarreProgression verse={plan.montantVerseFcfa} total={plan.totalProduitsFcfa}/></div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-3">Versé</dt><dd className="t-num text-right font-semibold text-ink" data-testid="montant-verse">{formatPrice(plan.montantVerseFcfa)}</dd>
        <dt className="text-ink-3">Prix figé</dt><dd className="t-num text-right text-ink">{formatPrice(plan.totalProduitsFcfa)}</dd>
        <dt className="text-ink-3">Reste à payer</dt><dd className="t-num text-right text-ink">{formatPrice(plan.resteFcfa)}</dd>
        {plansAVerser(plan.statut) ? <><dt className="text-ink-3">Échéance</dt><dd className="text-right text-ink">{dateCourte(plan.echeanceLe)} ({joursRestants(plan.echeanceLe)} jours)</dd></> : null}
      </dl>
      <p className="mt-3 text-micro text-ink-2">
        {plan.statut === 'reserve' || (plan.statut === 'solde' && plan.reserveLe) ? 'Le produit est réservé pour vous.'
          : plan.statut === 'ouvert' ? `Le produit sera réservé pour vous dès ${formatPrice(plan.seuilReservationFcfa)} versés.` : null}
      </p>
    </section>

    {erreur ? <p className="text-small text-warn" role="alert">{erreur}</p> : null}

    {actif ? <PaiementVersement plan={plan.reference} versement={actif.reference} montantFcfa={actif.montantFcfa} libelle={actif.libelle}
      onRecu={(lu) => { recevoir(lu); setActif(null); setMontant(null) }} onAnnuler={actif.libelle === 'Versement' ? () => setActif(null) : undefined}/> : null}

    {!actif && prochain && plansAVerser(plan.statut) ? <form onSubmit={verser} className="flex flex-col gap-3 rounded-well border border-rule p-4" data-testid="verser">
      <p className="text-small font-semibold text-ink">{plan.montantVerseFcfa === 0 ? 'Payer le premier versement' : 'Faire un versement'}</p>
      <label className="flex flex-col gap-1 text-micro text-ink-2">Montant (FCFA)
        <input type="number" inputMode="numeric" min={prochain.minimum} max={prochain.maximum} step={1} value={montantChoisi}
          onFocus={(e) => e.currentTarget.select()} onChange={(e) => setMontant(e.target.value === '' ? null : Math.floor(Number(e.target.value)))} className={champ} aria-invalid={montantInvalide} data-testid="montant-versement"/>
        <small className="text-ink-3">{prochain.minimum === prochain.maximum ? 'Le dernier versement solde le prix.' : `Entre ${formatPrice(prochain.minimum)} et ${formatPrice(prochain.maximum)}.`}</small>
      </label>
      <div className="flex flex-wrap gap-2">
        <button disabled={envoi || montantInvalide} className={bouton}>{envoi ? 'Préparation…' : `Verser ${formatPrice(montantInvalide ? prochain.minimum : montantChoisi)}`}</button>
        {prochain.maximum > prochain.minimum ? <button type="button" onClick={() => setMontant(prochain.maximum)} className="text-micro text-secondary underline underline-offset-2">Tout payer ({formatPrice(prochain.maximum)})</button> : null}
      </div>
    </form> : null}

    {!actif && plan.statut === 'solde' && !plan.commande ? (
      fraisEnAttente && plan.livraison && !changerLivraison
        ? <div className="flex flex-col gap-2 rounded-well border border-primary p-4">
          <p className="text-small text-ink">Livraison choisie : <b>{LIBELLE_MODE[plan.livraison.mode]}</b> à {plan.livraison.adresse.ville}. Frais : <b className="t-num">{formatPrice(fraisEnAttente.montantFcfa)}</b>.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={bouton} onClick={() => setActif({ reference: fraisEnAttente.reference, montantFcfa: fraisEnAttente.montantFcfa, libelle: 'Frais de livraison' })}>Payer les frais</button>
            <button type="button" className="text-micro text-ink-3 underline underline-offset-2" onClick={() => setChangerLivraison(true)}>Changer de livraison</button>
          </div>
        </div>
        : fraisPayes
          ? <p className="rounded-well border border-rule bg-space p-4 text-small text-ink">Vos frais de livraison sont payés. Votre commande est en cours de création : notre équipe vous contacte si besoin.</p>
          : <ChoixLivraisonPlan plan={plan} onPrepare={livraisonPreparee}/>
    ) : null}

    {plan.commande ? <div className="rounded-well border border-primary p-4" data-testid="commande-plan">
      <p className="text-small text-ink">Votre paiement est terminé : il est devenu la commande <b className="t-num">{plan.commande}</b>, entièrement payée.</p>
      <Link href={`/marketplace/commande/${encodeURIComponent(plan.commande)}/suivi`} className={`${bouton} mt-3`}>Suivre ma commande</Link>
    </div> : null}

    {['expire', 'abandonne', 'annule_defaillance'].includes(plan.statut) ? <div className="rounded-well border border-rule bg-space p-4 text-small text-ink">
      <p>{plan.statut === 'annule_defaillance'
        ? 'Ce paiement a été annulé parce que la boutique ou KatiMarket ne peut pas vous fournir le produit. Tout ce que vous avez versé vous est remboursé.'
        : plan.statut === 'expire' ? 'Ce paiement a expiré : l’échéance est passée avant que le prix soit entièrement payé. Les sommes versées ne sont pas remboursées.'
        : 'Vous avez abandonné ce paiement. Les sommes versées ne sont pas remboursées.'}</p>
      {plan.motifCloture ? <p className="mt-1 text-micro text-ink-3">{plan.motifCloture}</p> : null}
    </div> : null}

    {plan.versements.length ? <section>
      <h2 className="text-small font-semibold text-ink">Historique</h2>
      <ul className="mt-2 flex flex-col divide-y divide-rule rounded-well border border-rule" data-testid="historique-versements">
        {plan.versements.map((v) => <li key={v.reference} className="flex items-center justify-between gap-3 px-4 py-2 text-small">
          <span className="min-w-0"><span className="block text-ink">{v.nature === 'livraison' ? 'Frais de livraison' : 'Versement'} · {dateCourte(v.recuLe ?? v.creeLe)}</span><span className="t-num block text-micro text-ink-3">{v.reference}</span></span>
          <span className="flex flex-col items-end"><span className="t-num font-semibold text-ink">{formatPrice(v.montantFcfa)}</span><span className="text-micro text-ink-3">{v.statut === 'recu' ? 'Reçu' : v.statut === 'en_attente' ? 'En attente' : 'Non abouti'}</span></span>
        </li>)}
      </ul>
    </section> : null}

    {plansAVerser(plan.statut) && !actif ? <section className="rounded-well border border-rule p-4">
      {!abandon
        ? <button type="button" className="text-micro text-ink-3 underline underline-offset-2" onClick={() => setAbandon(true)} data-testid="abandonner">Abandonner ce paiement</button>
        : <div className="flex flex-col gap-3" role="alertdialog" aria-label="Abandonner ce paiement">
          <p className="text-small font-semibold text-warn">Attention : en abandonnant, vous ne serez pas remboursé.</p>
          <p className="text-small text-ink">Les {formatPrice(plan.montantVerseFcfa)} déjà versés restent acquis à KatiMarket, comme vous l’avez accepté à l’ouverture, et le produit n’est plus réservé pour vous.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={envoi} onClick={() => void abandonner()} className="press inline-flex min-h-11 items-center rounded-control border border-warn px-4 text-small font-bold text-warn" data-testid="confirmer-abandon">J’abandonne sans remboursement</button>
            <button type="button" onClick={() => setAbandon(false)} className={bouton}>Continuer à payer</button>
          </div>
        </div>}
    </section> : null}
  </div>
}
