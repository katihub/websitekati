import assert from 'node:assert/strict'
import test from 'node:test'

import {
  interleaveCategoryProducts,
  isMarketplaceOfferInStock,
  selectHomepageProductOffers,
} from '../src/lib/mixed-category-products.ts'

function offer(id, productSlug, categorySlug, { available = 3, stock = 'en_stock', price = 100, reference = null, published = '01' } = {}) {
  return {
    id,
    disponible: available,
    ...(stock ? { statutStock: stock } : {}),
    prixFcfa: price,
    prixReferenceFcfa: reference,
    publieLe: `2026-11-${published.padStart(2, '0')}T00:00:00Z`,
    produit: {
      slug: productSlug,
      nom: productSlug,
      categorie: categorySlug,
      categorieRef: { slug: categorySlug, nom: categorySlug, parent: null },
    },
  }
}

test('interleaves categories, removes duplicate offers, and respects the limit', () => {
  const groups = [
    { offres: [{ id: 'computer' }, { id: 'screen' }, { id: 'mouse' }] },
    { offres: [{ id: 'printer' }, { id: 'labeler' }, { id: 'computer' }] },
    { offres: [{ id: 'screwdriver' }, { id: 'drill' }] },
  ]

  assert.deepEqual(
    interleaveCategoryProducts(groups, 7).map((product) => product.id),
    ['computer', 'printer', 'screwdriver', 'screen', 'labeler', 'drill', 'mouse'],
  )
})

test('returns an empty selection for an empty input or a non-positive limit', () => {
  assert.deepEqual(interleaveCategoryProducts([], 12), [])
  assert.deepEqual(interleaveCategoryProducts([{ offres: [{ id: 'computer' }] }], 0), [])
})

test('selects only stocked products across nested categories and keeps home shelves distinct', () => {
  const groups = [
    {
      nom: 'Électronique',
      slug: 'electronique',
      offres: [
        offer('phone-regular', 'phone', 'smartphones', { published: '01' }),
        offer('phone-deal', 'phone', 'smartphones', { price: 80, reference: 100, published: '02' }),
        offer('laptop', 'laptop', 'ordinateurs', { published: '03' }),
        offer('out-of-stock', 'out-of-stock', 'smartphones', { available: 0 }),
        offer('restocking', 'restocking', 'ordinateurs', { stock: 'reapprovisionnement' }),
        offer('speaker', 'speaker', 'audio', { stock: null, published: '05' }),
      ],
    },
    {
      nom: 'Maison',
      slug: 'maison',
      offres: [
        offer('lamp', 'lamp', 'eclairage', { published: '06' }),
        offer('chair', 'chair', 'mobilier', { published: '07' }),
        offer('unavailable', 'unavailable', 'mobilier', { stock: 'rupture' }),
      ],
    },
  ]

  const best = selectHomepageProductOffers(groups, 2)
  const bestSlugs = new Set(best.map((item) => item.produit.slug))
  const discoveries = selectHomepageProductOffers(groups, 8, bestSlugs, 'recent')

  assert.equal(best[0]?.id, 'phone-deal')
  assert.equal(best.length, 2)
  assert.ok(discoveries.length > 0)
  assert.ok(discoveries.every((item) => !bestSlugs.has(item.produit.slug)))
  assert.ok([...best, ...discoveries].every(isMarketplaceOfferInStock))
  assert.ok([...best, ...discoveries].some((item) => item.produit.categorieRef.slug === 'audio'))
})

test('recognizes explicit unavailable stock states even when quantity is positive', () => {
  assert.equal(isMarketplaceOfferInStock(offer('available', 'available', 'audio')), true)
  assert.equal(isMarketplaceOfferInStock(offer('empty', 'empty', 'audio', { available: 0 })), false)
  assert.equal(isMarketplaceOfferInStock(offer('rupture', 'rupture', 'audio', { stock: 'rupture' })), false)
  assert.equal(isMarketplaceOfferInStock(offer('restocking', 'restocking', 'audio', { stock: 'reapprovisionnement' })), false)
})
