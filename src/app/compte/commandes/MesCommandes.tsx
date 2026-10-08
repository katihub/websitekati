'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { useAccount } from '@/lib/account'
import {
  type CommandeResume,
  libelleRemise,
  libelleStatut,
  tonStatut,
  totalAffiche,
} from '@/lib/commandes'
import { formatPrice } from '@/lib/format'
import { useSession } from '@/lib/session'

type Etat =
  | { phase: 'chargement' }
  | { phase: 'refus'; message: string }
  | { phase: 'prete'; commandes: CommandeResume[] }

export function MesCommandes() {
  const { session, chargement } = useSession()
  const { open: ouvrirCompte } = useAccount()
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })

  useEffect(() => {
    // Sans session, rien à charger : le cas « non connecté » est décidé au
    // rendu, pas écrit ici — un setState synchrone dans l'effet est interdit.
    if (!apiDisponible || chargement || !session) return
    const controleur = new AbortController()
    api<CommandeResume[]>('/commandes', { signal: controleur.signal })
      .then((commandes) => {
        if (!controleur.signal.aborted) setEtat({ phase: 'prete', commandes })
      })
      .catch((e: unknown) => {
        if (controleur.signal.aborted) return
        setEtat({
          phase: 'refus',
          message: e instanceof ErreurApi ? e.message : 'Vos commandes n’ont pas pu être chargées.',
        })
      })
    return () => controleur.abort()
  }, [session, chargement])

  if (chargement) {
    return (
      <p className="text-small text-ink-3" role="status">
        Chargement…
      </p>
    )
  }

  if (!session) {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">Connectez-vous pour retrouver vos commandes.</p>
        <button
          type="button"
          onClick={ouvrirCompte}
          className="press fill mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface [--fill-to:var(--secondary)]"
        >
          Se connecter
        </button>
      </div>
    )
  }

  if (etat.phase === 'chargement') {
    return (
      <p className="text-small text-ink-3" role="status">
        Chargement…
      </p>
    )
  }

  if (etat.phase === 'refus') {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">{etat.message}</p>
      </div>
    )
  }

  if (etat.commandes.length === 0) {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">Vous n’avez pas encore de commande.</p>
        <Link href="/" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">
          Parcourir le catalogue
        </Link>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {etat.commandes.map((c) => (
        <li key={c.id}>
          <Link
            href={`/commande/${encodeURIComponent(c.reference)}`}
            className="press flex items-center justify-between gap-3 rounded-well border border-rule px-4 py-3 transition-colors hover:border-ink"
          >
            <span className="min-w-0">
              <span className="t-num block font-semibold text-ink">{c.reference}</span>
              <span className="block text-micro text-ink-3">
                {libelleRemise(c.modeRemise)}
                {c._count ? ` · ${c._count.lignes} article${c._count.lignes > 1 ? 's' : ''}` : ''}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${pastille(
                  tonStatut(c.statut),
                )}`}
              >
                {libelleStatut(c.statut)}
              </span>
              <span className="t-num text-small text-ink-2">{formatPrice(totalAffiche(c))}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function pastille(ton: 'neutre' | 'progres' | 'succes' | 'alerte'): string {
  return {
    neutre: 'border-rule text-ink-2',
    progres: 'border-secondary text-ink',
    succes: 'border-primary text-primary',
    alerte: 'border-warn bg-warn text-on-surface',
  }[ton]
}
