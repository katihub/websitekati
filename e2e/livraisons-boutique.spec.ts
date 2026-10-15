import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LES OPERATIONS DE LIVRAISON DE LA BOUTIQUE : ses agents, puis chaque colis
 * qu'elle gere — affectation, prise en charge prouvee par une photo, mise au
 * comptoir, code de retrait et remise ; depot en agence par le bordereau.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B = IDS.boutique
const AGENT = { id: 'ag1', nom: 'Paul Comptoir', telephone: '+237 677 00 00 01', actif: true, verifieLe: '2026-10-15T08:00:00.000Z', plafondEspecesFcfa: 200_000 }
const PHOTO = { name: 'colis.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]) }

const livraison = (surcharge: Record<string, unknown>) => ({
  id: 'e1', reference: 'CM-RET-E1', statut: 'planifiee', modeLivraison: 'retrait', ville: 'Douala', creeLe: '2026-10-15T08:00:00.000Z',
  geree: true, adresse: { mode: 'retrait', ville: 'Douala', adresseRetrait: 'Akwa, rue Joss' }, telephoneClient: '+237 699 00 00 02',
  montantACollecterFcfa: 45_000, fraisLivraisonFcfa: 0, fraisPrepayes: false, agentCourant: null, codeActifJusquau: null,
  sousCommande: { reference: 'CM-RET-1', noteAgence: null, lignes: [{ produitNomCapture: 'Téléphone', quantite: 1, quantiteRefusee: 0 }] },
  ...surcharge,
})

async function ouvrir(page: import('@playwright/test').Page, livraisons: () => unknown[], agents: () => unknown[] = () => [AGENT]) {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${B}/livraisons$`), () => ({ total: livraisons().length, elements: livraisons() }))
    .quand('GET', new RegExp(`^/marketplace/expeditions/boutiques/${B}/agents$`), () => agents())
  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Livraisons', exact: true }).click()
  await expect(page.getByTestId('livraisons-boutique')).toBeVisible()
}

test('un retrait suit ses étapes : affectation, photo du colis, comptoir, code et remise', async ({ page }) => {
  let etat = livraison({})
  const avancer = (surcharge: Record<string, unknown>) => () => { etat = { ...etat, ...surcharge }; return { ok: true } }
  await ouvrir(page, () => [etat])
  api
    .quand('POST', /^\/marketplace\/expeditions\/e1\/affectation$/, avancer({ statut: 'affectee', agentCourant: { id: 'ag1', nom: 'Paul Comptoir' } }))
    .quand('POST', /^\/marketplace\/expeditions\/e1\/preuves$/, { stockageCle: 'expeditions/e1/photo.jpg', empreinteSha256: 'a'.repeat(64) })
    .quand('POST', /^\/marketplace\/expeditions\/e1\/prise-en-charge$/, avancer({ statut: 'prise_en_charge' }))
    .quand('POST', /^\/marketplace\/expeditions\/e1\/depart$/, avancer({ statut: 'en_livraison' }))
    .quand('POST', /^\/marketplace\/expeditions\/e1\/code$/, avancer({ codeActifJusquau: '2026-10-22T08:00:00.000Z' }))
    .quand('POST', /^\/marketplace\/expeditions\/e1\/confirmation$/, avancer({ statut: 'livree' }))

  const carte = page.getByTestId('livraison-CM-RET-E1')
  await expect(carte).toContainText('Retrait à la boutique : Akwa, rue Joss')
  await expect(carte).toContainText('+237 699 00 00 02')
  await expect(carte).toContainText(/À encaisser : 45[\s  ]000 FCFA/)

  await carte.getByRole('button', { name: 'Affecter' }).click()
  await carte.getByRole('button', { name: 'Commande préparée' }).click()
  const fenetre = page.getByRole('dialog')
  await fenetre.getByLabel('Photo du colis').setInputFiles(PHOTO)
  await fenetre.getByRole('button', { name: 'Enregistrer' }).click()
  await carte.getByRole('button', { name: 'Prête au comptoir' }).click()
  await expect(carte).toContainText('Prête au comptoir')
  // Sans code envoye, la remise ne peut pas etre confirmee.
  await expect(carte.getByRole('button', { name: 'Confirmer la remise' })).toBeDisabled()
  await carte.getByRole('button', { name: 'Envoyer le code de retrait' }).click()
  await expect(carte).toContainText('Code envoyé au client')
  await carte.getByRole('button', { name: 'Confirmer la remise' }).click()
  await expect(page.getByRole('dialog')).toContainText(/Encaissez d’abord 45[\s  ]000 FCFA/)
  await page.getByRole('dialog').getByLabel('Code du client').fill('123456')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmer la remise' }).click()
  await expect(page.getByText('CM-RET-E1 est remise au client.')).toBeVisible()
  // Livree, elle quitte la liste des livraisons a traiter.
  await expect(page.getByText('Aucune livraison à traiter : tout est à jour.')).toBeVisible()

  expect(api.appelsVers('POST', /\/affectation$/)[0]!.corps).toEqual({ agentId: 'ag1' })
  expect(String(api.appelsVers('POST', /\/preuves$/)[0]!.corps)).toContain('filename="colis.jpg"')
  expect(api.appelsVers('POST', /\/prise-en-charge$/)[0]!.corps).toEqual({ type: 'photo_colis', stockageCle: 'expeditions/e1/photo.jpg', empreinteSha256: 'a'.repeat(64) })
  expect(api.appelsVers('POST', /\/confirmation$/)[0]!.corps).toEqual({ code: '123456', montantEncaisseFcfa: 45_000 })
})

test('le dépôt en agence se prouve par le bordereau ; Kati Express reste à KatiHub ; un agent s’ajoute', async ({ page }) => {
  let agents: unknown[] = [AGENT]
  const agence = livraison({
    id: 'e2', reference: 'CM-AGE-E1', statut: 'en_livraison', modeLivraison: 'agence', adresse: { mode: 'agence', ville: 'Bafoussam', agence: 'Général Express' },
    montantACollecterFcfa: 0, agentCourant: { id: 'ag1', nom: 'Paul Comptoir' }, sousCommande: { reference: 'CM-AGE-1', noteAgence: 'Général Express, gare de Bafoussam', lignes: [] },
  })
  const express = livraison({ id: 'e3', reference: 'CM-KEX-E1', modeLivraison: 'katihub', geree: false, adresse: null, telephoneClient: null })
  let deposee = false
  await ouvrir(page, () => [deposee ? { ...agence, statut: 'livree' } : agence, express], () => agents)
  api
    .quand('POST', /^\/marketplace\/expeditions\/e2\/preuves$/, { stockageCle: 'expeditions/e2/bordereau.jpg', empreinteSha256: 'b'.repeat(64) })
    .quand('POST', /^\/marketplace\/expeditions\/e2\/depot-agence$/, () => { deposee = true; return { livree: true } })
    .quand('POST', new RegExp(`^/marketplace/expeditions/boutiques/${B}/agents$`), () => {
      agents = [...agents, { id: 'ag2', nom: 'Awa Livreuse', telephone: '+237 677 00 00 03', actif: true, verifieLe: null, plafondEspecesFcfa: null }]
      return agents.at(-1)
    })

  // Le colis Kati Express n'apparait qu'avec les livraisons terminees, sans action.
  await expect(page.getByTestId('livraison-CM-KEX-E1')).toHaveCount(0)
  const carte = page.getByTestId('livraison-CM-AGE-E1')
  await expect(carte).toContainText('Agence : Général Express, gare de Bafoussam (Bafoussam)')
  await expect(carte).toContainText('Rien à encaisser')
  await carte.getByRole('button', { name: 'Confirmer le dépôt' }).click()
  const fenetre = page.getByRole('dialog')
  await fenetre.getByLabel('Numéro du bordereau').fill('GX-0042')
  await fenetre.getByLabel('Photo du bordereau').setInputFiles({ ...PHOTO, name: 'bordereau.jpg' })
  await fenetre.getByRole('button', { name: 'Confirmer le dépôt' }).click()
  await expect(page.getByText('CM-AGE-E1 est déposée à l’agence : le client est livré.')).toBeVisible()
  expect(api.appelsVers('POST', /\/depot-agence$/)[0]!.corps).toEqual({ numeroBordereau: 'GX-0042', stockageCle: 'expeditions/e2/bordereau.jpg', empreinteSha256: 'b'.repeat(64) })

  await page.getByLabel('Afficher aussi les livraisons terminées et Kati Express').check()
  await expect(page.getByTestId('livraison-CM-KEX-E1')).toContainText('Opérée par Kati Express : KatiHub s’en occupe.')

  await page.getByTestId('ajouter-agent').click()
  await page.getByRole('dialog').getByLabel('Nom complet').fill('Awa Livreuse')
  await page.getByRole('dialog').getByLabel('Téléphone mobile').fill('677000003')
  await page.getByRole('dialog').getByRole('button', { name: 'Ajouter' }).click()
  await expect(page.getByTestId('agent-ligne-Awa Livreuse')).toContainText('En attente de vérification KatiHub')
  await expect(page.getByTestId('agent-ligne-Paul Comptoir')).toContainText(/peut encaisser jusqu’à 200[\s  ]000 FCFA/)
  expect(api.appelsVers('POST', /\/agents$/)[0]!.corps).toEqual({ nom: 'Awa Livreuse', telephone: '+237 677 00 00 03' })
})
