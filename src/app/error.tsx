'use client'

import { useEffect } from 'react'

import { PanneCatalogue } from '@/components/layout/PanneCatalogue'

/**
 * CE QUI LEVE MALGRE TOUT.
 *
 * Les pages du catalogue attrapent leur panne et la dessinent elles-memes, dans
 * le HTML du serveur (`@/lib/panne-catalogue`). Cette frontiere reste pour le
 * reste : une erreur que personne n'attendait, ou une page qui n'enveloppe pas
 * encore sa lecture. Elle n'est rendue que par le navigateur, d'ou le relais.
 *
 * `retry` ET NON `reset` : la page doit relire le backend, pas redessiner ce
 * qui a deja echoue.
 */
export default function Erreur({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <PanneCatalogue retry={retry} />
}
