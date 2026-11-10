import assert from 'node:assert/strict'
import test from 'node:test'

import { doitChangerMotDePasse, pageChangementObligatoire } from '../src/lib/mot-de-passe-temporaire.ts'

test('a temporary password set by the team sends the person to choose their own', () => {
  assert.equal(doitChangerMotDePasse({ doit_changer_mot_de_passe: true }), true)
  assert.equal(doitChangerMotDePasse({ doit_changer_mot_de_passe: false }), false)
  assert.equal(doitChangerMotDePasse({ full_name: 'Awa' }), false)
  assert.equal(doitChangerMotDePasse(undefined), false)
  assert.equal(pageChangementObligatoire('client'), '/nouveau-mot-de-passe?obligatoire=1')
  assert.equal(pageChangementObligatoire('vendeur'), '/reinitialiser-mot-de-passe?obligatoire=1')
})
