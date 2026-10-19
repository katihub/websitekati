import { NextResponse } from 'next/server'

import { imageProduit } from '@/lib/image-produit'
import { lireOffresMarketplace } from '@/lib/marketplace-data'
import type { MarketplaceSuggestReply } from '@/types/marketplace-suggest'

const SANS_CACHE = { 'Cache-Control': 'no-store' } as const

/** Suggestions legeres pour la barre principale, derivees du meme catalogue que la page de recherche. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) ?? ''
  if (query.length < 2) {
    return NextResponse.json<MarketplaceSuggestReply>({ query, produits: [] }, { headers: SANS_CACHE })
  }

  const resultat = await lireOffresMarketplace({ q: query, page: 1, taille: 6 })
  if (resultat.indisponible) {
    return NextResponse.json({ message: 'Catalogue indisponible' }, { status: 503, headers: SANS_CACHE })
  }

  const produits = resultat.offres.map((offre) => ({
    id: offre.id,
    nom: offre.titre ?? offre.produit.nom,
    slug: offre.produit.slug,
    image: imageProduit(offre.produit)?.url ?? null,
    prixFcfa: offre.prixFcfa,
    boutique: { nom: offre.boutique.nom, slug: offre.boutique.slug },
  }))

  return NextResponse.json<MarketplaceSuggestReply>({ query, produits }, { headers: SANS_CACHE })
}
