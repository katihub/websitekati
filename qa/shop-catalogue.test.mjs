import assert from 'node:assert/strict'
import { filterShopOffers, hasShopDiscount } from '../src/lib/shop-catalogue.ts'

const offer = (id, name, category, price, reference = null, stock = 3) => ({ id, titre: null, prixFcfa: price, prixReferenceFcfa: reference, disponible: stock, produit: { nom: name, slug: id, categorie: category, marque: 'Acme' } })
const offers = [offer('phone', 'Téléphone Bleu', 'Électronique', 15000, 20000), offer('bag', 'Sac de voyage', 'Mode', 8000), offer('quote', 'Ordinateur Pro', 'Informatique', null), offer('sold', 'Téléphone indisponible', 'Électronique', 5000, 7000, 0), offer('invalid', 'Prix inchangé', 'Mode', 10000, 10000)]
const original = structuredClone(offers)
assert.deepEqual(filterShopOffers(offers, { query: 'telephone bleu' }).map(item=>item.id), ['phone'])
assert.deepEqual(filterShopOffers(offers, { category: 'Mode', sort: 'prix_asc' }).map(item=>item.id), ['bag','invalid'])
assert.deepEqual(filterShopOffers(offers, { promotions: true }).map(item=>item.id), ['phone'])
assert.deepEqual(filterShopOffers(offers, { query: 'sans résultat' }), [])
assert.equal(filterShopOffers(offers, { sort: 'prix_desc' }).at(-1).id, 'quote')
assert.equal(hasShopDiscount(offers[4]), false)
assert.deepEqual(offers, original)
console.log('Boutique : recherche sans accents, catégories, promotions, prix sur demande, rupture et ordre validés.')
