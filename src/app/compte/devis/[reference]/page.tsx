import type { Metadata } from 'next'
import { connection } from 'next/server'

import { DetailDevis } from './DetailDevis'

export const metadata: Metadata = {
  title: 'Mon devis — KatiHub',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  await connection()
  const { reference } = await params
  return (
    <main className="mx-auto w-full max-w-[56rem] px-4 pt-10 pb-band md:pt-14">
      <DetailDevis reference={decodeURIComponent(reference)} />
    </main>
  )
}
