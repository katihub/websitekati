import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * CE QUE LA FICHE PRODUIT PROMET : un favori qui reste, et les vrais avis.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const FAVORI = {
  offreId: '00000000-0000-4000-8000-0000000000f1', slug: 'galaxy-a15', nom: 'Samsung Galaxy A15', prixFcfa: 149_000, image: null,
  boutiqueId: 'b1', boutiqueNom: 'TechMall', boutiqueSlug: 'techmall', quantite: 1,
}

test('la page des favoris liste ce qui a été gardé, et le retrait est immédiat', async ({ page }) => {
  api = await simulerApi(page)
  await page.addInitScript((favori) => localStorage.setItem('katihub.favoris.v1', JSON.stringify([favori])), FAVORI)
  await page.goto('/compte/favoris')

  const liste = page.getByTestId('mes-favoris')
  await expect(liste.getByRole('link', { name: /Samsung Galaxy A15/ })).toHaveAttribute('href', '/marketplace/produits/galaxy-a15?boutique=techmall')
  await expect(page.getByText('Ces favoris sont gardés dans ce navigateur.')).toBeVisible()
  await liste.getByRole('button', { name: 'Retirer' }).click()
  await expect(page.getByText('Vous n’avez pas encore de favori.')).toBeVisible()
})

test('sur la fiche, le favori survit au rechargement et l’onglet avis montre les avis publiés', async ({ page, request }) => {
  // La fiche est rendue cote serveur depuis le backend : sans backend local, rien a verifier ici.
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  const accueil = await request.get(`${backend}/v1/marketplace/offres`).then((r) => (r.ok() ? r.json() : null)).catch(() => null) as { offres?: Array<{ produit: { slug: string } }> } | null
  const slug = accueil?.offres?.[0]?.produit.slug
  test.skip(!slug, 'backend local injoignable')

  api = (await simulerApi(page)).quand('GET', new RegExp(`^/marketplace/reputation/produits/${slug}/avis`), {
    total: 1, moyenne: 5, repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 }, page: 1, taille: 5,
    avis: [{ id: 'a1', note: 5, commentaire: 'Conforme à la description, très bon produit.', creeLe: '2026-10-12T10:00:00Z', achatVerifie: true, auteur: 'Awa M.', ville: 'Douala', reponse: null }],
  })
  await page.goto(`/marketplace/produits/${slug}`)
  const coeur = page.getByRole('button', { name: 'Ajouter aux favoris' })
  await coeur.click()
  await expect(page.getByRole('button', { name: 'Retirer des favoris' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Retirer des favoris' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('tab', { name: 'Avis clients' }).click()
  await expect(page.getByText('Conforme à la description, très bon produit.')).toBeVisible()
  await expect(page.getByText('Awa M.')).toBeVisible()
})
