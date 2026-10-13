import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { litigeBoutique, mission } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('le vendeur retrouve le litige ouvert par le client dans son espace', async ({ page }) => {
  api = await espaceVendeur(page, [litigeBoutique()])

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Litiges et retours' }).click()

  await expect(page.getByRole('heading', { name: 'Litiges et retours' })).toBeVisible()
  await expect(page.getByText('Écran fissuré à la réception').first()).toBeVisible()
  await expect(page.getByText('DC-20261013-E2E').first()).toBeVisible()
})

test('le livreur voit sa mission et le montant à encaisser', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/expeditions\/miennes$/, [mission()])

  await page.goto('/espace-livreur')

  await expect(page.getByRole('heading', { name: 'Mes missions' })).toBeVisible()
  await expect(page.getByText('CM-E2E-E1').first()).toBeVisible()
  await expect(page.getByText(/160[\s  ]000/).first()).toBeVisible()
  await expect(page.getByLabel('Code à 6 chiffres')).toBeVisible()
})
