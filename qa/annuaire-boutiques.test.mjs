import assert from 'node:assert/strict'
import test from 'node:test'

import { adresseAnnuaire, numerosDePage } from '../src/lib/annuaire-boutiques.ts'

test('la premiere page sans filtre garde une adresse nue', () => {
  assert.equal(adresseAnnuaire('/boutiques', { page: 1 }), '/boutiques')
})

test('la page, la recherche et la ville passent dans l adresse', () => {
  assert.equal(adresseAnnuaire('/boutiques', { page: 2, recherche: ' électro ', ville: 'Yaoundé' }), '/boutiques?q=%C3%A9lectro&ville=Yaound%C3%A9&page=2')
})

test('les numeros gardent la premiere, la derniere et les voisines', () => {
  assert.deepEqual(numerosDePage(1, 1), [1])
  assert.deepEqual(numerosDePage(1, 2), [1, 2])
  assert.deepEqual(numerosDePage(5, 10), [1, 4, 5, 6, 10])
})
