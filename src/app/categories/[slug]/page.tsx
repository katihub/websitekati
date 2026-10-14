import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { MarketplaceCatalogue } from '@/components/marketplace/MarketplaceCatalogue'
import { catalogueParams, type CatalogueParams } from '@/lib/catalogue-params'
import { lireCategoriesMarketplace, type CategorieArbre } from '@/lib/marketplace-data'

/**
 * UNE CATEGORIE OU UNE SOUS-CATEGORIE : ses produits (sous-categories comprises),
 * ses sous-categories pour affiner, et le chemin qui y mene.
 */

async function trouver(slug: string): Promise<{ categorie: { nom: string; slug: string }; parent: CategorieArbre | null; sous: CategorieArbre['sousCategories']; garantie: string | null } | null> {
  const arbre = await lireCategoriesMarketplace()
  for (const racine of arbre) {
    if (racine.slug === slug) return { categorie: racine, parent: null, sous: racine.sousCategories, garantie: racine.garantie.mois ? racine.garantie.libelle : null }
    const sous = racine.sousCategories.find((s) => s.slug === slug)
    if (sous) return { categorie: sous, parent: racine, sous: [], garantie: sous.garantie.mois ? sous.garantie.libelle : null }
  }
  return null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const trouvee = await trouver((await params).slug)
  if (!trouvee) return { title: 'Catégorie' }
  const chemin = trouvee.parent ? `${trouvee.parent.nom} › ${trouvee.categorie.nom}` : trouvee.categorie.nom
  return {
    title: chemin,
    description: `${chemin} : les offres des boutiques vérifiées de KatiHub${trouvee.garantie ? `, garantie minimale ${trouvee.garantie}` : ''}. Livraison à Douala et Yaoundé.`,
    alternates: { canonical: `/categories/${trouvee.categorie.slug}` },
  }
}

export default async function CategoriePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogueParams> }) {
  const { slug } = await params
  const trouvee = await trouver(slug)
  if (!trouvee) notFound()
  const filtres = catalogueParams(await searchParams)
  return <MarketplaceCatalogue {...filtres} categorie="" categorieSlug={slug} sousCategories={trouvee.sous.map((s) => ({ nom: s.nom, slug: s.slug }))} />
}
