import type { Metadata } from 'next'
import { lireAccueilMarketplace } from '@/lib/marketplace-data'
import { MarketplaceCart } from '@/components/marketplace/checkout/MarketplaceCart'

export const metadata: Metadata = { title: 'Mon panier' }
export default async function PanierPage() {
  return <MarketplaceCart catalogue={await lireAccueilMarketplace()}/>
}
