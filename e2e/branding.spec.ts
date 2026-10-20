import { expect, test } from '@playwright/test'

test('les surfaces publiques affichent KatiMarket et conservent le panier historique', async ({ page }) => {
  const panierHistorique = JSON.stringify([
    { slug: 'article-compat', name: 'Article historique conservé', price: 1500, image: null, qty: 2 },
  ])
  await page.addInitScript(value => localStorage.setItem('nowtech.panier.v1', value), panierHistorique)

  await page.goto('/')

  await expect(page).toHaveTitle(/KatiMarket/)
  await expect(page.getByRole('link', { name: 'KatiMarket, accueil' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Panier, 2 articles/ })).toBeVisible()
  await expect(page.locator('[data-marketplace-nav]')).toContainText('Vendre sur KatiMarket')

  const footer = page.locator('[data-marketplace-footer]')
  await footer.scrollIntoViewIfNeeded()
  await expect(footer).toContainText('Acheter sur KatiMarket')
  await expect(footer).toContainText('Vendre sur KatiMarket')
  await expect(page.evaluate(() => localStorage.getItem('nowtech.panier.v1'))).resolves.toBe(panierHistorique)
})
