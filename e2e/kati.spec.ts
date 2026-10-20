import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { commande } from './support/donnees'

/**
 * LES KATI COTE CLIENT : le portefeuille (soldes, gains a venir, historique),
 * ce qu'une commande rapportera au panier, et ce qu'elle a rapporte au suivi.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const operation = (id: string, type: string, variations: { disponible?: number; enAttente?: number }, commandeRef: string | null = 'CM-ABC123') => ({
  id, type, libelle: `Commande ${commandeRef} : 1 % de 298 000 FCFA`, creeLe: '2026-10-17T10:00:00.000Z', commande: commandeRef, commission: false,
  disponible: variations.disponible ?? 0, enAttente: variations.enAttente ?? 0, reserve: 0,
})

const PARRAINAGE = {
  code: 'AW482731', lien: 'https://katihub.cm/?p=AW482731', commissionBps: 50, dureeMois: 12,
  parrain: null, peutEtreParraine: false, filleuls: 2, commissionsGagnees: 29_800,
}

test('le portefeuille montre les soldes, leur valeur, les gains à venir et l’historique signé', async ({ page }) => {
  const premiere = [
    operation('t3', 'annulation', { disponible: -14_900 }),
    operation('t2', 'liberation', { disponible: 29_800, enAttente: -29_800 }),
    ...Array.from({ length: 18 }, (_, i) => operation(`a${i}`, 'attribution', { enAttente: 1_000 }, `CM-${i}`)),
  ]
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/kati\/moi$/, {
      disponible: 104_300, enAttente: 18_000, reserve: 0, valeurFcfa: { disponible: 10_430, enAttente: 1_800 }, katiParFcfa: 10,
      gainsEnAttente: [{ id: 'g1', libelle: 'Commande CM-NEW : 1 %', commande: 'CM-NEW', commission: false, points: 18_000, disponibleLe: '2026-10-22T10:00:00.000Z' }],
    })
    .quand('GET', /^\/marketplace\/kati\/moi\/historique$/, { total: 21, page: 1, taille: 20, elements: premiere })
    .quand('GET', /^\/marketplace\/kati\/parrainage$/, PARRAINAGE)
    .quand('GET', /^\/marketplace\/kati\/moi\/historique\?page=2$/, { total: 21, page: 2, taille: 20, elements: [operation('t1', 'attribution', { enAttente: 29_800 })] })

  await page.goto('/compte/kati')
  await expect(page.getByTestId('kati-disponible')).toContainText(/104[\s  ]300 KATI/)
  await expect(page.getByTestId('kati-disponible')).toContainText(/10[\s  ]430 FCFA/)
  await expect(page.getByTestId('kati-en-attente')).toContainText(/18[\s  ]000 KATI/)
  await expect(page.getByText('Commande CM-NEW')).toBeVisible()
  await expect(page.getByText(/Chaque commande livrée vous rapporte 1 %/)).toBeVisible()

  const historique = page.getByTestId('kati-historique')
  // Une reprise apres remboursement se lit en negatif ; une liberation, sans signe.
  await expect(historique.getByRole('listitem').first()).toContainText(/Repris.*−14[\s  ]900 KATI/)
  await expect(historique.getByRole('listitem').nth(1)).toContainText(/Disponible.*29[\s  ]800 KATI/)
  await expect(historique.getByRole('listitem')).toHaveCount(20)
  await page.getByRole('button', { name: 'Voir plus' }).click()
  await expect(historique.getByRole('listitem')).toHaveCount(21)
  await expect(page.getByRole('button', { name: 'Voir plus' })).toHaveCount(0)
})

test('sans session, la page propose de se connecter', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/kati\/moi$/, { status: 401, body: { message: 'Non authentifie' } })
    .quand('GET', /^\/marketplace\/kati\/moi\/historique$/, { status: 401, body: { message: 'Non authentifie' } })
  await page.goto('/compte/kati')
  await expect(page.getByText('Connectez-vous pour voir vos KATI.', { exact: false })).toBeVisible()
})

test('le panier annonce les KATI que la commande rapportera', async ({ page }) => {
  const O = '00000000-0000-4000-8000-0000000000f1'
  const B = '00000000-0000-4000-8000-0000000000b1'
  api = (await simulerApi(page))
    .quand('POST', /^\/marketplace\/panier\/verifier$/, [{ nom: 'Téléphone', slug: 'telephone', offres: [{
      id: O, titre: 'Téléphone', prixFcfa: 149_000, disponible: 10, modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 3, boutique: { id: B, nom: 'TechMall', slug: 'techmall' },
    }] }])
    .quand('GET', /^\/marketplace\/livraison\/tarifs$/, [{ quartierId: '00000000-0000-4000-8000-0000000000a1', quartier: 'Akwa', ville: 'Douala', mode: 'katihub', montantFcfa: 2_000, gratuitDesFcfa: null }])
  await page.addInitScript(([o, b]) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([{ slug: 'telephone', name: 'Téléphone', price: 149_000, image: null, qty: 2, offerId: o, boutiqueId: b, boutiqueNom: 'TechMall' }]))
  }, [O, B])
  await page.goto(`/marketplace/commande?articles=${O}`)
  // 2 x 149 000 FCFA a 1 % et 10 KATI par FCFA : 29 800 KATI.
  await expect(page.getByTestId('gain-kati')).toContainText(/29[\s  ]800 KATI/)
  await expect(page.getByTestId('gain-kati')).toContainText('1 %')
})

test('le suivi dit ce que la commande a rapporté et quand ce sera utilisable', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande({ kati: { points: 20_000, liberes: false, disponibleLe: '2026-10-22T10:00:00.000Z' } }))
    .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [])
  await page.goto('/marketplace/commande/CM-E2E/suivi')
  await expect(page.getByTestId('kati-commande')).toContainText(/20[\s  ]000 KATI/)
  await expect(page.getByTestId('kati-commande')).toContainText('disponibles le')
})

test('la carte de parrainage donne le code, le lien à partager et le bilan', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/kati\/moi$/, { disponible: 0, enAttente: 0, reserve: 0, valeurFcfa: { disponible: 0, enAttente: 0 }, katiParFcfa: 10, gainsEnAttente: [] })
    .quand('GET', /^\/marketplace\/kati\/moi\/historique$/, { total: 0, page: 1, taille: 20, elements: [] })
    .quand('GET', /^\/marketplace\/kati\/parrainage$/, PARRAINAGE)
  await page.goto('/compte/kati')
  const carte = page.getByTestId('carte-parrainage')
  await expect(carte.getByTestId('code-parrainage')).toHaveText('AW482731')
  await expect(carte).toContainText('https://katihub.cm/?p=AW482731')
  await expect(carte).toContainText('0,5 %')
  await expect(carte).toContainText('Ils gagnent leurs KATI comme tout client.')
  await expect(carte).not.toContainText('Eux gagnent')
  await expect(carte.getByTestId('bilan-parrainage')).toContainText(/2 filleuls · 29[\s  ]800 KATI/)
  await expect(carte.getByRole('link', { name: 'Partager sur WhatsApp' })).toHaveAttribute('href', /wa\.me\/\?text=.*AW482731/)
  // Deja livre ou deja parraine : pas de saisie de code.
  await expect(carte.getByRole('button', { name: 'Valider le code' })).toHaveCount(0)
})

test('un lien de parrainage est gardé, son clic noté, puis le code est proposé et rattaché une fois connecté', async ({ page }) => {
  let rattache = false
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/demandes-client/, [])
    .quand('POST', /^\/marketplace\/kati\/parrainage\/clics$/, { valide: true })
    .quand('GET', /^\/marketplace\/kati\/moi$/, { disponible: 0, enAttente: 0, reserve: 0, valeurFcfa: { disponible: 0, enAttente: 0 }, katiParFcfa: 10, gainsEnAttente: [] })
    .quand('GET', /^\/marketplace\/kati\/moi\/historique$/, { total: 0, page: 1, taille: 20, elements: [] })
    .quand('GET', /^\/marketplace\/kati\/parrainage$/, () => ({ ...PARRAINAGE, code: 'BO193746', peutEtreParraine: !rattache, filleuls: 0, commissionsGagnees: 0 }))
    .quand('POST', /^\/marketplace\/kati\/parrainage$/, () => { rattache = true; return { depuis: '2026-10-17T10:00:00.000Z', jusquau: '2027-10-17T10:00:00.000Z' } })

  await page.goto('/compte/favoris?p=aw482731')
  await expect.poll(() => api.appelsVers('POST', /\/parrainage\/clics$/).length).toBe(1)
  const clic = api.appelsVers('POST', /\/parrainage\/clics$/)[0]!.corps as { code: string; jeton: string }
  expect(clic.code).toBe('AW482731')
  expect(clic.jeton).toMatch(/^[0-9a-f]{48}$/)
  // Le code ne reste pas dans l'adresse : un lien partage ensuite ne le transmet pas.
  await expect(page).toHaveURL(/\/compte\/favoris$/)

  await page.goto('/compte/kati')
  const carte = page.getByTestId('carte-parrainage')
  const saisie = carte.getByLabel(/Son code de parrainage/)
  const valider = carte.getByRole('button', { name: 'Valider le code' })
  await expect(saisie).toHaveValue('AW482731')
  await saisie.fill('AW48273A')
  await expect(valider).toBeDisabled()
  await saisie.fill('aw482731')
  await expect(saisie).toHaveValue('AW482731')
  await expect(valider).toBeEnabled()
  await valider.click()
  await expect(carte.getByRole('status')).toContainText(/récompensé de vos commandes jusqu’au/)
  expect(api.appelsVers('POST', /\/kati\/parrainage$/)[0]!.corps).toEqual({ code: 'AW482731', jeton: clic.jeton })
  await expect(carte.getByRole('button', { name: 'Valider le code' })).toHaveCount(0)
})

test('le formulaire d’inscription reprend le code du lien suivi', async ({ page }) => {
  api = await simulerApi(page)
  await page.addInitScript(() => localStorage.setItem('katihub.parrainage.v1', JSON.stringify({ code: 'AW482731', jeton: 'a'.repeat(48), le: Date.now() })))
  await page.goto('/inscription')
  await expect(page.getByLabel(/Code de parrainage/)).toHaveValue('AW482731')
})
