import type { Metadata } from 'next'
import { MarketplaceCatalogue } from '@/components/marketplace/MarketplaceCatalogue'
import { catalogueParams, type CatalogueParams } from '@/lib/catalogue-params'

export const metadata: Metadata = { title: 'Catalogue multivendeur', description: 'Découvrez les offres disponibles auprès des boutiques vérifiées de KatiMarket.' }

export default async function CataloguePage({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return <MarketplaceCatalogue {...catalogueParams(await searchParams)} />
}
