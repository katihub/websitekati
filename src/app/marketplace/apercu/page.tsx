import type { Metadata } from 'next'

import { MarketplacePreview } from './MarketplacePreview'

export const metadata: Metadata = {
  title: { absolute: 'Aperçu marketplace — KatiMarket' },
  description: 'Fiche produit multi-vendeurs de référence pour la marketplace KatiMarket.',
}

export default function MarketplaceApercuPage() {
  return <MarketplacePreview />
}
