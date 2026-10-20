import { expect, test } from '@playwright/test'

test('le choix de langue traduit le cadre marketplace et conserve la préférence', async ({ page }) => {
  await page.goto('/')

  const selector = page.getByTestId('language-switcher')
  await expect(selector).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('link', { name: 'Vendre sur KatiMarket' })).toBeVisible()

  await selector.getByRole('button', { name: 'EN' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('link', { name: 'Sell on KatiMarket' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Everything you need.*all in one place/s })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Shop on KatiMarket' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('katimarket.locale.v1'))).toBe('en')

  await page.reload()
  await expect(page.getByTestId('language-switcher').getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: /Everything you need.*all in one place/s })).toBeVisible()

  await selector.getByRole('button', { name: 'FR' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('link', { name: 'Vendre sur KatiMarket' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('katimarket.locale.v1'))).toBe('fr')
})

test('la langue choisie traduit aussi les formulaires client', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByTestId('language-switcher').getByRole('button', { name: 'EN' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back to KatiMarket' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  await page.goto('/inscription')
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create my account' })).toBeVisible()
})
