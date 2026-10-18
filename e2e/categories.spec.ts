import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LA NAVIGATION PAR CATEGORIES : l'arbre tenu par KatiHub, du menu a la page
 * d'une sous-categorie. Pages rendues cote serveur : il faut le backend local.
 */

let api: ApiSimulee | undefined

test.beforeEach(() => { api = undefined })
test.afterEach(() => {
  if (!api) return
  expect(api.nonPrevues, 'appels non simules').toEqual([])
})

test('du menu à une sous-catégorie, avec le fil d’Ariane et la garantie', async ({ page, request }) => {
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  const arbre = await request.get(`${backend}/v1/marketplace/categories`).then((r) => (r.ok() ? r.json() : [])).catch(() => []) as Array<{ nom: string; slug: string; sousCategories: Array<{ nom: string; slug: string }> }>
  const racine = arbre.find((c) => c.sousCategories.length)
  test.skip(!racine, 'backend local injoignable ou arbre vide')

  api = await simulerApi(page)
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Catégories principales' })
  const lienToutes = navigation.getByRole('link').filter({ hasText: 'Toutes les catégories' })
  if (await lienToutes.isVisible()) {
    await lienToutes.click()
  } else {
    await navigation.getByRole('button', { name: 'Toutes les catégories', exact: true }).click()
    await page.getByRole('link', { name: 'Voir la page de toutes les catégories' }).click()
  }
  await page.waitForURL('**/categories')
  const carte = page.getByTestId('categories').getByRole('listitem').filter({ has: page.getByRole('heading', { name: racine!.nom }) })
  await expect(carte).toBeVisible()

  const sous = racine!.sousCategories[0]!
  await carte.getByRole('link', { name: sous.nom }).click()
  await page.waitForURL(`**/categories/${sous.slug}`)
  const fil = page.getByRole('navigation', { name: 'Fil d’Ariane' })
  await expect(fil.getByRole('link', { name: racine!.nom })).toHaveAttribute('href', `/categories/${racine!.slug}`)
  await expect(fil.getByText(sous.nom)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(sous.nom)
})
