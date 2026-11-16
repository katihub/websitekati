import assert from 'node:assert/strict'
import test from 'node:test'

import { lireJsonMarketplaceAvecReprise } from '../src/lib/marketplace-resilience.ts'

const journalMuet = { warn() {}, error() {} }
const sansAttente = async () => undefined

test('une erreur temporaire est retentee puis la reponse est rendue', async () => {
  let appels = 0
  const valeur = await lireJsonMarketplaceAvecReprise({
    chemin: 'https://api.example/catalogue',
    journal: journalMuet,
    temporiser: sansAttente,
    fetcher: async () => {
      appels += 1
      return appels === 1
        ? new Response(null, { status: 503 })
        : Response.json({ offres: [1] })
    },
  })
  assert.equal(appels, 2)
  assert.deepEqual(valeur, { offres: [1] })
})

test('une erreur fonctionnelle ne produit pas de rafale', async () => {
  let appels = 0
  await assert.rejects(() => lireJsonMarketplaceAvecReprise({
    chemin: 'https://api.example/catalogue',
    journal: journalMuet,
    temporiser: sansAttente,
    fetcher: async () => {
      appels += 1
      return new Response(null, { status: 400 })
    },
  }), /400/)
  assert.equal(appels, 1)
})

test('un 404 attendu reste une boutique inconnue, pas une panne', async () => {
  const valeur = await lireJsonMarketplaceAvecReprise({
    chemin: 'https://api.example/boutiques/inconnue',
    absentSi404: true,
    journal: journalMuet,
    fetcher: async () => new Response(null, { status: 404 }),
  })
  assert.equal(valeur, null)
})
