import type { Metadata } from 'next'
import { connection } from 'next/server'

import { OuvrirPlan } from '@/components/marketplace/plusieurs-fois/OuvrirPlan'

export const metadata: Metadata = { title: 'Payer en plusieurs fois — KatiMarket', robots: { index: false, follow: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ offre?: string; quantite?: string; nom?: string }> }) {
  await connection()
  const { offre, quantite, nom } = await searchParams
  const q = Math.max(1, Math.min(99, Math.floor(Number(quantite) || 1)))
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">KatiMarket</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Payer en plusieurs fois</h1>
      <div className="mt-7">
        {offre ? <OuvrirPlan offreId={offre} quantite={q} nom={nom?.slice(0, 200) || 'Votre produit'} /> : <p className="text-small text-ink">Choisissez d’abord un produit.</p>}
      </div>
    </main>
  )
}
