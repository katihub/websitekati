import assert from 'node:assert/strict'
import test from 'node:test'

import { etoilesNote, resumeAvis } from '../src/lib/avis-produit.ts'

test('a product with real reviews shows its rating and count', () => {
  assert.deepEqual(resumeAvis({ moyenne: 4.3, nombre: 3 }), { etoiles: '★★★★☆', note: '4,3', nombre: '3 avis', libelle: 'Note 4,3 sur 5, 3 avis' })
  assert.equal(etoilesNote(4.5), '★★★★★')
  assert.equal(etoilesNote(1), '★☆☆☆☆')
})

test('a product without reviews shows « Nouveau », never an invented count', () => {
  assert.equal(resumeAvis(null), null)
  assert.equal(resumeAvis(undefined), null)
  assert.equal(resumeAvis({ moyenne: 0, nombre: 0 }), null)
})
