import assert from 'node:assert/strict'
import test from 'node:test'

import { erreurVariantes, LIGNE_VIDE, problemesVariantes, variantesPourApi } from '../src/lib/variantes-produit.ts'

const ligne = (champs) => ({ ...LIGNE_VIDE, ...champs })

test('la reference est facultative : une ligne sans reference est valide', () => {
  assert.equal(erreurVariantes([ligne({ prix: '5000' })]), '')
})

test('une reference vide n est pas envoyee, KatiMarket la compose', () => {
  const [sans, avec] = variantesPourApi([ligne({ libelle: 'T18', prix: '5000' }), ligne({ libelle: 'T20', reference: ' HK-20 ', prix: '6000' })])
  assert.equal('referenceVendeur' in sans, false)
  assert.equal(avec.referenceVendeur, 'HK-20')
})

test('deux references vides ne sont pas un doublon, deux references saisies identiques oui', () => {
  assert.deepEqual(problemesVariantes([ligne({ libelle: 'A', prix: '1' }), ligne({ libelle: 'B', prix: '1' })]), [null, null])
  const problemes = problemesVariantes([ligne({ libelle: 'A', reference: 'x', prix: '1' }), ligne({ libelle: 'B', reference: 'X', prix: '1' })])
  assert.equal(problemes[1]?.champ, 'reference')
})

test('le message dit quelle variante et quel champ sont en cause', () => {
  const lignes = [ligne({ libelle: 'A', prix: '1' }), ligne({ libelle: 'B', prix: 'abc' })]
  assert.equal(problemesVariantes(lignes)[1]?.champ, 'prix')
  assert.match(erreurVariantes(lignes), /^Variante 2 : Indiquez un prix valide/)
})

test('un prix barre doit depasser le prix de vente', () => {
  assert.equal(problemesVariantes([ligne({ prix: '5000', prixBarre: '4000' })])[0]?.champ, 'prixBarre')
})
