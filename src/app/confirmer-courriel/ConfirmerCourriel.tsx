'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { confirmerLienCourriel } from '@/lib/verification-courriel'

export function ConfirmerCourriel() {
  const jeton = useSearchParams().get('jeton') ?? ''
  const [etat, setEtat] = useState<'attente' | 'confirme' | 'erreur'>(jeton ? 'attente' : 'erreur')
  const [message, setMessage] = useState(jeton ? 'Confirmation en cours…' : 'Ce lien de confirmation est incomplet.')

  useEffect(() => {
    if (!jeton) return
    void confirmerLienCourriel(jeton)
      .then(() => { setEtat('confirme'); setMessage('Votre adresse est confirmée. Vos KATI pourront maintenant être débloqués.') })
      .catch((cause: unknown) => { setEtat('erreur'); setMessage(cause instanceof Error ? cause.message : 'Ce lien n’est plus valide.') })
  }, [jeton])

  return <section className="mx-auto my-16 max-w-xl rounded-2xl border border-ink-5 bg-white p-8 text-center shadow-sm">
    <h1 className="text-title font-bold">Confirmation de votre adresse</h1>
    <p className="mt-4" role="status">{message}</p>
    {etat !== 'attente' ? <Link className="mt-6 inline-block rounded-full bg-ink-1 px-6 py-3 font-bold text-white" href={etat === 'confirme' ? '/compte/kati' : '/'}>{etat === 'confirme' ? 'Voir mes KATI' : 'Retour à l’accueil'}</Link> : null}
  </section>
}
