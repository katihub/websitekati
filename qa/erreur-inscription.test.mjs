import assert from 'node:assert/strict'
import test from 'node:test'

import { estErreurReseau, messageErreurInscription } from '../src/lib/erreur-inscription.ts'

const erreur = (message, extra = {}) => Object.assign(new Error(message), extra)

test('recognises a lost connection, whatever the browser says', () => {
  for (const texte of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
    assert.equal(estErreurReseau(new TypeError(texte)), true, texte)
  }
  assert.equal(estErreurReseau(erreur('x', { name: 'AuthRetryableFetchError', status: 0 })), true)
  assert.equal(estErreurReseau(erreur('Ce nom de boutique est deja utilise', { code: 409 })), false)
})

test('never shows « Failed to fetch »: says whether the application is saved and what to do', () => {
  const candidature = messageErreurInscription(new TypeError('Failed to fetch'), 'candidature')
  assert.match(candidature, /votre candidature n’a pas été enregistrée/)
  assert.doesNotMatch(candidature, /Failed to fetch/)
  assert.match(messageErreurInscription(new TypeError('Failed to fetch'), 'acces'), /candidature est bien enregistrée/)
})

test('a server failure is explained; a 4xx keeps the server message', () => {
  assert.match(messageErreurInscription(erreur('Internal server error', { code: 500 }), 'candidature'), /problème technique chez KatiMarket/)
  assert.match(messageErreurInscription(erreur('Too Many Requests', { code: 429 }), 'candidature'), /Patientez une minute/)
  assert.equal(messageErreurInscription(erreur('Ce nom de boutique est deja utilise', { code: 409 }), 'candidature'), 'Ce nom de boutique est deja utilise')
})
