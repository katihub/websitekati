import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesPlans } from '@/components/marketplace/plusieurs-fois/MesPlans'

/** Les paiements en plusieurs fois du client : les suivre, verser, choisir la livraison. */
export const metadata: Metadata = { title: 'Mes paiements en plusieurs fois — KatiMarket', robots: { index: false, follow: false } }

export default async function Page() {
  await connection()
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Mon compte</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Mes paiements en plusieurs fois</h1>
      <div className="mt-7">
        <MesPlans />
      </div>
    </main>
  )
}
