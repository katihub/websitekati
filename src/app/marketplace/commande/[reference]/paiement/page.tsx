import type { Metadata } from 'next'
import { MarketplacePayment } from '@/components/marketplace/checkout/MarketplacePayment'

export const metadata: Metadata = { title: 'Régler mon acompte', robots: { index: false, follow: false } }
export default async function PaiementPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  return <MarketplacePayment key={reference} reference={reference}/>
}
