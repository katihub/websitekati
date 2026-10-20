import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { lireOffresMarketplace } from '@/lib/marketplace-data'
import type { OffreMarketplace } from '@/lib/marketplace-data'
import { buildAccessoryRecommendationQuery } from '@/lib/marketplace-accessories'

import { MarketplaceProductDetail, type MarketplaceProduct } from '@/components/marketplace/MarketplaceProductDetail'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function chargerProduit(slug: string): Promise<MarketplaceProduct> {
  if (!API) throw new Error('NEXT_PUBLIC_API_URL est requis pour afficher le catalogue marketplace réel.')
  const reponse = await fetch(`${API}/v1/marketplace/produits/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  })
  if (reponse.status === 404) notFound()
  if (!reponse.ok) throw new Error(`Le catalogue KatiMarket a répondu ${reponse.status}.`)
  return reponse.json() as Promise<MarketplaceProduct>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const produit = await chargerProduit(slug)
    const titre = produit.metaTitre || `${produit.nom} — KatiMarket`
    const description = produit.metaDescription || produit.description || `Comparez les vendeurs vérifiés pour ${produit.nom} sur KatiMarket.`
    const image = produit.images?.[0]
    return {
      title: { absolute: titre },
      description,
      alternates: { canonical: `/marketplace/produits/${produit.slug}` },
      openGraph: { title: titre, description, type: 'website', images: image ? [{ url: image.url, alt: image.texteAlternatif ?? produit.nom }] : undefined },
    }
  } catch {
    return { title: { absolute: 'Produit — KatiMarket' } }
  }
}

export default async function ProduitMarketplacePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ boutique?: string }> }) {
  const { slug } = await params
  const { boutique: preferredShop } = await searchParams
  const produit = await chargerProduit(slug)
  let accessoires: OffreMarketplace[] = []
  const accessoryQuery = buildAccessoryRecommendationQuery(produit.categorieDetail?.id ? [produit.categorieDetail.id] : [], [slug])
  if (accessoryQuery) {
    try {
      const response = await fetch(`${API}/v1/marketplace/accessoires${accessoryQuery}`, { next: { revalidate: 30 }, headers: { Accept: 'application/json' } })
      if (response.ok) accessoires = await response.json() as OffreMarketplace[]
    } catch {
      accessoires = []
    }
  }
  const shops = [...new Set(produit.offres.map(offer => offer.boutique.slug))]
  const results = await Promise.all(shops.map(async boutique => {
    const data = await lireOffresMarketplace({ boutique, taille: 24 })
    return [boutique, data.offres.filter(offer => offer.produit.slug !== slug)] as const
  }))
  return <MarketplaceProductDetail key={`${slug}:${preferredShop ?? ''}`} product={produit} preferredShop={preferredShop} recommendations={Object.fromEntries(results)} accessories={accessoires} />
}
