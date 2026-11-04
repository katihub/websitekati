import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { lireBoutiqueMarketplace } from '@/lib/marketplace-data'
import { ShopStorefront } from '@/components/marketplace/ShopStorefront'

/**
 * Une liste vide fait de chaque boutique une page statique, construite a sa premiere
 * visite puis regeneree en arriere-plan, au lieu d'un rendu a chaque requete.
 */
export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const boutique = await lireBoutiqueMarketplace(slug)
  return {
    title: { absolute: boutique ? `${boutique.nom} — Boutique KatiMarket` : 'Boutique — KatiMarket' },
    description: boutique?.description ?? 'Découvrez les produits et les offres des boutiques locales sur KatiMarket.',
  }
}

export default async function BoutiquePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const boutique = await lireBoutiqueMarketplace(slug)
  if (!boutique) notFound()
  return <ShopStorefront key={boutique.id} shop={boutique} />
}
