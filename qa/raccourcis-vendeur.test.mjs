import assert from 'node:assert/strict'
import test from 'node:test'

import { ANCRE_VISUELS, raccourcisVendeur } from '../src/lib/raccourcis-vendeur.ts'

const parId = (liste) => Object.fromEntries(liste.map((carte) => [carte.id, carte]))

test('lists the four seller shortcuts in order, with their destinations', () => {
  const cartes = raccourcisVendeur({ roles: ['proprietaire'], documents: 'allowed', en: false })
  assert.deepEqual(cartes.map((carte) => [carte.titre, carte.action]), [
    ['Vérifier ma boutique', 'Compléter ma vérification'],
    ['Personnaliser ma boutique', 'Ajouter mon logo / bannière'],
    ['Contrat vendeur', 'Consulter le contrat'],
    ['Règlement de la plateforme', 'Consulter le règlement'],
  ])
  const { verification, visuels, contrat, reglement } = parId(cartes)
  assert.deepEqual(verification.cible, { panel: 'verification' })
  assert.deepEqual(visuels.cible, { panel: 'settings', ancre: ANCRE_VISUELS })
  assert.deepEqual(contrat.cible, { href: '/contrat-vendeurs' })
  assert.deepEqual(reglement.cible, { href: '/conditions-generales-vente' })
  assert.ok(cartes.every((carte) => carte.disponible))
})

test('a stock keeper cannot reach verification or shop settings, but can read the legal pages', () => {
  const { verification, visuels, contrat, reglement } = parId(
    raccourcisVendeur({ roles: ['magasinier'], documents: 'denied', en: false }),
  )
  assert.equal(verification.disponible, false)
  assert.equal(visuels.disponible, false)
  assert.equal(contrat.disponible, true)
  assert.equal(reglement.disponible, true)
})

test('verification waits until the documents are readable', () => {
  const { verification } = parId(raccourcisVendeur({ roles: ['gestionnaire'], documents: 'error', en: false }))
  assert.equal(verification.disponible, false)
})

test('the shortcuts are translated in English', () => {
  const { visuels } = parId(raccourcisVendeur({ roles: ['proprietaire'], documents: 'allowed', en: true }))
  assert.equal(visuels.titre, 'Customise my shop')
  assert.equal(visuels.action, 'Add my logo / banner')
})

test('an approved shop no longer gets the verification card', () => {
  const cartes = raccourcisVendeur({ roles: ['proprietaire'], documents: 'allowed', en: false, verifiee: true })
  assert.deepEqual(cartes.map((carte) => carte.id), ['visuels', 'contrat', 'reglement'])
})
