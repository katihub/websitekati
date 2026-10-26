import { expect, test } from '@playwright/test'
import os from 'node:os'
import path from 'node:path'

test('le carrousel principal reste compact et navigable', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page).toHaveTitle(/KatiMarket/i)
  await expect(page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/i)).toHaveCount(0)
  const hero = page.locator('section[aria-roledescription="carrousel"]').first()
  await expect(hero).toBeVisible()
  const dimensions = await hero.boundingBox()
  expect(dimensions).not.toBeNull()
  expect(dimensions!.height).toBeLessThanOrEqual(testInfo.project.name === 'mobile' ? 351 : 360)

  const titre = hero.getByRole('heading', { level: 1 })
  const avant = await titre.innerText()
  await hero.getByRole('button', { name: /suivante/i }).click()
  await expect(titre).not.toHaveText(avant)
  await page.screenshot({ path: path.join(os.tmpdir(), `katimarket-hero-compact-${testInfo.project.name}.png`) })
  expect(errors).toEqual([])
})

test('six campagnes sur deux lignes de trois défilent automatiquement sur la page d’accueil', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/KatiMarket/i)
  const logoEntete = page.getByRole('banner').getByRole('link', { name: 'KatiMarket, accueil' })
  await expect(logoEntete.locator('img')).toHaveAttribute('src', /katimarket-mark\.png/)
  const logoPiedPage = page.getByRole('contentinfo').getByRole('link', { name: 'KatiMarket, accueil' })
  await expect(logoPiedPage.locator('img')).toHaveAttribute('src', /katimarket-logo\.webp/)
  const manifeste = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifeste.short_name).toBe('KatiMarket')
  expect(manifeste.icons.map((icone: { src: string }) => icone.src)).toContain('/brand/katimarket-512-maskable.png')
  const favicons = await page.locator('link[rel="icon"]').evaluateAll((liens) => liens.map((lien) => lien.getAttribute('href')))
  expect(favicons.some((href) => href?.includes('favicon.ico'))).toBe(true)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-icon\.png/)
  const rail = page.getByTestId('promos-accueil')
  await expect(rail).toBeVisible()
  const piste = page.getByTestId('promos-track')
  const pages = rail.getByTestId('promo-page')
  await expect(pages).toHaveCount(4)
  const premieresCartes = pages.first().locator('a')
  await expect(premieresCartes).toHaveCount(6)
  await expect(pages.nth(1).locator('a')).toHaveCount(6)
  const imagesParVue = await pages.evaluateAll((vues) => vues.map((vue) =>
    [...vue.querySelectorAll('img')].map((image) => {
      const source = new URL((image as HTMLImageElement).src)
      return source.searchParams.get('url') ?? source.pathname
    }),
  ))
  expect(imagesParVue.every((images) => new Set(images).size === images.length)).toBe(true)
  const largeur = await piste.evaluate((element) => element.clientWidth)
  const cartes = await premieresCartes.evaluateAll((elements) => elements.map((element) => {
    const { x, y, width } = element.getBoundingClientRect()
    return { x, y, width }
  }))
  const lignes = [...new Set(cartes.map((carte) => Math.round(carte.y)))]
  expect(lignes).toHaveLength(2)
  expect(lignes.map((y) => cartes.filter((carte) => Math.round(carte.y) === y))).toEqual([
    expect.arrayContaining([expect.any(Object), expect.any(Object), expect.any(Object)]),
    expect.arrayContaining([expect.any(Object), expect.any(Object), expect.any(Object)]),
  ])
  expect(cartes.every((carte) => carte.width > largeur * 0.3 && carte.width < largeur * 0.35)).toBe(true)
  await expect(page.getByRole('heading', { level: 1, name: /Tout ce dont vous avez besoin/i })).toBeVisible()
  const categories = page.getByRole('complementary', { name: 'Catégories de produits' })
  if (testInfo.project.name === 'mobile') {
    await expect(categories).toBeHidden()
  } else {
    await expect(categories).toBeVisible()
    await expect(categories.getByRole('heading', { name: 'Toutes les catégories' })).toBeVisible()
  }
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

  if (testInfo.project.name !== 'mobile') {
    await categories.getByRole('link', { name: /Électronique/i }).click()
    await expect(page).toHaveURL(/(?:categories\/|recherche\?q=)/)
  }
})

test('la publicité latérale et les engagements restent cachés sur mobile', async ({ page }) => {
  const colonne = page.getByRole('complementary', { name: /publicité et engagements/i })
  const categories = page.getByRole('complementary', { name: 'Catégories de produits' })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(colonne).toBeHidden()
  await expect(categories).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.screenshot({ path: path.join(os.tmpdir(), 'katimarket-mobile-promo-rail-hidden.png') })

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(colonne).toBeVisible()
  await expect(categories).toBeVisible()
  await expect(colonne.getByText('Vendez sur KatiMarket')).toBeVisible()
  await expect(colonne.getByText('Livraison rapide')).toBeVisible()
  await page.screenshot({ path: path.join(os.tmpdir(), 'katimarket-desktop-promo-rail-visible.png') })
})
