import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { demandeClient, IDS } from './support/donnees'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})
test('le client ouvre un ticket en choisissant le motif, la commande et la boutique', async ({ page }) => {
  let tickets: unknown[] = []
  const contextes = [{
    id: IDS.commande,
    reference: 'CM-E2E',
    statut: 'livree',
    creeLe: '2026-10-13T09:00:00.000Z',
    sousCommandes: [{
      id: IDS.sousCommande,
      reference: 'CM-E2E-1',
      boutique: { id: IDS.boutique, nom: 'Maison Kati', slug: 'maison-kati' },
      lignes: [{ id: IDS.ligne, offreTitreCapture: 'Téléphone recette' }],
    }],
  }]
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/demandes-client\/contextes$/, contextes)
    .quand('GET', /^\/marketplace\/demandes-client$/, () => tickets)
    .quand('POST', /^\/marketplace\/demandes-client$/, () => {
      const cree = demandeClient({
        categorie: 'comportement_vendeur',
        objet: 'Le vendeur ne répond plus',
        description: 'Le vendeur ne répond plus depuis trois jours.',
        creeLe: '2026-10-13T09:00:00.000Z',
        commande: { reference: 'CM-E2E' },
        sousCommande: { reference: 'CM-E2E-1' },
        boutique: { nom: 'Maison Kati', slug: 'maison-kati' },
      })
      tickets = [cree]
      return { status: 201, body: cree }
    })

  await page.goto('/compte/assistance')
  await page.getByRole('button', { name: 'Ouvrir un ticket' }).click()
  const formulaire = page.getByRole('form', { name: 'Ouvrir un ticket client' })
  const listes = formulaire.locator('select')
  await listes.nth(0).selectOption('comportement_vendeur')
  await listes.nth(1).selectOption(IDS.commande)
  await listes.nth(2).selectOption(IDS.sousCommande)
  await formulaire.getByLabel('Objet', { exact: true }).fill('Le vendeur ne répond plus')
  await formulaire.getByLabel('Décrivez le problème', { exact: true }).fill('Le vendeur ne répond plus depuis trois jours.')
  await formulaire.getByRole('button', { name: 'Envoyer ma demande' }).click()

  await expect(page.getByRole('status')).toContainText('Ticket DC-20261013-E2E ouvert')
  await expect(page.getByText('Le vendeur ne répond plus', { exact: true })).toBeVisible()
  expect(api.appelsVers('POST', /^\/marketplace\/demandes-client$/)[0]?.corps).toEqual({
    commandeId: IDS.commande,
    sousCommandeId: IDS.sousCommande,
    categorie: 'comportement_vendeur',
    objet: 'Le vendeur ne répond plus',
    description: 'Le vendeur ne répond plus depuis trois jours.',
  })
})

