import { NextResponse } from 'next/server'

import { adressesVisiteur } from '@/lib/appel-backend'
import { lireOffresMarketplace } from '@/lib/marketplace-data'
import { TAILLE_LOT_BOUTIQUE } from '@/lib/shop-catalogue'

/**
 * LE LOT SUIVANT DES PRODUITS D'UNE BOUTIQUE, AU DEFILEMENT OU A LA RECHERCHE.
 *
 * Une route plutot qu'un appel direct au backend, comme `/api/rayon-produits` :
 * le tri d'une grande boutique y prend jusqu'a 13 s, et la reponse gardee ici ne
 * se paie qu'une fois. Une recherche ou une categorie change d'adresse selon ce
 * que le visiteur envoie : elle est decomptee a son quota, pas a celui du site.
 */

const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/
const TRIS = ['recent', 'prix_asc', 'prix_desc'] as const
type Tri = (typeof TRIS)[number]
const estTri = (valeur: string): valeur is Tri => (TRIS as readonly string[]).includes(valeur)
const LONGUEUR_MAX = 80

export async function GET(requete: Request) {
  const parametres = new URL(requete.url).searchParams
  const boutique = parametres.get('boutique') ?? ''
  const page = Number(parametres.get('page') ?? 1)
  const tri = parametres.get('tri') ?? 'recent'
  const q = parametres.get('q')?.trim() ?? ''
  const categorie = parametres.get('categorie')?.trim() ?? ''
  if (!SLUG.test(boutique) || !Number.isInteger(page) || page < 1 || page > 10_000 || !estTri(tri) || q.length > LONGUEUR_MAX || categorie.length > LONGUEUR_MAX) {
    return NextResponse.json({ erreur: 'paramètres invalides' }, { status: 400 })
  }

  const liste = await lireOffresMarketplace(
    { boutique, page, tri, taille: TAILLE_LOT_BOUTIQUE, q: q || undefined, categorie: categorie || undefined },
    q || categorie ? adressesVisiteur(requete.headers) : undefined,
  )
  if (liste.indisponible) {
    return NextResponse.json({ erreur: 'catalogue indisponible' }, { status: 502, headers: { 'cache-control': 'no-store' } })
  }
  return NextResponse.json(
    { offres: liste.offres.map(({ boutique: _boutique, ...offre }) => offre), pagination: liste.pagination },
    { headers: { 'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } },
  )
}
