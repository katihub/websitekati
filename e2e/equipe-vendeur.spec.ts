import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { espaceVendeur } from './support/espace-vendeur'
import { IDS } from './support/donnees'

const membreId = '00000000-0000-4000-8000-0000000000e1'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('le proprietaire cree un membre avec son mot de passe puis peut le remplacer', async ({ page }) => {
  api = await espaceVendeur(page, [])
  const membres: Array<Record<string, unknown>> = [{
    id: '00000000-0000-4000-8000-0000000000e0',
    nom: 'Billy Ndassi',
    courriel: 'billy@boutique.cm',
    roles: ['proprietaire'],
    actif: true,
    premiereConnexionLe: '2026-10-20T10:00:00.000Z',
  }]
  api
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${IDS.boutique}/membres$`), () => membres)
    .quand('POST', new RegExp(`^/vendeurs/mes-boutiques/${IDS.boutique}/membres$`), () => {
      membres.push({
        id: membreId,
        nom: 'Marie Nguema',
        courriel: 'marie@exemple.cm',
        roles: ['magasinier'],
        actif: true,
        premiereConnexionLe: null,
      })
      return { id: membreId, courrielEnvoye: false, motDePasseDefini: true }
    })
    .quand('PUT', new RegExp(`^/vendeurs/mes-boutiques/${IDS.boutique}/membres/${membreId}/mot-de-passe$`), {
      motDePasseModifie: true,
    })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Équipe', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ajouter une personne' })).toBeVisible()

  await page.getByLabel('Nom complet').fill('Marie Nguema')
  await page.getByLabel('Adresse e-mail').fill('marie@exemple.cm')
  await page.getByLabel(/Mot de passe Facultatif/).fill('MotDePasse-2026')
  await page.getByLabel('Confirmer le mot de passe').fill('MotDePasse-2026')
  await page.getByRole('button', { name: 'Créer le compte' }).click()

  await expect(page.getByRole('status')).toContainText('peut se connecter immédiatement')
  await expect.poll(() => api.appelsVers('POST', /\/membres$/)).toHaveLength(1)
  expect(api.appelsVers('POST', /\/membres$/)[0]?.corps).toEqual({
    nom: 'Marie Nguema',
    courriel: 'marie@exemple.cm',
    role: 'magasinier',
    motDePasse: 'MotDePasse-2026',
  })

  const ligne = page.getByRole('listitem').filter({ hasText: 'marie@exemple.cm' })
  await ligne.getByRole('button', { name: 'Mot de passe' }).click()
  await ligne.getByLabel('Nouveau mot de passe').fill('NouveauMot-2026')
  await ligne.getByLabel('Confirmer').fill('NouveauMot-2026')
  await ligne.getByRole('button', { name: 'Enregistrer le mot de passe' }).click()

  await expect(ligne).toContainText('Mot de passe modifié')
  expect(api.appelsVers('PUT', /\/mot-de-passe$/)[0]?.corps).toEqual({ motDePasse: 'NouveauMot-2026' })
  expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000)
})
