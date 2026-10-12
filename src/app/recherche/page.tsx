import type { Metadata } from 'next'
import { MarketplaceCatalogue } from '@/components/marketplace/MarketplaceCatalogue'
import { catalogueParams, type CatalogueParams } from '@/lib/catalogue-params'

export const metadata: Metadata = { title: 'Recherche', robots: { index: false, follow: true } }

export default async function RecherchePage({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return <MarketplaceCatalogue mode="recherche" {...catalogueParams(await searchParams)} />
}
