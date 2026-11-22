import assert from 'node:assert/strict'
import test from 'node:test'

import { erreurVariantes, LIGNE_VIDE, photosPourVariante, problemesVariantes, variantesPourApi } from '../src/lib/variantes-produit.ts'

const ligne = (champs) => ({ ...LIGNE_VIDE, ...champs })

test('la reference est facultative : une ligne sans reference est valide', () => {
  assert.equal(erreurVariantes([ligne({ prix: '5000', quantite: '0' })]), '')
})

test('une reference vide n est pas envoyee, KatiMarket la compose', () => {
  const [sans, avec] = variantesPourApi([ligne({ libelle: 'T18', prix: '5000', quantite: '0' }), ligne({ libelle: 'T20', reference: ' HK-20 ', prix: '6000', quantite: '2' })])
  assert.equal('referenceVendeur' in sans, false)
  assert.equal(avec.referenceVendeur, 'HK-20')
})

test('deux references vides ne sont pas un doublon, deux references saisies identiques oui', () => {
  assert.deepEqual(problemesVariantes([ligne({ libelle: 'A', prix: '1', quantite: '0' }), ligne({ libelle: 'B', prix: '1', quantite: '0' })]), [null, null])
  const problemes = problemesVariantes([ligne({ libelle: 'A', reference: 'x', prix: '1', quantite: '0' }), ligne({ libelle: 'B', reference: 'X', prix: '1', quantite: '0' })])
  assert.equal(problemes[1]?.champ, 'reference')
})

test('une quantite initiale vide reste facultative et laisse le statut decider', () => {
  assert.equal(erreurVariantes([ligne({ prix: '5000' })], true), '')
  assert.equal('quantiteInitiale' in variantesPourApi([ligne({ prix: '5000' })], true)[0], false)
  assert.equal(erreurVariantes([ligne({ prix: '5000', quantite: '0' })], true), '')
  assert.equal(erreurVariantes([ligne({ prix: '5000', quantite: '12' })], true), '')
})

test('une quantite renseignee est envoyee, y compris pour un produit sur devis', () => {
  const saisie = ligne({ prix: '5000', quantite: '12', devisUniquement: true })
  assert.equal(variantesPourApi([saisie])[0].quantiteInitiale, 12)
  assert.equal(variantesPourApi([saisie])[0].devisUniquement, true)
})

test('le message dit quelle variante et quel champ sont en cause', () => {
  const lignes = [ligne({ libelle: 'A', prix: '1', quantite: '0' }), ligne({ libelle: 'B', prix: 'abc', quantite: '0' })]
  assert.equal(problemesVariantes(lignes)[1]?.champ, 'prix')
  assert.match(erreurVariantes(lignes), /^Variante 2 : Indiquez un prix valide/)
})

test('un prix barre doit depasser le prix de vente', () => {
  assert.equal(problemesVariantes([ligne({ prix: '5000', prixBarre: '4000', quantite: '0' })])[0]?.champ, 'prixBarre')
})

test('les axes de categorie produisent des attributs structures et un libelle stable', () => {
  const axes = ['Capacité', 'Couleur']
  const saisie = ligne({ attributs: { Capacité: ' 128 Go ', Couleur: ' Noir ' }, prix: '149000', quantite: '2' })
  const [api] = variantesPourApi([saisie, ligne({ attributs: { Capacité: '256 Go', Couleur: 'Bleu' }, prix: '169000', quantite: '1' })], true, axes)
  assert.equal(api.libelleVariante, '128 Go / Noir')
  assert.deepEqual(api.attributsVariante, { Capacité: '128 Go', Couleur: 'Noir' })
})

test('deux variantes structurees identiques sont refusees', () => {
  const axes = ['Couleur']
  const lignes = [ligne({ attributs: { Couleur: 'Noir' }, prix: '1' }), ligne({ attributs: { Couleur: ' noir ' }, prix: '2' })]
  assert.match(erreurVariantes(lignes, true, axes), /même combinaison/)
})

test('les photos de la variante deviennent principales sans dupliquer la galerie commune', () => {
  const commune = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(photosPourVariante(commune, [{ id: 'c' }, { id: 'b' }]).map((image) => image.id), ['c', 'b', 'a'])
  assert.deepEqual(photosPourVariante(commune, []).map((image) => image.id), ['a', 'b', 'c'])
})
