import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { commande, demandeClient, IDS } from './support/donnees'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('le client suit sa commande livrée, ligne par ligne', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
    .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [])

  await page.goto('/marketplace/commande/CM-E2E/suivi')

  await expect(page.getByRole('heading', { name: 'Commande CM-E2E' })).toBeVisible()
  await expect(page.getByText('Téléphone recette × 1')).toBeVisible()
  await expect(page.getByText('Aucun dossier ouvert sur cette commande.')).toBeVisible()
})

test('le client ouvre un litige sur une ligne livrée et le retrouve dans ses dossiers', async ({ page }) => {
  let dossiers: unknown[] = []
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
    .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, () => dossiers)
    .quand('POST', /^\/marketplace\/demandes-client$/, () => {
      dossiers = [demandeClient()]
      return { status: 201, body: { id: IDS.demande } }
    })

  await page.goto('/marketplace/commande/CM-E2E/suivi')
  await page.getByRole('button', { name: 'Signaler un problème' }).click()

  const fenetre = page.getByRole('dialog', { name: 'Ouvrir une demande' })
  await fenetre.getByLabel('Catégorie').selectOption('produit_endommage')
  await fenetre.getByLabel('Objet').fill('Écran fissuré à la réception')
  await fenetre.getByLabel('Description').fill('L’écran était fissuré dans le carton scellé.')
  await fenetre.getByRole('button', { name: 'Ouvrir la demande' }).click()

  await expect(fenetre).toBeHidden()
  await expect(page.getByText('Écran fissuré à la réception')).toBeVisible()
  expect(api.appelsVers('POST', /^\/marketplace\/demandes-client$/)[0]?.corps).toEqual({
    commandeId: IDS.commande,
    sousCommandeId: IDS.sousCommande,
    ligneId: IDS.ligne,
    expeditionId: IDS.expedition,
    categorie: 'produit_endommage',
    objet: 'Écran fissuré à la réception',
    description: 'L’écran était fissuré dans le carton scellé.',
  })
})

test('un refus du serveur reste visible et la fenêtre garde la saisie', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
    .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [])
    .quand('POST', /^\/marketplace\/demandes-client$/, { status: 409, body: { message: 'Un dossier est déjà ouvert sur cette ligne' } })

  await page.goto('/marketplace/commande/CM-E2E/suivi')
  await page.getByRole('button', { name: 'Signaler un problème' }).click()
  const fenetre = page.getByRole('dialog', { name: 'Ouvrir une demande' })
  await fenetre.getByLabel('Objet').fill('Écran fissuré à la réception')
  await fenetre.getByLabel('Description').fill('L’écran était fissuré dans le carton scellé.')
  await fenetre.getByRole('button', { name: 'Ouvrir la demande' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Un dossier est déjà ouvert sur cette ligne' })).toBeVisible()
  await expect(fenetre.getByLabel('Objet')).toHaveValue('Écran fissuré à la réception')
})
