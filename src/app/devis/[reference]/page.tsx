import type { Metadata } from 'next'
import { connection } from 'next/server'

import { DetailDevis } from '@/app/compte/devis/[reference]/DetailDevis'

export const metadata: Metadata = {
  title: 'Mon devis — KatiMarket',
  robots: { index: false, follow: false },
}

/** Le devis demande sans compte, ouvert par le lien recu par e-mail (`?suivi=`). */
export default async function Page({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ suivi?: string }> }) {
  await connection()
  const { reference } = await params
  const { suivi } = await searchParams
  return (
    <main className="mx-auto w-full max-w-[56rem] px-4 pt-10 pb-band md:pt-14">
      <DetailDevis reference={decodeURIComponent(reference)} sansCompte jetonUrl={suivi} />
    </main>
  )
}
