import assert from 'node:assert/strict'
import test from 'node:test'

import { piecesDuPanel, defileAutomatiquement, indiceSuivant } from '../src/lib/carrousel-accueil.ts'

const piece = (id, url) => ({ id, large: { url, largeur: 1600, hauteur: 600 } })

test('keeps the banners published from the panel and drops the bundled fallback', () => {
  const panel = piece(12, 'https://stockage.example/branding/grand-bandeau.webp')
  const repli = piece('banner-1-cuisine.jpg', '/branding/banner-1-cuisine.jpg')
  assert.deepEqual(piecesDuPanel([panel, repli]), [panel])
  assert.deepEqual(piecesDuPanel([repli]), [])
  assert.deepEqual(piecesDuPanel([]), [])
})

test('one image stays still, two or more scroll, reduced motion never scrolls', () => {
  assert.equal(defileAutomatiquement(0, false), false)
  assert.equal(defileAutomatiquement(1, false), false)
  assert.equal(defileAutomatiquement(2, false), true)
  assert.equal(defileAutomatiquement(5, true), false)
})

test('the next index wraps around in both directions', () => {
  assert.equal(indiceSuivant(0, 1, 3), 1)
  assert.equal(indiceSuivant(2, 1, 3), 0)
  assert.equal(indiceSuivant(0, -1, 3), 2)
  assert.equal(indiceSuivant(4, 1, 3), 2)
  assert.equal(indiceSuivant(0, 1, 0), 0)
})

test('the banner text comes from the panel fields and skips what is empty', async () => {
  const { texteBanniere } = await import('../src/lib/carrousel-accueil.ts')
  assert.deepEqual(
    texteBanniere({ label: ' Soldes de rentrée ', description: ' Jusqu\'à -40 % ', action: ' Voir les offres ' }),
    { titre: 'Soldes de rentrée', description: 'Jusqu\'à -40 %', action: 'Voir les offres' },
  )
  assert.deepEqual(
    texteBanniere({ label: 'Nouveautés', description: '   ', action: '' }),
    { titre: 'Nouveautés', description: '', action: 'Découvrir' },
  )
})
