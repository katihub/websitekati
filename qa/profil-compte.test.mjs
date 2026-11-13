import assert from 'node:assert/strict'
import test from 'node:test'

import { DELAIS_NOUVEL_ESSAI_MS, profilApresErreur, profilDesBoutiques, sessionARenouveler } from '../src/lib/profil-compte.ts'

test('an account with at least one shop is a merchant, otherwise a customer', () => {
  assert.equal(profilDesBoutiques([{ id: 'nowtech' }]), 'marchand')
  assert.equal(profilDesBoutiques([]), 'client')
  assert.equal(profilDesBoutiques(null), 'client')
})

test('only a refusal of access settles the account as a customer', () => {
  assert.equal(profilApresErreur(403), 'client')
})

test('an expired session renews and asks again instead of hiding the shop (13 November 2026)', () => {
  assert.equal(profilApresErreur(401), null)
  assert.equal(sessionARenouveler(401), true)
  for (const code of [403, 429, 500, 0, null]) assert.equal(sessionARenouveler(code), false)
})

test('a busy, failing or unreachable API is asked again instead of hiding the shop', () => {
  for (const code of [429, 500, 502, 503, 0, null]) assert.equal(profilApresErreur(code), null)
  assert.ok(DELAIS_NOUVEL_ESSAI_MS.length >= 2)
})
