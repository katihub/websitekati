import type { Metadata } from 'next'

import { SuiviMarketplace } from './SuiviMarketplace'

export const metadata: Metadata = {
  title: 'Suivi de commande — KatiHub',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return <SuiviMarketplace reference={decodeURIComponent(reference)} />
}
