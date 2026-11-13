import assert from 'node:assert/strict'
import test from 'node:test'

import { libelleStockFaible } from '../src/lib/stock.ts'

test('annonce seulement les stocks reels strictement inferieurs a cinq', () => {
  assert.equal(libelleStockFaible(4), 'Plus que 4 en stock')
  assert.equal(libelleStockFaible(1), 'Plus que 1 en stock')
  assert.equal(libelleStockFaible(4, true), 'Only 4 left in stock')
  assert.equal(libelleStockFaible(5), null)
  assert.equal(libelleStockFaible(0), null)
  assert.equal(libelleStockFaible(9999), null)
})
