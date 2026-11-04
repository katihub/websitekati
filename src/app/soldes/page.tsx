import type { Metadata } from 'next'

import { lireOffresMarketplace } from '@/lib/marketplace-data'
import { hasShopDiscount } from '@/lib/shop-catalogue'
import { PromotionsMarketplace } from '@/components/marketplace/PromotionsMarketplace'

const TAILLE_LOT_SOLDES = 100

export const metadata: Metadata = {
  title: 'Soldes des boutiques',
  description: 'Découvrez les offres à prix réduits proposées par les boutiques KatiMarket.',
}

export default async function SoldesPage() {
  const liste = await lireOffresMarketplace({ page: 1, taille: TAILLE_LOT_SOLDES, tri: 'recent' })
  const soldes = liste.offres.filter((offre) => offre.disponible > 0 && hasShopDiscount(offre))
  const pageSuivante = liste.pagination.page < liste.pagination.pages ? liste.pagination.page + 1 : null

  return (
    <PromotionsMarketplace
      offresInitiales={soldes}
      pageInitiale={pageSuivante}
      indisponible={Boolean(liste.indisponible)}
      rubrique="soldes"
    />
  )
}
