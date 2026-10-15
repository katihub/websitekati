import type { Metadata } from 'next'
import { MarketplacePayment } from '@/components/marketplace/checkout/MarketplacePayment'

export const metadata: Metadata = { title: 'Régler mon acompte', robots: { index: false, follow: false } }
export default async function PaiementPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ suivi?: string }> }) {
  const { reference } = await params
  const { suivi } = await searchParams
  return <MarketplacePayment key={reference} reference={reference} jetonUrl={suivi}/>
}
