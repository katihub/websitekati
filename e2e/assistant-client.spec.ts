import { expect, test } from '@playwright/test'

test('un client ouvre le chat, envoie sa question et reçoit la réponse', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', (erreur) => erreurs.push(erreur.message))
  page.on('console', (message) => {
    if (message.type() === 'error') erreurs.push(message.text())
  })

  await page.route('**/api/assistant/menu', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: 'qa', racine: 'accueil', noeuds: [] }),
  }))

  let questionRecue = ''
  await page.route('**/api/assistant', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const corps = route.request().postDataJSON() as { question?: string }
    questionRecue = corps.question ?? ''
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        fil: 'abcdefghijklmnop',
        texte: 'Oui, voici les imprimantes laser disponibles.',
        pieces: {},
        suites: ['Voir les imprimantes'],
      }),
    })
  })

  await page.goto('/')
  await page.locator('[data-assistant-launcher]').click()
  await expect(page.getByRole('dialog', { name: /assistante KatiMarket/i })).toBeVisible()

  const champ = page.getByLabel(/Écrivez votre question/i)
  await champ.fill('Je cherche une imprimante laser')
  await page.getByRole('button', { name: 'Envoyer la question' }).click()

  const fil = page.locator('[data-bod-thread]')
  await expect(fil.getByText('Je cherche une imprimante laser', { exact: true })).toBeVisible()
  await expect(fil.getByText('Oui, voici les imprimantes laser disponibles.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Voir les imprimantes' })).toBeVisible()
  await expect(champ).toBeEnabled()
  expect(questionRecue).toBe('Je cherche une imprimante laser')
  expect(erreurs).toEqual([])
})

test('une panne du service rend une réponse utile et permet de réessayer', async ({ page }) => {
  await page.route('**/api/assistant/menu', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ version: null, racine: 'accueil', noeuds: [] }),
  }))
  await page.route('**/api/assistant', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      fil: '',
      texte: 'Je n’arrive pas à joindre les services KatiMarket à l’instant.',
      pieces: { humain: true },
      suites: ['Réessayer'],
    }),
  }))

  await page.goto('/')
  await page.locator('[data-assistant-launcher]').click()
  const champ = page.getByLabel(/Écrivez votre question/i)
  await champ.fill('Avez-vous des ordinateurs ?')
  await page.getByRole('button', { name: 'Envoyer la question' }).click()

  await expect(page.locator('[data-bod-thread]').getByText(/Je n’arrive pas à joindre/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  await champ.fill('Nouvelle tentative')
  await expect(page.getByRole('button', { name: 'Envoyer la question' })).toBeEnabled()
})
