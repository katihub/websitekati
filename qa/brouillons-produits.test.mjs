import assert from 'node:assert/strict'
import test from 'node:test'

import { cleBrouillonProduit, listerBrouillonsProduits, sauverBrouillonProduit, supprimerBrouillonProduit } from '../src/lib/brouillons-produits.ts'

class Memoire {
  donnees = new Map()
  get length() { return this.donnees.size }
  key(index) { return [...this.donnees.keys()][index] ?? null }
  getItem(cle) { return this.donnees.get(cle) ?? null }
  setItem(cle, valeur) { this.donnees.set(cle, String(valeur)) }
  removeItem(cle) { this.donnees.delete(cle) }
}

const base = (cleCreation, nom, enregistreLe) => ({
  version: 2, cleCreation, enregistreLe,
  values: { nom, marque: '', categorie: '', sousCategorie: '', accessoireCategorie: '', description: '', descriptionCourte: '', ficheTechnique: '', metaTitre: '', metaDescription: '' },
  variantes: [], vente: { etat: 'neuf', garantie: '', delai: '2' }, autres: [], avaitPhotos: false,
})

test('plusieurs brouillons d une boutique restent independants et tries', () => {
  const stockage = new Memoire()
  sauverBrouillonProduit(stockage, 'b1', base('c1', 'Premier', '2026-11-22T10:00:00.000Z'))
  sauverBrouillonProduit(stockage, 'b1', base('c2', 'Second', '2026-11-22T11:00:00.000Z'))
  sauverBrouillonProduit(stockage, 'b2', base('c3', 'Autre boutique', '2026-11-22T12:00:00.000Z'))
  assert.deepEqual(listerBrouillonsProduits(stockage, 'b1').map((b) => b.values.nom), ['Second', 'Premier'])
})

test('abandonner un brouillon ne touche pas aux autres', () => {
  const stockage = new Memoire()
  sauverBrouillonProduit(stockage, 'b1', base('c1', 'Premier', '2026-11-22T10:00:00.000Z'))
  sauverBrouillonProduit(stockage, 'b1', base('c2', 'Second', '2026-11-22T11:00:00.000Z'))
  supprimerBrouillonProduit(stockage, 'b1', 'c1')
  assert.equal(stockage.getItem(cleBrouillonProduit('b1', 'c1')), null)
  assert.deepEqual(listerBrouillonsProduits(stockage, 'b1').map((b) => b.cleCreation), ['c2'])
})

test('l ancien brouillon unique est migre sans perte', () => {
  const stockage = new Memoire()
  stockage.setItem('katimarket:produit:brouillon:b1', JSON.stringify({ ...base('ancien', 'Ancien', '2026-11-22T10:00:00.000Z'), version: 1 }))
  assert.equal(listerBrouillonsProduits(stockage, 'b1')[0]?.values.nom, 'Ancien')
  assert.equal(stockage.getItem('katimarket:produit:brouillon:b1'), null)
})
