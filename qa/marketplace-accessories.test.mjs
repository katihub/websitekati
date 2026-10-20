import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAccessoryRecommendationQuery } from '../src/lib/marketplace-accessories.ts'

test('builds a bounded category request without duplicate IDs or excluded product slugs', () => {
  const query = buildAccessoryRecommendationQuery(
    ['laptops', 'phones', 'laptops'],
    ['current-product', 'already-in-cart', 'already-in-cart'],
  )

  const params = new URLSearchParams(query.slice(1))
  assert.deepEqual(params.get('categories')?.split(','), ['laptops', 'phones'])
  assert.deepEqual(params.get('exclure')?.split(','), ['current-product', 'already-in-cart'])
})

test('encodes category IDs and slugs and emits no request when there are no source categories', () => {
  const query = buildAccessoryRecommendationQuery(['category/id'], ['product name'])
  const params = new URLSearchParams(query.slice(1))

  assert.equal(params.get('categories'), 'category/id')
  assert.equal(params.get('exclure'), 'product name')
  assert.equal(buildAccessoryRecommendationQuery([], ['anything']), '')
})
