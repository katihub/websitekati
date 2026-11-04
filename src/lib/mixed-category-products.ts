type ProductGroup<T> = {
  readonly offres: readonly T[]
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
