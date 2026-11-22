import assert from 'node:assert/strict'
import test from 'node:test'

import { erreurActionnable } from '../src/lib/erreur-actionnable.ts'

test('une panne réseau ne montre jamais Failed to fetch', () => {
  const message = erreurActionnable(new TypeError('Failed to fetch'), 'Le brouillon est conservé.')
  assert.match(message, /connexion Internet a été interrompue/i)
  assert.match(message, /brouillon est conservé/i)
  assert.doesNotMatch(message, /failed to fetch/i)
})

test('un message métier précis reste lisible tel quel', () => {
  assert.equal(erreurActionnable(new Error('Cette photo dépasse 5 Mo.')), 'Cette photo dépasse 5 Mo.')
})

test('une erreur serveur technique est remplacée par une action compréhensible', () => {
  const cause = Object.assign(new Error('Internal server error'), { code: 500 })
  const message = erreurActionnable(cause)
  assert.match(message, /service KatiMarket est momentanément indisponible/i)
  assert.doesNotMatch(message, /internal server error/i)
})
