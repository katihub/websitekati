import assert from 'node:assert/strict'
import test from 'node:test'

import { adresseMarketplace } from '../src/lib/adresses-marketplace.ts'

test('sends the old NowTech shelves and families to their marketplace category', () => {
  assert.equal(adresseMarketplace('/categorie/electromenager'), '/categories/electromenager')
  assert.equal(adresseMarketplace('/rayon/reseaux-switchs-routeurs'), '/categories/informatique-reseau-et-wi-fi')
  assert.equal(adresseMarketplace('/categorie/televisions-tv-ecrans-plats'), '/categories/electronique-televisions')
  assert.equal(adresseMarketplace('/categorie/imprimantes-copieurs?tri=prix'), '/categories/informatique-imprimantes-et-scanners')
  assert.equal(adresseMarketplace('/rayon/securite-biometrie/'), '/categories/securite-surveillance')
})

test('falls back to the catalogue for an unknown family, to search for a brand or a product', () => {
  assert.equal(adresseMarketplace('/categorie/non-classe'), '/catalogue')
  assert.equal(adresseMarketplace('/rayon/services-occasion'), '/catalogue')
  assert.equal(adresseMarketplace('/marque/western-digital'), '/recherche?q=western+digital')
  assert.equal(adresseMarketplace('/produit/laptop-hp-probook-450-g10'), '/recherche?q=laptop+hp+probook+450+g10')
})

test('leaves every other address alone', () => {
  for (const href of ['/categories/informatique', '/catalogue?marque=HP', '/marketplace/produits/hp-15', 'https://exemple.cm/promo', '/boutiques/nowtech', '/categorie']) {
    assert.equal(adresseMarketplace(href), href)
  }
})
