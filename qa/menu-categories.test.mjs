import assert from 'node:assert/strict'

import { categoriesDuMenu, LIMITE_CATEGORIES_MENU } from '../src/lib/menu-categories.ts'

const categories = Array.from({ length: 14 }, (_, ordre) => ({ ordre, nom: `Catégorie ${ordre}` }))
const menu = categoriesDuMenu(categories)

assert.equal(LIMITE_CATEGORIES_MENU, 11)
assert.equal(menu.length, 11)
assert.deepEqual(menu.map(categorie => categorie.ordre), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert.notEqual(menu, categories)
assert.equal(categories.length, 14)

console.log("Menu des catégories : ordre administratif conservé et limite d'accueil validée.")
