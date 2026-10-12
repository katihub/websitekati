import type { Metadata } from 'next'
import { MarketplaceCheckout } from '@/components/marketplace/checkout/MarketplaceCheckout'

export const metadata: Metadata = { title: 'Passer ma commande', robots: { index: false, follow: false } }
export default async function CommandePage({ searchParams }: { searchParams: Promise<{ articles?: string }> }) {
  const { articles } = await searchParams
  return <MarketplaceCheckout selectedKeys={articles === undefined ? null : articles.split(',').slice(0, 50)}/>
}
