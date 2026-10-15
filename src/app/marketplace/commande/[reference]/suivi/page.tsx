import type { Metadata } from 'next'

import { SuiviMarketplace } from './SuiviMarketplace'

export const metadata: Metadata = {
  title: 'Suivi de commande — KatiHub',
  robots: { index: false, follow: false },
}

export default async function Page({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ suivi?: string }> }) {
  const { reference } = await params
  const { suivi } = await searchParams
  return <SuiviMarketplace reference={decodeURIComponent(reference)} jetonUrl={suivi} />
}
