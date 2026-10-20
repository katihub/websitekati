'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { LIBELLES_DEVIS, dateCourte, fcfa, resumeDevis, type DevisMarketplace } from '@/lib/devis-marketplace'
import { useMarketplaceLanguage } from '@/lib/language'

type Etat = { phase: 'chargement' } | { phase: 'connexion' } | { phase: 'refus'; message: string } | { phase: 'prete'; devis: DevisMarketplace[] }

export function MesDevis() {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const { open: ouvrirCompte } = useAccount()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })

  // L'API decide de l'acces : sans session valable elle repond 401, et l'ecran propose la connexion.
  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    api<DevisMarketplace[]>('/marketplace/devis', { signal: controleur.signal })
      .then((devis) => { if (!controleur.signal.aborted) setEtat({ phase: 'prete', devis }) })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        setEtat(e instanceof ErreurApi && e.code === 401 ? { phase: 'connexion' } : { phase: 'refus', message: e instanceof ErreurApi ? e.message : 'Vos devis n’ont pas pu être chargés.' })
      })
    return () => controleur.abort()
  }, [])

  if (etat.phase === 'chargement') return <p className="text-small text-ink-3" role="status">{en ? 'Loading…' : 'Chargement…'}</p>
  if (etat.phase === 'connexion') {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">{en ? 'Sign in to view your quotes.' : 'Connectez-vous pour retrouver vos devis.'}</p>
      <button type="button" onClick={ouvrirCompte} className="press mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">{en ? 'Sign in' : 'Se connecter'}</button>
    </div>
  }
  if (etat.phase === 'refus') return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{etat.message}</p></div>
  if (etat.phase !== 'prete') return null
  if (!etat.devis.length) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">{en ? 'You have not requested a quote yet.' : 'Vous n’avez pas encore demandé de devis.'}</p>
      <Link href="/panier" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">{en ? 'Request a quote from your cart' : 'Demander un devis depuis mon panier'}</Link>
    </div>
  }

  return <ul className="flex flex-col gap-2" data-testid="mes-devis">
    {etat.devis.map((devis) => <li key={devis.id}>
      <Link href={`/compte/devis/${encodeURIComponent(devis.reference)}`} className="press flex items-center justify-between gap-3 rounded-well border border-rule px-4 py-3 transition-colors hover:border-ink">
        <span className="min-w-0">
          <span className="t-num block font-semibold text-ink">{devis.reference}{devis.entreprise ? <span className="font-normal text-ink-2"> · {devis.entreprise}</span> : null}</span>
          <span className="block text-micro text-ink-3">{new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(devis.creeLe))} · {devis.parties.length} {en ? (devis.parties.length === 1 ? 'shop' : 'shops') : `boutique${devis.parties.length > 1 ? 's' : ''}`} · {en ? (devis.statut === 'accepte' ? (devis.commande ? `Converted to order ${devis.commande.reference}` : 'Accepted') : devis.parties.some(p => p.acceptable) ? 'Ready to accept' : devis.parties.some(p => p.statut === 'en_attente') ? 'Waiting for shops' : 'No shop could confirm') : resumeDevis(devis)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${devis.statut === 'accepte' ? 'border-primary text-primary' : 'border-rule text-ink-2'}`}>{en ? (devis.statut === 'ouvert' ? 'In progress' : devis.statut === 'accepte' ? 'Accepted' : 'Cancelled') : LIBELLES_DEVIS[devis.statut]}</span>
          <span className="t-num text-small text-ink-2">{fcfa(devis.totalFcfa)}</span>
        </span>
      </Link>
    </li>)}
  </ul>
}
