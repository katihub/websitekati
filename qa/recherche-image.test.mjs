import assert from 'node:assert/strict'
import test from 'node:test'

import { candidatsRecherche, choisirRequete, couvre, lireAnalyse, texteSortie } from '../src/lib/recherche-image.ts'

const analyse = {
  label: 'Caméra IP Hikvision DS-2CD1043',
  produit: 'caméra de surveillance',
  marque: 'Hikvision',
  modele: 'DS-2CD1043',
  requetes: ['Hikvision DS-2CD1043', 'caméra IP Hikvision', 'caméra de surveillance'],
}

test('reads a model answer field by field and refuses an empty one', () => {
  assert.deepEqual(lireAnalyse({ ...analyse, requetes: [' Hikvision  DS-2CD1043 ', 'x', 42] }).requetes, ['Hikvision DS-2CD1043'])
  assert.equal(lireAnalyse({ label: '', produit: 'imprimante', marque: 'Canon', modele: '', requetes: [] }).label, 'imprimante Canon')
  assert.equal(lireAnalyse({ label: 'Rien', produit: '', marque: '', modele: '', requetes: [] }), null)
  assert.equal(lireAnalyse(null), null)
  assert.equal(lireAnalyse(['caméra']), null)
})

test('orders queries from the most precise to the broadest, without duplicates', () => {
  assert.deepEqual(candidatsRecherche(analyse), [
    'Hikvision DS-2CD1043',
    'caméra IP Hikvision',
    'caméra de surveillance',
    'caméra de surveillance Hikvision',
    'DS-2CD1043',
    'Hikvision',
  ])
  assert.deepEqual(candidatsRecherche({ label: 'Onduleur', produit: 'onduleur', marque: '', modele: '', requetes: [] }), ['onduleur'])
})

test('a query only counts as found when its best result holds every useful word', () => {
  assert.equal(couvre('caméra IP Hikvision', 'Camera IP HIKVISION DS-2CD2147 Sécurité'), true)
  assert.equal(couvre('caméra de surveillance', 'Caméra dôme surveillance 4 MP'), true)
  assert.equal(couvre('Hikvision DS-2CD9999', 'Détecteur de fumée Hikvision DS-PDSMK'), false)
  assert.equal(couvre('de la', 'tout'), false)
})

test('skips a precise query that only matches by the brand, sounding all at once', async () => {
  const demandes = []
  const sondages = {
    'Hikvision DS-2CD1043': { total: 229, apercu: 'Détecteur de fumée Hikvision DS-PDSMK' },
    'caméra IP Hikvision': { total: 140, apercu: 'Caméra IP Hikvision DS-2CD2147G3' },
    'caméra de surveillance': { total: 356, apercu: 'Caméra de surveillance WiFi' },
  }
  const choix = await choisirRequete(candidatsRecherche(analyse), async (requete) => {
    demandes.push(requete)
    return sondages[requete] ?? { total: 0, apercu: '' }
  })
  assert.deepEqual(choix, { requete: 'caméra IP Hikvision', total: 140 })
  assert.equal(demandes.length, 6)
})

test('falls back to any result, then to the most precise query, when nothing matches exactly', async () => {
  assert.deepEqual(
    await choisirRequete(['A1 X', 'B2 Y'], async (requete) => ({ total: requete === 'B2 Y' ? 4 : 0, apercu: 'autre chose' })),
    { requete: 'B2 Y', total: 4 },
  )
  assert.deepEqual(await choisirRequete(['A1', 'B2'], async () => ({ total: 0, apercu: '' })), { requete: 'A1', total: 0 })
  assert.deepEqual(
    await choisirRequete(['A1', 'B2'], async (requete) => { if (requete === 'A1') throw new Error('panne'); return { total: 3, apercu: 'B2' } }),
    { requete: 'B2', total: 3 },
  )
  assert.deepEqual(await choisirRequete([], async () => ({ total: 1, apercu: '' })), { requete: '', total: 0 })
})

test('reads the Responses API text whether aggregated or split', () => {
  assert.equal(texteSortie({ output_text: '{"a":1}' }), '{"a":1}')
  assert.equal(texteSortie({ output: [{ content: [{ type: 'output_text', text: '{"a"' }, { type: 'output_text', text: ':1}' }] }] }), '{"a":1}')
  assert.equal(texteSortie({}), '')
})
