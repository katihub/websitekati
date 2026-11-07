import assert from 'node:assert/strict'
import test from 'node:test'

import { DELAIS_NOUVEL_ESSAI_MS, profilApresErreur, profilDesBoutiques } from '../src/lib/profil-compte.ts'

test('an account with at least one shop is a merchant, otherwise a customer', () => {
  assert.equal(profilDesBoutiques([{ id: 'nowtech' }]), 'marchand')
  assert.equal(profilDesBoutiques([]), 'client')
  assert.equal(profilDesBoutiques(null), 'client')
})

test('only a refusal settles the account as a customer', () => {
  assert.equal(profilApresErreur(403), 'client')
  assert.equal(profilApresErreur(401), 'client')
})

test('a busy, failing or unreachable API is asked again instead of hiding the shop', () => {
  for (const code of [429, 500, 502, 503, 0, null]) assert.equal(profilApresErreur(code), null)
  assert.ok(DELAIS_NOUVEL_ESSAI_MS.length >= 2)
})
