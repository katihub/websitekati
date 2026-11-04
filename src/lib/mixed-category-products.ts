import type { OffreMarketplace } from '@/lib/marketplace-data'

type ProductGroup<T> = {
  readonly offres: readonly T[]
}

type MarketplaceProductGroup = {
  readonly nom: string
  readonly slug: string
  readonly offres: readonly OffreMarketplace[]
}

type SelectionOrder = 'offers' | 'recent'

export function isMarketplaceOfferInStock(offre: OffreMarketplace) {
  return offre.disponible > 0 && (offre.statutStock === undefined || offre.statutStock === 'en_stock')
}

function discountRate(offre: OffreMarketplace) {
  if (offre.prixFcfa === null || !offre.prixReferenceFcfa || offre.prixReferenceFcfa <= offre.prixFcfa) return 0
  return (offre.prixReferenceFcfa - offre.prixFcfa) / offre.prixReferenceFcfa
}

function publicationTime(offre: OffreMarketplace) {
  return offre.publieLe ? Date.parse(offre.publieLe) || 0 : 0
}

function compareOffers(a: OffreMarketplace, b: OffreMarketplace, order: SelectionOrder) {
  const priceFirst = Number(b.prixFcfa !== null) - Number(a.prixFcfa !== null)
  const discountFirst = discountRate(b) - discountRate(a)
  const recentFirst = publicationTime(b) - publicationTime(a)
  return order === 'recent'
    ? recentFirst || priceFirst || discountFirst
    : priceFirst || discountFirst || recentFirst
}

function productKey(offre: OffreMarketplace) {
  return offre.produit.slug || offre.id
}

/**
 * Selects stocked, unique products across the deepest category returned by the
 * offers API. Excluded product slugs allow adjacent home shelves to stay distinct.
 */
export function selectHomepageProductOffers(
  groups: readonly MarketplaceProductGroup[],
  limit: number,
  excludedProducts: ReadonlySet<string> = new Set(),
  order: SelectionOrder = 'offers',
) {
  if (limit <= 0 || groups.length === 0) return []

  const bestOfferByProduct = new Map<string, OffreMarketplace>()
  for (const group of groups) {
    for (const offre of group.offres) {
      if (!isMarketplaceOfferInStock(offre)) continue
      const key = productKey(offre)
      const previous = bestOfferByProduct.get(key)
      if (!previous || compareOffers(offre, previous, order) < 0) bestOfferByProduct.set(key, offre)
    }
  }

  const byCategory = new Map<string, { nom: string; slug: string; offres: OffreMarketplace[] }>()
  for (const group of groups) {
    for (const offre of group.offres) {
      if (bestOfferByProduct.get(productKey(offre)) !== offre) continue
      const categorie = offre.produit.categorieRef
      const slug = categorie?.slug ?? `${group.slug}:${offre.produit.categorie ?? 'autres'}`
      const categoryGroup = byCategory.get(slug) ?? {
        nom: categorie?.nom ?? offre.produit.categorie ?? group.nom,
        slug,
        offres: [],
      }
      categoryGroup.offres.push(offre)
      byCategory.set(slug, categoryGroup)
    }
  }

  const productsByCategory = [...byCategory.values()].map(({ offres }) => [...offres].sort((a, b) => compareOffers(a, b, order)))

  const selected: OffreMarketplace[] = []
  const seen = new Set(excludedProducts)
  const longestCategory = Math.max(0, ...productsByCategory.map((products) => products.length))
  for (let index = 0; index < longestCategory && selected.length < limit; index += 1) {
    for (const products of productsByCategory) {
      const offre = products[index]
      if (!offre) continue
      const key = productKey(offre)
      if (seen.has(key)) continue
      seen.add(key)
      selected.push(offre)
      if (selected.length === limit) break
    }
  }
  return selected
}

/**
 * Construit une sélection variée en prenant un produit par catégorie à chaque
 * passage. Les doublons sont écartés lorsqu'une même offre remonte dans deux
 * groupes voisins.
 */
export function interleaveCategoryProducts<T extends { readonly id: string }>(
  groups: readonly ProductGroup<T>[],
  limit = 18,
): T[] {
  if (limit <= 0 || groups.length === 0) return []

  const products: T[] = []
  const seen = new Set<string>()
  const longestGroup = Math.max(...groups.map((group) => group.offres.length))

  for (let productIndex = 0; productIndex < longestGroup && products.length < limit; productIndex += 1) {
    for (const group of groups) {
      const product = group.offres[productIndex]
      if (!product || seen.has(product.id)) continue
      seen.add(product.id)
      products.push(product)
      if (products.length === limit) break
    }
  }

  return products
}
