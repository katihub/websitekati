import type { Metadata } from 'next'

import { lireOffresMarketplace } from '@/lib/marketplace-data'
import { hasShopDiscount } from '@/lib/shop-catalogue'
import { PromotionsMarketplace } from '@/components/marketplace/PromotionsMarketplace'

const TAILLE_LOT_PROMOTIONS = 100

export const metadata: Metadata = {
  title: 'Promotions des boutiques',
  description: 'Découvrez les offres en promotion proposées par les boutiques KatiMarket.',
}

export default async function PromotionsPage() {
  const liste = await lireOffresMarketplace({ page: 1, taille: TAILLE_LOT_PROMOTIONS, tri: 'recent' })
  const promotions = liste.offres.filter((offre) => offre.disponible > 0 && hasShopDiscount(offre))
  const pageSuivante = liste.pagination.page < liste.pagination.pages ? liste.pagination.page + 1 : null

  return (
    <PromotionsMarketplace
      offresInitiales={promotions}
      pageInitiale={pageSuivante}
      indisponible={Boolean(liste.indisponible)}
    />
  )
}
