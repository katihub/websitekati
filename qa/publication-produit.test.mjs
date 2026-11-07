import assert from 'node:assert/strict'
import test from 'node:test'

import { avertissementPhoto, lirePrix, offreDuPrix, produitSansPrix } from '../src/lib/publication-produit.ts'

test('a live product without a published or pending price is flagged', () => {
  assert.equal(produitSansPrix({ statut: 'actif' }, []), true)
  assert.equal(produitSansPrix({ statut: 'actif' }, [{ statut: 'brouillon', revisions: [{ statut: 'refusee' }] }]), true)
  assert.equal(produitSansPrix({ statut: 'actif' }, [{ statut: 'publiee' }]), false)
  assert.equal(produitSansPrix({ statut: 'actif' }, [{ statut: 'brouillon', revisions: [{ statut: 'soumise' }] }]), false)
  assert.equal(produitSansPrix({ statut: 'suspendu' }, []), false)
})

test('the offer of an added price takes the shop delivery and the category warranty', () => {
  const offre = offreDuPrix({ id: 'p1', nom: 'Cintres à linges', slug: 'cintres-a-linges', garantieMinimaleMois: 3 }, 2500, {
    modesLivraison: ['katihub', 'vendeur', 'retrait'],
    villesLivraison: ['Douala'],
  })
  assert.deepEqual(offre, {
    produitId: 'p1', referenceVendeur: 'cintres-a-linges', titre: 'Cintres à linges', prixFcfa: 2500, etat: 'neuf',
    garantieMois: 3, modesLivraison: ['katihub', 'vendeur'], villesLivraison: ['Douala'], delaiMaxJours: 2, quantiteMinimale: 1,
  })
})

test('reads a price typed with spaces, refuses anything else', () => {
  assert.equal(lirePrix('15 000'), 15000)
  assert.equal(lirePrix('0'), null)
  assert.equal(lirePrix('12,5'), null)
  assert.equal(lirePrix(''), null)
})

test('warns about a small or stretched photo, never about a good one', () => {
  assert.equal(avertissementPhoto(1000, 1000), null)
  assert.match(avertissementPhoto(400, 300), /400 × 300 px : elle risque d’être floue/)
  assert.match(avertissementPhoto(2000, 900), /très allongée/)
})
