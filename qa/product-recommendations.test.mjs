import assert from 'node:assert/strict'
import { selectShopRecommendations } from '../src/lib/product-recommendations.ts'
const offer = (slug, shop, category = 'Téléphones', stock = 1) => ({id:slug, disponible:stock, produit:{slug,categorie:category}, boutique:{slug:shop}})
const input = [offer('current','a'), offer('competitor','b'), offer('sold-out','a','Téléphones',0), offer('other-category','a','Maison'), offer('phone','a'), offer('phone','a'), ...Array.from({length:6},(_,i)=>offer(`extra-${i}`,'a'))]
const original = [...input]
const result = selectShopRecommendations(input,'a','current','Téléphones')
assert.equal(result.length,4)
assert.equal(result[0].produit.slug,'phone')
assert.ok(result.every(item=>item.boutique.slug==='a' && item.disponible>0 && item.produit.slug!=='current'))
assert.equal(new Set(result.map(item=>item.produit.slug)).size,result.length)
assert.deepEqual(input,original)
assert.deepEqual(selectShopRecommendations(input,'empty','current','Téléphones'),[])
console.log('Recommandations : boutique, catégorie, stock, exclusions, dédoublonnage et limite validés.')
