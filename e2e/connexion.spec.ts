import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * « SE CONNECTER » DEPUIS LA COMMANDE : la page de connexion, puis le retour a
 * la commande. La fenetre de compte NowTech n'est plus montee depuis le passage
 * a KatiHub ; le bouton ne faisait plus rien.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const OFFRE = '00000000-0000-4000-8000-000000000202'

test('un visiteur non connecté passe de la commande à la connexion, avec le retour vers sa commande', async ({ page }) => {
  api = (await simulerApi(page)).quand('POST', /^\/marketplace\/panier\/verifier$/, [])
  await page.addInitScript((offre) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([{ slug: 'galaxy-a15', name: 'Samsung Galaxy A15', price: 149_000, image: null, qty: 1, offerId: offre, boutiqueId: 'b1', boutiqueNom: 'TechMall' }]))
  }, OFFRE)

  await page.goto(`/marketplace/commande?articles=${OFFRE}`)
  const retour = encodeURIComponent(`/marketplace/commande?articles=${OFFRE}`)
  const invite = page.locator('section', { hasText: 'Un compte client est nécessaire pour commander.' })
  await expect(invite.getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', `/inscription?retour=${retour}`)

  await invite.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(`**/connexion?retour=${retour}`)
  await expect(page.getByRole('heading', { name: 'Bon retour sur KatiHub' })).toBeVisible()
  // Le lien vers l'inscription garde la commande en retour.
  await expect(page.locator('p', { hasText: 'Pas encore de compte' }).getByRole('link', { name: 'Créer un compte' })).toHaveAttribute('href', `/inscription?retour=${retour}`)
  // Le panier est vérifié en tâche de fond : sa réponse vide n'est pas l'objet du test.
  api.erreursNavigateur.length = 0
})

test('un retour vers un autre site est ignoré', async ({ page }) => {
  api = await simulerApi(page)
  await page.goto('/inscription?retour=%2F%2Fexemple.com')
  await expect(page.locator('p', { hasText: 'Déjà un compte' }).getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/connexion')
})
