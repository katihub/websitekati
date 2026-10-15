'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { formatKati, usePolitiqueKati, type HistoriqueKati, type OperationKati, type PortefeuilleKati } from '@/lib/kati'
import { CarteParrainage } from '@/components/marketplace/kati/CarteParrainage'

type Etat = { phase: 'chargement' } | { phase: 'connexion' } | { phase: 'refus'; message: string } | { phase: 'prete'; portefeuille: PortefeuilleKati; historique: HistoriqueKati }

const fcfa = (montant: number) => `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`
const date = (valeur: string) => new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(valeur))
const LIBELLES: Record<OperationKati['type'], string> = {
  attribution: 'Gain en attente',
  liberation: 'Disponible',
  reservation: 'Réservé pour une commande',
  utilisation: 'Utilisé',
  annulation: 'Repris',
  expiration: 'Expiré',
  correction: 'Correction KatiHub',
}

/** La variation que l'operation apporte au client : le disponible d'abord, l'attente sinon. */
function variation(operation: OperationKati) {
  if (operation.type === 'liberation') return { points: operation.disponible, signe: '' }
  const points = operation.disponible + operation.enAttente + operation.reserve
  return { points, signe: points > 0 ? '+' : points < 0 ? '−' : '' }
}

export function MesKati() {
  const { open: ouvrirCompte } = useAccount()
  const politique = usePolitiqueKati()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const [suite, setSuite] = useState(false)

  useEffect(() => {
    if (!apiDisponible) return
    const controleur = new AbortController()
    Promise.all([
      api<PortefeuilleKati>('/marketplace/kati/moi', { signal: controleur.signal }),
      api<HistoriqueKati>('/marketplace/kati/moi/historique', { signal: controleur.signal }),
    ])
      .then(([portefeuille, historique]) => { if (!controleur.signal.aborted) setEtat({ phase: 'prete', portefeuille, historique }) })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        setEtat(e instanceof ErreurApi && e.code === 401 ? { phase: 'connexion' } : { phase: 'refus', message: e instanceof ErreurApi ? e.message : 'Vos KATI n’ont pas pu être chargés.' })
      })
    return () => controleur.abort()
  }, [])

  async function plus() {
    if (etat.phase !== 'prete') return
    setSuite(true)
    try {
      const page = await api<HistoriqueKati>(`/marketplace/kati/moi/historique?page=${etat.historique.page + 1}`)
      setEtat({ ...etat, historique: { ...page, elements: [...etat.historique.elements, ...page.elements] } })
    } finally {
      setSuite(false)
    }
  }

  if (etat.phase === 'chargement') return <p className="text-small text-ink-3" role="status">Chargement…</p>
  if (etat.phase === 'connexion') {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Connectez-vous pour voir vos KATI. Chaque commande livrée vous en rapporte.</p>
      <button type="button" onClick={ouvrirCompte} className="press mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">Se connecter</button>
    </div>
  }
  if (etat.phase === 'refus') return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{etat.message}</p></div>
  if (etat.phase !== 'prete') return null
  const { portefeuille, historique } = etat

  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Soldes">
      <div className="rounded-well bg-ink p-5 text-white" data-testid="kati-disponible">
        <p className="text-micro opacity-75">Disponibles</p>
        <p className="t-num mt-1 text-h2 font-semibold">{formatKati(portefeuille.disponible)}</p>
        <p className="text-small opacity-80">soit {fcfa(portefeuille.valeurFcfa.disponible)} d’achats sur KatiHub</p>
      </div>
      <div className="rounded-well border border-rule p-5" data-testid="kati-en-attente">
        <p className="text-micro text-ink-3">En attente</p>
        <p className="t-num mt-1 text-h3 font-semibold text-ink">{formatKati(portefeuille.enAttente)}</p>
        <p className="text-small text-ink-2">{fcfa(portefeuille.valeurFcfa.enAttente)}, utilisables après le délai de retour</p>
      </div>
    </section>

    {politique ? <p className="rounded-well border border-rule bg-space p-4 text-small text-ink-2">
      Chaque commande livrée vous rapporte <strong className="text-ink">{new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(politique.gainClientBps / 100)} %</strong> de son montant en KATI ({new Intl.NumberFormat('fr-FR').format(politique.katiParFcfa)} KATI = 1 FCFA). Ils deviennent utilisables {politique.liberationApresLivraisonJours} jours après la livraison{politique.expirationGainsMois ? ` et restent valables ${politique.expirationGainsMois} mois` : ''}.
    </p> : null}

    {portefeuille.gainsEnAttente.length ? <section aria-labelledby="kati-attente-titre">
      <h2 id="kati-attente-titre" className="text-h4 font-semibold text-ink">Bientôt disponibles</h2>
      <ul className="mt-2 divide-y divide-rule rounded-well border border-rule">
        {portefeuille.gainsEnAttente.map((gain) => <li key={gain.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 text-small text-ink">{gain.commission ? 'Commission de parrainage' : gain.commande ? `Commande ${gain.commande}` : gain.libelle}{gain.disponibleLe ? <span className="block text-micro text-ink-3">Disponibles le {date(gain.disponibleLe)}</span> : null}</span>
          <span className="t-num shrink-0 font-semibold text-ink">{formatKati(gain.points)}</span>
        </li>)}
      </ul>
    </section> : null}

    <CarteParrainage />

    <section aria-labelledby="kati-historique-titre">
      <h2 id="kati-historique-titre" className="text-h4 font-semibold text-ink">Historique</h2>
      {historique.elements.length ? <ul className="mt-2 divide-y divide-rule rounded-well border border-rule" data-testid="kati-historique">
        {historique.elements.map((operation) => {
          const { points, signe } = variation(operation)
          return <li key={operation.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-small text-ink">{LIBELLES[operation.type]}{operation.commission ? ' · parrainage' : ''}</span>
              <span className="block text-micro text-ink-3">{date(operation.creeLe)}{operation.commande ? ` · ${operation.commande}` : ''} · {operation.libelle}</span>
            </span>
            <span className={`t-num shrink-0 font-semibold ${points < 0 ? 'text-warn' : 'text-ink'}`}>{signe}{formatKati(Math.abs(points))}</span>
          </li>
        })}
      </ul> : <div className="mt-2 rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">Vous n’avez pas encore de KATI. Votre première commande livrée vous en rapportera.</p>
        <Link href="/catalogue" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">Découvrir le catalogue</Link>
      </div>}
      {historique.elements.length < historique.total ? <button type="button" disabled={suite} onClick={() => void plus()} className="press mt-3 min-h-11 rounded-control border border-rule px-4 text-small font-semibold">{suite ? 'Chargement…' : 'Voir plus'}</button> : null}
    </section>
  </div>
}
