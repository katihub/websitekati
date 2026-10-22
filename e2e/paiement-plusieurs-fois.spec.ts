import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LE PAIEMENT EN PLUSIEURS FOIS COTE CLIENT : ouverture avec la regle de
 * non-remboursement acceptee, paiement d'un versement suivi jusqu'a sa
 * confirmation, abandon averti, et choix de la livraison une fois paye.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const O = '00000000-0000-4000-8000-0000000000f1'
const AKWA = '00000000-0000-4000-8000-0000000000a1'
const montant = (valeur: number) => new RegExp(`${new Intl.NumberFormat('fr-FR').format(valeur).replace(/\s/g, '[\\s  ]')} FCFA`)

const ELIGIBLE = {
  eligible: true, totalFcfa: 65_000, premierVersementMinFcfa: 6_500, versementMinFcfa: 5_000, dureeMaxJours: 180,
  seuilReservationFcfa: 32_500, seuilReservationBps: 5_000, mode: 'libre', nombreTranches: null,
}

function plan(surcharge: Record<string, unknown> = {}) {
  return {
    reference: 'PE-4F7KM3', statut: 'ouvert', quantite: 1, prixUnitaireFcfa: 65_000, totalProduitsFcfa: 65_000, montantVerseFcfa: 0, resteFcfa: 65_000,
    echeanceLe: new Date(Date.now() + 120 * 86_400_000).toISOString(), stockReserve: 0, reserveLe: null, seuilReservationFcfa: 32_500,
    livraison: null, fraisLivraisonFcfa: null, commande: null, clotureLe: null, motifCloture: null, creeLe: new Date().toISOString(),
    boutique: { nom: 'TechMall', slug: 'techmall' }, produit: { nom: 'Téléphone X', slug: 'telephone-x', image: null, offreId: O },
    livraisonsPossibles: { modes: ['katihub', 'retrait'], villes: ['Douala'] },
    regles: { mode: 'libre', nombreTranches: null, versementMinFcfa: 5_000, dureeJours: 120 },
    prochainVersement: { minimum: 6_500, maximum: 65_000, reste: 65_000 },
    versements: [{ reference: 'PE-4F7KM3-V01', nature: 'produits', montantFcfa: 10_000, statut: 'en_attente', recuLe: null, creeLe: new Date().toISOString() }],
    ...surcharge,
  }
}

test('ouvrir un paiement exige la regle acceptee, puis le premier versement se paie et se confirme', async ({ page }) => {
  let lectures = 0
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/echelonnement\/offres\/[^/]+\?quantite=1$/, ELIGIBLE)
    .quand('POST', /^\/marketplace\/echelonnement\/plans$/, { plan: 'PE-4F7KM3', versement: 'PE-4F7KM3-V01', montantFcfa: 10_000 })
    .quand('GET', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3$/, () => {
      lectures += 1
      // Le rappel du prestataire arrive : le versement passe recu a la troisieme lecture.
      return lectures < 3 ? plan() : plan({
        montantVerseFcfa: 10_000, resteFcfa: 55_000, prochainVersement: { minimum: 5_000, maximum: 55_000, reste: 55_000 },
        versements: [{ reference: 'PE-4F7KM3-V01', nature: 'produits', montantFcfa: 10_000, statut: 'recu', recuLe: new Date().toISOString(), creeLe: new Date().toISOString() }],
      })
    })
    .quand('POST', /^\/paiements\/fapshi\/echelonnement\/direct$/, { transId: 'TX-9', montant: 10_000 })

  await page.goto(`/paiement-plusieurs-fois/nouveau?offre=${O}&quantite=1&nom=T%C3%A9l%C3%A9phone%20X`)
  await expect(page.getByTestId('total-plan')).toContainText(montant(65_000))
  await expect(page.getByTestId('valider-plan')).toBeDisabled()
  await page.getByTestId('premier-versement').fill('5000')
  await page.getByTestId('conditions-plan').locator('input').check()
  // Sous le premier versement minimum (10 %), l'ouverture reste impossible.
  await expect(page.getByTestId('valider-plan')).toBeDisabled()
  await page.getByTestId('premier-versement').fill('10000')
  await page.getByTestId('duree-plan').selectOption({ label: '4 mois' })
  await page.getByTestId('valider-plan').click()

  await expect(page).toHaveURL(/\/compte\/paiements-plusieurs-fois\/PE-4F7KM3\?versement=PE-4F7KM3-V01/)
  expect(api.appelsVers('POST', /^\/marketplace\/echelonnement\/plans$/)[0]?.corps).toEqual({ offreId: O, quantite: 1, dureeJours: 120, premierVersementFcfa: 10_000, conditionsAcceptees: true })

  await page.getByTestId('paiement-versement').getByLabel(/Numéro/).fill('6 77 12 34 56')
  await page.getByRole('button', { name: /Payer 10.000 FCFA/ }).click()
  await expect(page.getByTestId('versement-en-attente')).toBeVisible()
  expect(api.appelsVers('POST', /^\/paiements\/fapshi\/echelonnement\/direct$/)[0]?.corps).toEqual({ reference: 'PE-4F7KM3-V01', telephone: '+237 677 12 34 56' })
  await expect(page.getByTestId('montant-verse')).toContainText(montant(10_000), { timeout: 15_000 })
  await expect(page.getByTestId('verser')).toBeVisible()
  await expect(page.getByTestId('historique-versements')).toContainText('Reçu')
})

test('un versement respecte ses bornes, et l’abandon avertit qu’il n’y aura pas de remboursement', async ({ page }) => {
  const enCours = plan({ statut: 'reserve', montantVerseFcfa: 40_000, resteFcfa: 25_000, stockReserve: 1, reserveLe: new Date().toISOString(), prochainVersement: { minimum: 5_000, maximum: 25_000, reste: 25_000 }, versements: [] })
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3$/, enCours)
    .quand('POST', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3\/versements$/, { plan: 'PE-4F7KM3', versement: 'PE-4F7KM3-V03', montantFcfa: 25_000 })
    .quand('POST', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3\/abandon$/, { ...enCours, statut: 'abandonne', prochainVersement: null })

  await page.goto('/compte/paiements-plusieurs-fois/PE-4F7KM3')
  await expect(page.getByText('Le produit est réservé pour vous.')).toBeVisible()
  await page.getByTestId('montant-versement').fill('30000')
  await expect(page.getByRole('button', { name: /^Verser/ })).toBeDisabled()
  await page.getByRole('button', { name: /Tout payer/ }).click()
  await page.getByRole('button', { name: /^Verser 25.000 FCFA/ }).click()
  await expect(page.getByTestId('paiement-versement')).toContainText(montant(25_000))
  expect(api.appelsVers('POST', /versements$/)[0]?.corps).toEqual({ montantFcfa: 25_000 })
  await page.getByRole('button', { name: 'Changer le montant' }).click()

  await page.getByTestId('abandonner').click()
  await expect(page.getByRole('alertdialog')).toContainText('vous ne serez pas remboursé')
  await page.getByTestId('confirmer-abandon').click()
  await expect(page.getByTestId('statut-plan')).toHaveText('Abandonné')
  expect(api.appelsVers('POST', /abandon$/)[0]?.corps).toEqual({ renonceAuRemboursement: true })
})

test('une fois paye, le client choisit sa livraison, voit les frais, les paie et suit sa commande', async ({ page }) => {
  const solde = plan({ statut: 'solde', montantVerseFcfa: 65_000, resteFcfa: 0, stockReserve: 1, reserveLe: new Date().toISOString(), prochainVersement: null, versements: [] })
  let lectures = 0
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3$/, () => {
      lectures += 1
      const frais = { reference: 'PE-4F7KM3-V04', nature: 'livraison', montantFcfa: 2_000, creeLe: new Date().toISOString() }
      if (lectures === 1) return solde
      if (lectures === 2) return { ...solde, livraison: { mode: 'katihub', adresse: { ville: 'Douala' } }, fraisLivraisonFcfa: 2_000, versements: [{ ...frais, statut: 'en_attente', recuLe: null }] }
      return { ...solde, statut: 'converti', commande: 'CM-VAXFJU', versements: [{ ...frais, statut: 'recu', recuLe: new Date().toISOString() }] }
    })
    .quand('POST', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3\/livraison\/estimation$/, { fraisLivraisonFcfa: 2_000, totalFcfa: 67_000 })
    .quand('POST', /^\/marketplace\/echelonnement\/plans\/PE-4F7KM3\/livraison$/, { plan: 'PE-4F7KM3', versement: 'PE-4F7KM3-V04', montantFcfa: 2_000 })
    .quand('POST', /^\/paiements\/fapshi\/echelonnement\/direct$/, { transId: 'TX-10', montant: 2_000 })

  await page.goto('/compte/paiements-plusieurs-fois/PE-4F7KM3')
  const choix = page.getByTestId('choix-livraison-plan')
  await choix.getByLabel('Quartier').selectOption(AKWA)
  await choix.getByLabel('Repère').fill('Face pharmacie')
  await choix.getByLabel('Téléphone à joindre').fill('677123456')
  await choix.getByRole('button', { name: 'Calculer les frais' }).click()
  await expect(page.getByTestId('frais-livraison-plan')).toContainText(montant(2_000))
  await choix.getByRole('button', { name: /Confirmer et payer 2.000 FCFA/ }).click()
  await expect(page.getByTestId('paiement-versement')).toBeVisible()
  expect(api.appelsVers('POST', /livraison$/)[0]?.corps).toEqual({ mode: 'katihub', adresse: { ville: 'Douala', telephoneDestinataire: '677123456', quartier: 'Akwa', quartierId: AKWA, repere: 'Face pharmacie' } })

  await page.getByTestId('paiement-versement').getByLabel(/Numéro/).fill('677123456')
  await page.getByRole('button', { name: /Payer 2.000 FCFA/ }).click()
  await expect(page.getByTestId('commande-plan')).toContainText('CM-VAXFJU', { timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Suivre ma commande' })).toHaveAttribute('href', '/marketplace/commande/CM-VAXFJU/suivi')
})

test('un produit non eligible le dit, et la liste des plans renvoie vers chacun', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/echelonnement\/offres\/[^/]+\?quantite=1$/, { eligible: false, motif: 'offre_non_acceptee', message: 'Cette boutique ne propose pas le paiement en plusieurs fois sur ce produit.' })
    .quand('GET', /^\/marketplace\/echelonnement\/plans$/, [plan({ statut: 'reserve', montantVerseFcfa: 40_000, resteFcfa: 25_000 })])
  await page.goto(`/paiement-plusieurs-fois/nouveau?offre=${O}&quantite=1`)
  await expect(page.getByText('Cette boutique ne propose pas le paiement en plusieurs fois sur ce produit.')).toBeVisible()
  await page.goto('/compte/paiements-plusieurs-fois')
  const liste = page.getByTestId('mes-plans')
  await expect(liste).toContainText('Téléphone X')
  await expect(liste).toContainText('Produit réservé')
  await expect(liste.getByRole('link')).toHaveAttribute('href', '/compte/paiements-plusieurs-fois/PE-4F7KM3')
})
