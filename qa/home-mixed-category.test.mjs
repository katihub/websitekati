import assert from 'node:assert/strict'
import test from 'node:test'

import { interleaveCategoryProducts } from '../src/lib/mixed-category-products.ts'

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
