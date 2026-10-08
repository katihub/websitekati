'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { PaiementMobile } from '@/components/paiement/PaiementMobile'
import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { resoudreJeton } from '@/lib/suivi'

/**
 * LOADS THE ORDER, THEN HANDS IT TO THE PAYMENT FORM.
 *
 * ON THE CLIENT AND NOT THE SERVER, BECAUSE THE SESSION IS HERE. The bearer
 * token lives in the browser's Supabase session; a server component has no
 * way to present it, and the backend answers 401 without one. Fetching on the
 * client is not a shortcut, it is where the credential is.
 *
 * A 404 IS NOT « NO SUCH ORDER ». The backend answers the same way for an
 * order that does not exist and for one belonging to somebody else — on
 * purpose, since distinguishing them would let anyone discover which
 * references are real, one guess at a time. The message below has to cover
 * both, and says so without pretending to know which.
 */

interface Commande {
  reference: string
  resteAPayer: number
  statutPaiement?: string
  statut?: string
}

type Etat =
  | { phase: 'chargement' }
  | { phase: 'prete'; commande: Commande; jeton: string | null }
  | { phase: 'refus'; code: number; message: string }

/**
 * `jetonUrl` : la cle d'une commande passee sans compte, lue dans le lien.
 * Sans elle, ce navigateur peut l'avoir gardee ; sinon, c'est la session.
 */
export function PaiementDeCommande({ reference, jetonUrl }: { reference: string; jetonUrl?: string }) {
  /* THE UNCONFIGURED CASE IS NOT A STATE, IT IS A FACT KNOWN AT RENDER.
     Writing it from inside an effect — which this repository forbids — would
     mean rendering « loading » for one frame before admitting that nothing can
     ever load. */
  const [etat, setEtat] = useState<Etat>(
    apiDisponible
      ? { phase: 'chargement' }
      : {
          phase: 'refus',
          code: 0,
          message: 'Le paiement en ligne n’est pas encore ouvert sur cette boutique.',
        },
  )

  useEffect(() => {
    if (!apiDisponible) return

    const controleur = new AbortController()
    const jeton = resoudreJeton(reference, jetonUrl)
    api<Commande>(
      jeton
        ? `/commandes/sans-compte/${encodeURIComponent(reference)}`
        : `/commandes/${encodeURIComponent(reference)}`,
      { signal: controleur.signal, jetonSuivi: jeton ?? undefined },
    )
      .then((commande) => {
        if (!controleur.signal.aborted) setEtat({ phase: 'prete', commande, jeton })
      })
      .catch((erreur: unknown) => {
        if (controleur.signal.aborted) return
        const code = erreur instanceof ErreurApi ? erreur.code : 0
        setEtat({
          phase: 'refus',
          code,
          message:
            code === 401
              ? 'Connectez-vous avec le compte qui a passé cette commande pour la régler.'
              : code === 404
                ? jetonUrl
                  ? 'Ce lien n’ouvre aucune commande. Vérifiez qu’il est complet, ou appelez-nous avec la référence.'
                  : 'Cette commande est introuvable, ou elle appartient à un autre compte.'
                : erreur instanceof ErreurApi
                  ? erreur.message
                  : 'La commande n’a pas pu être chargée. Vérifiez votre connexion.',
        })
      })

    return () => controleur.abort()
  }, [reference, jetonUrl])

  if (etat.phase === 'chargement') {
    return (
      <p className="text-small text-ink-3" role="status">
        Chargement de la commande…
      </p>
    )
  }

  if (etat.phase === 'refus') {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-small text-ink">{etat.message}</p>
        <Link
          href="/"
          className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2"
        >
          Retour à la boutique
        </Link>
      </div>
    )
  }

  /* UNE COMMANDE FERMEE N'A PAS DE FORMULAIRE. Le backend refuse desormais de
     la faire payer — mais laisser le client taper son numero et presser
     « Payer » pour recevoir un refus, c'est lui faire faire le travail d'un
     message. On le dit d'abord, en une phrase, avec la seule suite utile. */
  const fermee = FERMEES[etat.commande.statut ?? '']
  if (fermee) {
    return (
      <div className="rounded-well border border-rule bg-space p-4">
        <p className="text-body font-semibold text-ink">Cette commande est {fermee}.</p>
        <p className="mt-1 text-small text-ink-2">
          Elle ne peut plus être réglée en ligne. Si vous pensez qu’il s’agit d’une erreur,
          appelez-nous avec sa référence.
        </p>
      </div>
    )
  }

  return <PaiementMobile commande={etat.commande} jeton={etat.jeton} />
}

/** Les etats dans lesquels une commande ne se paie plus, dits comme au client. */
const FERMEES: Record<string, string> = {
  annulee: 'annulée',
  refusee: 'refusée',
  close: 'close',
  annulation_demandee: 'en cours d’annulation',
}
