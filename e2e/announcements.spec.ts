import { expect, test } from '@playwright/test'

test.describe('barre d’annonces', () => {
  test('affiche plusieurs messages, préserve les liens fixes et permet pause/reprise', async ({ page }) => {
    await page.goto('/')
    const rail = page.locator('[data-marketplace-announcements]')
    await expect(rail).toBeVisible()
    await expect(rail).toContainText('Livraison rapide partout au Cameroun')
    await expect(rail).toContainText('Paiement sécurisé')
    await expect(page.locator('[data-marketplace-topbar]')).toContainText('En toute confiance !')
    await expect(page.locator('[data-marketplace-topbar] a')).toHaveCount(2)

    const pause = rail.getByRole('button', { name: /mettre en pause/i })
    await pause.click()
    await expect(rail).toHaveAttribute('data-paused', 'true')
    await rail.getByRole('button', { name: /reprendre/i }).click()
    await expect(rail).toHaveAttribute('data-paused', 'false')
  })

  test('reste dans la barre sur petit écran et désactive le mouvement réduit', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const rail = page.locator('[data-marketplace-announcements]')
    await expect(rail).toBeVisible()
    await expect(rail.locator('button')).toBeVisible()
    await expect(page.locator('[data-marketplace-topbar]')).toHaveJSProperty('scrollWidth', await page.locator('[data-marketplace-topbar]').evaluate(el => el.clientWidth))
    await expect(rail.locator('div').nth(1)).toHaveCSS('animation-name', 'none')
  })
})
