import assert from 'node:assert/strict'
import { checkLines, groupDeliveries, livrableDans, estimatedDeposit, checkedTotal, fraisAgencePourTrajet } from '../src/lib/marketplace-checkout.ts'

const line = { slug: 'telephone', name: 'Téléphone', price: 10000, qty: 2, offerId: 'offre-a', boutiqueId: 'boutique-a' }
const offer = { id: 'offre-a', titre: 'Téléphone', prixFcfa: 12000, disponible: 3, modesLivraison: ['vendeur', 'katihub'], villesLivraison: ['Douala', 'Yaoundé'], boutique: { id: 'boutique-a', nom: 'Boutique A', slug: 'boutique-a' } }
const product = { slug: 'telephone', nom: 'Téléphone', offres: [offer] }
const checked = checkLines([line], [product])
assert.equal(checked[0].issue, null)
assert.equal(checkedTotal(checked), 24000)
assert.equal(checkLines([{ ...line, qty: 4 }], [product])[0].issue.includes('Stock'), true)
assert.equal(checkLines([{ ...line, boutiqueId: 'autre' }], [product])[0].issue.includes('boutique'), true)
assert.equal(checkLines([line], [])[0].issue.includes('disponible'), true)
const second = { ...offer, id: 'offre-b', modesLivraison: ['katihub'], villesLivraison: ['douala'] }
const both = checkLines([line, { ...line, offerId: 'offre-b' }], [{ ...product, offres: [offer, second] }])
const groupe = groupDeliveries(both)[0]
assert.deepEqual(groupe.modes, ['katihub'])
assert.equal(livrableDans(groupe, 'Douala'), true)
const sansVille = groupDeliveries(checkLines([line], [{ ...product, offres: [{ ...offer, villesLivraison: [] }] }]))[0]
assert.equal(livrableDans(sansVille, 'Douala'), false)
assert.equal(estimatedDeposit(149001), 14901)
assert.equal(estimatedDeposit(500), 500)
assert.equal(estimatedDeposit(1001), 1000)
assert.equal(estimatedDeposit(0), 0)
const tarifsAgence = [
  { villeDepartId: 'douala', villeArriveeId: 'kribi', villeDepart: 'Douala', villeArrivee: 'Kribi', tauxBps: 500 },
  { villeDepartId: 'maroua', villeArriveeId: 'kribi', villeDepart: 'Maroua', villeArrivee: 'Kribi', tauxBps: 1000 },
]
assert.deepEqual(fraisAgencePourTrajet(tarifsAgence, 'Douala', 'Kribi', 100000), {
  fraisFcfa: 5000,
  villeDepartId: 'douala',
  villeArriveeId: 'kribi',
  tauxBps: 500,
})
assert.deepEqual(fraisAgencePourTrajet(tarifsAgence, 'Maroua', 'Kribi', 50000), {
  fraisFcfa: 5000,
  villeDepartId: 'maroua',
  villeArriveeId: 'kribi',
  tauxBps: 1000,
})
assert.equal(fraisAgencePourTrajet(tarifsAgence, 'Douala', 'Garoua', 100000), null)
console.log('Marketplace checkout: prix réels, stock, boutique, modes communs, villes et acompte OK')
