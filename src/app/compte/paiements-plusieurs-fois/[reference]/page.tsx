import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { DetailPlan } from '@/components/marketplace/plusieurs-fois/DetailPlan'

export const metadata: Metadata = { title: 'Paiement en plusieurs fois — KatiMarket', robots: { index: false, follow: false } }

export default async function Page({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ versement?: string }> }) {
  await connection()
  const { reference } = await params
  const { versement } = await searchParams
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <Link href="/compte/paiements-plusieurs-fois" className="t-label text-ink-3 hover:underline">Mes paiements en plusieurs fois</Link>
      <h1 className="t-num mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">{decodeURIComponent(reference).toUpperCase()}</h1>
      <div className="mt-7">
        <DetailPlan key={reference} reference={decodeURIComponent(reference)} versementUrl={versement} />
      </div>
    </main>
  )
}
