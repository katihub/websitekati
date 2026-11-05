import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesNotifications } from './MesNotifications'
import { LocalizedText } from '@/lib/language'

/**
 * L'HISTORIQUE DES NOTIFICATIONS DU CLIENT : commandes, livraisons, devis,
 * litiges, remboursements, KATI. La cloche de l'en-tete n'en montre que les
 * dernieres ; ici, tout se relit. Reserve au client connecte.
 */
export const metadata: Metadata = {
  title: 'Mes notifications — KatiMarket',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3"><LocalizedText fr="Mon compte" en="My account" /></p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink"><LocalizedText fr="Mes notifications" en="My notifications" /></h1>
      <div className="mt-7">
        <MesNotifications />
      </div>
    </main>
  )
}
