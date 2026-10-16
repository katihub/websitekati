import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LA VILLE A L'INSCRIPTION, ET LES AVIS SUR LA PAGE D'UNE BOUTIQUE.
 */

let api: ApiSimulee | undefined

test.beforeEach(() => { api = undefined })
test.afterEach(() => {
  if (!api) return
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('la ville est demandée à l’inscription, avec des suggestions', async ({ page }) => {
  // La vitrine de test n'a pas de Supabase : on verifie la saisie, pas la creation du compte,
  // que la recette backend (`pnpm recette:avis`) couvre avec l'enregistrement de la ville.
  api = await simulerApi(page)

  await page.goto('/inscription')
  await page.getByLabel('Nom complet').fill('Awa Mbarga')
  await page.getByLabel('Adresse e-mail').fill('awa@exemple.cm')
  await page.getByLabel('Téléphone mobile').fill('699000001')
  await page.locator('input[name=password]').fill('Motdepasse1')
  await page.getByRole('checkbox').check()

  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByText('Indiquez votre ville.')).toBeVisible()

  const ville = page.getByLabel('Ville')
  await expect(ville).toHaveAttribute('list', 'villes-inscription')
  await expect(page.locator('#villes-inscription option[value="Douala"]')).toHaveCount(1)
  await ville.fill('Bafoussam')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByText('Indiquez votre ville.')).toBeHidden()
})

test('la page d’une boutique montre les avis de ses clients et invite à se connecter pour en donner un', async ({ page, request }) => {
  // La page est rendue cote serveur depuis le backend : sans backend local, rien a verifier ici.
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  const joignable = await request.get(`${backend}/v1/marketplace/boutiques/home-deco`).then((r) => r.ok()).catch(() => false)
  test.skip(!joignable, 'backend local injoignable')

  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/reputation\/boutiques\/home-deco\/avis/, {
    total: 2, moyenne: 4.5, repartition: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }, page: 1, taille: 5,
    avis: [
      { id: 'a1', note: 5, commentaire: 'Livraison rapide et produit conforme.', creeLe: '2026-10-12T10:00:00Z', achatVerifie: true, auteur: 'Marie N.', ville: 'Douala', reponse: { contenu: 'Merci Marie !', creeLe: '2026-10-12T12:00:00Z' } },
      { id: 'a2', note: 4, commentaire: null, creeLe: '2026-10-10T10:00:00Z', achatVerifie: true, auteur: 'Paul E.', ville: null, reponse: null },
    ],
  })

  await page.goto('/boutiques/home-deco')
  const section = page.getByRole('region', { name: 'Avis des clients' })
  await expect(section).toBeVisible()
  await expect(section.getByText('2 avis vérifiés')).toBeVisible()
  await expect(section.getByTestId('avis-boutique')).toHaveCount(2)
  await expect(section.getByText('Marie N.')).toBeVisible()
  await expect(section.getByText('Réponse de la boutique')).toBeVisible()
  await expect(section.getByRole('link', { name: 'Se connecter pour donner un avis' })).toHaveAttribute('href', '/connexion?retour=%2Fboutiques%2Fhome-deco%23avis')
})
