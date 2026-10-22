import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LES PAGES LEGALES REDIGEES DEPUIS LE PANEL. Le serveur Next lit le texte
 * publie quand le backend repond, et garde celui de son code sinon : la page
 * s'affiche dans les deux cas. Un visiteur anglophone sans traduction publiee
 * lit le francais avec la mention que l'anglais arrive.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('la page legale affiche son texte et sa version, ou le texte du site en secours', async ({ page }) => {
  api = await simulerApi(page)
  await page.goto('/conditions-generales-vente')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Conditions générales de vente')
  await expect(page.getByTestId('version-page-legale')).toContainText(/Version de travail|Version \d+, en vigueur depuis le/)
  await expect(page.getByTestId('anglais-a-venir')).toHaveCount(0)
})

test('en anglais, sans traduction publiee, le francais s’affiche avec la mention', async ({ page }) => {
  api = await simulerApi(page)
  await page.goto('/mentions-legales')
  await page.getByTestId('language-switcher').getByRole('button', { name: 'EN' }).first().click()
  await expect(page.getByTestId('anglais-a-venir')).toContainText('English version coming soon')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mentions légales')
  await expect(page.getByRole('navigation', { name: 'Pages d’information' })).toContainText('Privacy policy')
})
