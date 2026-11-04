import { NextResponse } from 'next/server'

import { lireOffresMarketplace } from '@/lib/marketplace-data'
import { hasShopDiscount } from '@/lib/shop-catalogue'

const TAILLE_LOT_PROMOTIONS = 100

export async function GET(requete: Request) {
  const page = Number(new URL(requete.url).searchParams.get('page') ?? 1)
  if (!Number.isInteger(page) || page < 1 || page > 10_000) {
    return NextResponse.json({ erreur: 'page invalide' }, { status: 400 })
  }

  const liste = await lireOffresMarketplace({ page, taille: TAILLE_LOT_PROMOTIONS, tri: 'recent' })
  if (liste.indisponible) {
    return NextResponse.json({ erreur: 'catalogue indisponible' }, { status: 502, headers: { 'cache-control': 'no-store' } })
  }

  return NextResponse.json(
    {
      offres: liste.offres.filter((offre) => offre.disponible > 0 && hasShopDiscount(offre)),
      pageSuivante: liste.pagination.page < liste.pagination.pages ? liste.pagination.page + 1 : null,
    },
    { headers: { 'cache-control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120' } },
  )
}
