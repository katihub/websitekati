import { expect, test } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'

test('les campagnes défilent sur la page d’accueil', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/KatiHub/i)
  const rail = page.getByTestId('campaign-rail')
  await expect(rail).toBeVisible()
  expect(await rail.getByRole('link').count()).toBeGreaterThanOrEqual(5)
  await expect(page.getByRole('heading', { level: 1, name: /Tout ce dont vous avez besoin/i })).toBeVisible()
  await page.screenshot({ path: path.join(os.tmpdir(), `katihub-campaigns-${testInfo.project.name}.png`) })

  const before = await rail.evaluate((element) => element.scrollLeft)
  if (testInfo.project.name === 'bureau') {
    await page.getByRole('button', { name: 'Voir les campagnes suivantes' }).click()
  } else {
    await rail.evaluate((element) => element.scrollBy({ left: element.clientWidth * .8, behavior: 'instant' }))
  }
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before)
  expect(errors).toEqual([])
})
