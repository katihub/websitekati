'use client'

import Link from 'next/link'

import { formatKati, useGainKati } from '@/lib/kati'
import { useSession } from '@/lib/session'

/**
 * « CETTE COMMANDE VOUS RAPPORTE 10 000 KATI ». Le pourcentage vient de la
 * politique en vigueur ; les KATI ne vont qu'aux clients avec un compte.
 */
export function GainKati({ montantFcfa, className, afficherTaux = true }: { montantFcfa: number; className?: string; afficherTaux?: boolean }) {
  const gain = useGainKati(montantFcfa)
  const { session } = useSession()
  if (!gain || gain.points <= 0) return null
  return (
    <p className={className} data-testid="gain-kati">
      <strong>{session ? 'Cette commande vous rapporte' : 'Avec un compte, cette commande vous rapporte'} {formatKati(gain.points)}</strong>{' '}
      <span>
        {afficherTaux ? `(${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(gain.politique.gainClientBps / 100)} %).` : '.'}{' '}
        <Link href="/compte/kati">Mes KATI</Link>
      </span>
    </p>
  )
}
