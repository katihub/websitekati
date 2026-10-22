'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import { normalisePhone } from '@/lib/account'
import { api, ErreurApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import type { PlanEchelonnement } from '@/lib/paiement-plusieurs-fois'

const ATTENTE_MAX_MS = 180_000

/**
 * PAYER UN VERSEMENT PREPARE. Le montant est relu par le serveur : la vitrine
 * n'envoie que la reference du versement et le numero a debiter. Ce qui fait
 * foi est le rappel du prestataire ; l'ecran relit le plan jusqu'a le voir.
 */
export function PaiementVersement({ plan, versement, montantFcfa, libelle, onRecu, onAnnuler }: {
  plan: string
  versement: string
  montantFcfa: number
  libelle: string
  onRecu: (plan: PlanEchelonnement) => void
  onAnnuler?: () => void
}) {
  const [telephone, setTelephone] = useState('')
  const [operateur, setOperateur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [attente, setAttente] = useState<{ transId: string; depuis: number } | null>(null)
  const [erreur, setErreur] = useState('')
  const verrou = useRef(false)

  useEffect(() => {
    if (!attente) return
    const controleur = new AbortController()
    let minuterie: ReturnType<typeof setTimeout>
    async function relire() {
      try {
        const lu = await api<PlanEchelonnement>(`/marketplace/echelonnement/plans/${encodeURIComponent(plan)}`, { signal: controleur.signal })
        if (controleur.signal.aborted) return
        if (lu.versements.some((v) => v.reference === versement && v.statut === 'recu')) { verrou.current = false; setAttente(null); onRecu(lu); return }
      } catch { /* Une lecture echouee n'est pas un paiement echoue. */ }
      if (controleur.signal.aborted) return
      if (Date.now() - attente!.depuis > ATTENTE_MAX_MS) {
        verrou.current = false; setAttente(null)
        setErreur('La confirmation prend du temps. Actualisez la page dans quelques minutes avant de relancer un paiement.')
        return
      }
      minuterie = setTimeout(relire, 4000)
    }
    minuterie = setTimeout(relire, 4000)
    return () => { clearTimeout(minuterie); controleur.abort() }
  }, [attente, plan, versement, onRecu])

  async function payer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (verrou.current) return
    const numero = normalisePhone(telephone)
    if (!numero) return setErreur('Indiquez un numéro camerounais valide commençant par 6.')
    verrou.current = true; setEnvoi(true); setErreur('')
    try {
      const reponse = await api<{ transId: string }>('/paiements/fapshi/echelonnement/direct', { methode: 'POST', corps: { reference: versement, telephone: numero, ...(operateur ? { operateur } : {}) } })
      setAttente({ transId: reponse.transId, depuis: Date.now() })
    } catch (cause) {
      verrou.current = false
      setErreur(cause instanceof ErreurApi && cause.code === 503 ? 'Le service de paiement est momentanément indisponible. Réessayez plus tard.' : cause instanceof ErreurApi ? cause.message : 'La demande n’a pas pu être envoyée. Réessayez.')
    } finally {
      setEnvoi(false)
    }
  }

  if (attente) {
    return <div className="rounded-well border border-secondary bg-space p-4" role="status" data-testid="versement-en-attente">
      <p className="text-small font-semibold text-ink">Validez la demande de {formatPrice(montantFcfa)} sur votre téléphone.</p>
      <p className="mt-1 text-micro text-ink-3">Ne saisissez jamais votre code secret sur KatiMarket. Nous attendons la confirmation du prestataire.</p>
      <p className="mt-2 text-micro text-ink-3">Transaction : {attente.transId}</p>
    </div>
  }

  return <form onSubmit={payer} className="rounded-well border border-rule bg-space p-4" data-testid="paiement-versement">
    <p className="text-small font-semibold text-ink">{libelle} : {formatPrice(montantFcfa)}</p>
    <label className="mt-3 flex flex-col gap-1 text-micro text-ink-2">Numéro Orange Money ou MTN Mobile Money à débiter
      <input type="tel" required autoComplete="tel" value={telephone} placeholder="6 77 12 34 56" onChange={(e) => setTelephone(e.target.value)} className="min-h-11 rounded-control border border-rule bg-surface px-3 text-small text-ink"/>
    </label>
    <fieldset className="mt-3 flex flex-wrap gap-3 text-micro text-ink-2"><legend className="mb-1">Opérateur</legend>
      {[['', 'Automatique'], ['orange money', 'Orange Money'], ['mobile money', 'MTN Mobile Money']].map(([valeur, nom]) => <label key={valeur} className="inline-flex items-center gap-1"><input type="radio" name="operateur" checked={operateur === valeur} onChange={() => setOperateur(valeur)}/>{nom}</label>)}
    </fieldset>
    {erreur ? <p className="mt-3 text-small text-warn" role="alert">{erreur}</p> : null}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button disabled={envoi} className="press fill inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60">
        {envoi ? 'Demande en cours…' : `Payer ${formatPrice(montantFcfa)}`}
      </button>
      {onAnnuler ? <button type="button" onClick={onAnnuler} className="text-micro text-ink-3 underline underline-offset-2">Changer le montant</button> : null}
    </div>
  </form>
}
