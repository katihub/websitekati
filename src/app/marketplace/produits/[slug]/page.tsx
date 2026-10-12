import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { lireOffresMarketplace } from '@/lib/marketplace-data'

import { MarketplaceProductDetail, type MarketplaceProduct } from '@/components/marketplace/MarketplaceProductDetail'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function chargerProduit(slug: string): Promise<MarketplaceProduct> {
  if (!API) throw new Error('NEXT_PUBLIC_API_URL est requis pour afficher le catalogue marketplace réel.')
  const reponse = await fetch(`${API}/v1/marketplace/produits/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  })
  if (reponse.status === 404) notFound()
  if (!reponse.ok) throw new Error(`Le catalogue KatiHub a répondu ${reponse.status}.`)
  return reponse.json() as Promise<MarketplaceProduct>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const produit = await chargerProduit(slug)
    return {
      title: { absolute: `${produit.nom} — KatiHub` },
      description: produit.description ?? `Comparez les vendeurs vérifiés pour ${produit.nom} sur KatiHub.`,
    }
  } catch {
    return { title: { absolute: 'Produit — KatiHub' } }
  }
}

export default async function ProduitMarketplacePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ boutique?: string }> }) {
  const { slug } = await params
  const { boutique: preferredShop } = await searchParams
  const produit = await chargerProduit(slug)
  const shops = [...new Set(produit.offres.map(offer => offer.boutique.slug))]
  const results = await Promise.all(shops.map(async boutique => {
    const data = await lireOffresMarketplace({ boutique, taille: 24 })
    return [boutique, data.offres.filter(offer => offer.produit.slug !== slug)] as const
  }))
  return <MarketplaceProductDetail key={`${slug}:${preferredShop ?? ''}`} product={produit} preferredShop={preferredShop} recommendations={Object.fromEntries(results)} />
}
