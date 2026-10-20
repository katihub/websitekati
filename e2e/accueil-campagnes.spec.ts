import { expect, test } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'

test('quatre campagnes visibles sur une ligne défilent automatiquement sur la page d’accueil', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/KatiMarket/i)
  const rail = page.getByTestId('promos-accueil')
  await expect(rail).toBeVisible()
  const piste = page.getByTestId('promos-track')
  const pages = rail.getByTestId('promo-page')
  await expect(pages).toHaveCount(2)
  const premieresCartes = pages.first().locator('a')
  await expect(premieresCartes).toHaveCount(4)
  const largeur = await piste.evaluate((element) => element.clientWidth)
  const cartes = await premieresCartes.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width } = element.getBoundingClientRect()
    return { x, y, width }
  }))
  expect(Math.max(...cartes.map((carte) => carte.y)) - Math.min(...cartes.map((carte) => carte.y))).toBeLessThan(1)
  expect(cartes.every((carte) => carte.width > largeur * 0.2 && carte.width < largeur * 0.3)).toBe(true)
  await expect(page.getByRole('heading', { level: 1, name: /Tout ce dont vous avez besoin/i })).toBeVisible()
  await page.screenshot({ path: path.join(os.tmpdir(), `katihub-campaigns-${testInfo.project.name}.png`) })

  const before = await piste.evaluate((element) => element.scrollLeft)
  await expect.poll(() => piste.evaluate((element) => element.scrollLeft), { timeout: 7000 }).toBeGreaterThan(before)

  const apresDefilement = await piste.evaluate((element) => element.scrollLeft)
  const boutonSuivant = page.getByRole('button', { name: /Promotions suivantes/i })
  if (await boutonSuivant.isVisible()) {
    await boutonSuivant.click()
    await expect.poll(() => piste.evaluate((element) => element.scrollLeft)).not.toBe(apresDefilement)
  }
  expect(errors).toEqual([])
})
