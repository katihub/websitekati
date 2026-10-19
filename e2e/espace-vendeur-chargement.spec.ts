import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { espaceVendeur } from './support/espace-vendeur'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('affiche rapidement le tableau de bord et differe les rubriques secondaires', async ({ page }) => {
  api = await espaceVendeur(page, [])

  await page.goto('/espace-vendeur')
  await expect(page).toHaveTitle(/Espace vendeur/)
  expect(page.url()).toContain('/espace-vendeur')
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()
  await expect.poll(() => api.appelsVers('GET', /\/vendeurs\/mes-boutiques$/).length).toBe(1)

  expect(api.appelsVers('GET', /\/(paiements|avis|clients|membres)$/)).toHaveLength(0)
  expect(api.appelsVers('GET', /\/marketplace\/finance\/boutiques\//)).toHaveLength(0)
  expect(api.appelsVers('GET', /\/marketplace\/demandes-client\/boutiques\//)).toHaveLength(0)

  await page.getByRole('button', { name: 'Clients', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Clients', exact: true })).toBeVisible()
  await expect.poll(() => api.appelsVers('GET', /\/clients$/).length).toBe(1)
  expect(api.appelsVers('GET', /\/(paiements|avis|membres)$/)).toHaveLength(0)
  expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000)
})
