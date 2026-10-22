import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LE CONTRAT VENDEUR A CHANGE : la boutique le voit dans son espace, le lit et
 * confirme en avoir pris connaissance. Rien n'est bloque en attendant.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('un changement important du contrat s’affiche jusqu’à ce que la boutique confirme l’avoir lu', async ({ page }) => {
  const version = { numero: 4, publieLe: '2026-10-22T10:00:00.000Z', resume: 'Commission revue à 8 %' }
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/contenus/boutiques/${IDS.boutique}/contrat-vendeur$`), { aLire: true, version })
    .quand('POST', new RegExp(`^/contenus/boutiques/${IDS.boutique}/contrat-vendeur/lu$`), { aLire: false, version })
  await page.goto('/espace-vendeur')
  const bandeau = page.getByTestId('bandeau-contrat')
  await expect(bandeau).toContainText('Le contrat vendeur a changé')
  await expect(bandeau).toContainText('Commission revue à 8 %')
  await expect(bandeau.getByRole('link', { name: 'Lire le contrat' })).toHaveAttribute('href', '/contrat-vendeurs')
  await bandeau.getByTestId('contrat-lu').click()
  await expect(bandeau).toHaveCount(0)
  expect(api.appelsVers('POST', /contrat-vendeur\/lu$/)).toHaveLength(1)
})
