import { expect, test, type Page } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LE REGLEMENT A LA COMMANDE (lot 4) : acompte ou paiement complet, assurance
 * KATI cochee par defaut, installation par categorie, et ce que la page de
 * paiement dit d'une commande payee en entier ou confirmee par les KATI.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B = '00000000-0000-4000-8000-0000000000b1'
const O = '00000000-0000-4000-8000-0000000000f1'
const CATEGORIE = '00000000-0000-4000-8000-0000000000c1'
const montant = (valeur: number) => new RegExp(`${new Intl.NumberFormat('fr-FR').format(valeur).replace(/\s/g, '[\\s  ]')} FCFA`)

async function jusquaLaRevue(page: Page) {
  api = (await simulerApi(page))
    .quand('POST', /^\/marketplace\/panier\/verifier$/, [{ nom: 'Téléphone', slug: 'telephone', offres: [{
      id: O, titre: 'Téléphone', prixFcfa: 149_000, disponible: 10, modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 3, boutique: { id: B, nom: 'TechMall', slug: 'techmall' },
    }] }])
    .quand('GET', /^\/marketplace\/livraison\/tarifs$/, [{ ville: 'Douala', mode: 'katihub', montantFcfa: 2_000, gratuitDesFcfa: null }])
    .quand('GET', /^\/marketplace\/services-commande\?/, {
      assurance: { active: true, tauxBps: 500 },
      installations: [{ categorieId: CATEGORIE, nom: 'Téléphones', prixFcfa: 7_500 }],
    })
  await page.addInitScript(([o, b]) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([{ slug: 'telephone', name: 'Téléphone', price: 149_000, image: null, qty: 2, offerId: o, boutiqueId: b, boutiqueNom: 'TechMall' }]))
  }, [O, B])
  // La commande tient sur une page : le reglement se lit sans etape intermediaire.
  await page.goto(`/marketplace/commande?articles=${O}`)
  await page.getByLabel('Quartier').selectOption('Akwa')
  await page.getByLabel('Repère').fill('Face pharmacie')
  await expect(page.getByTestId('reglement-commande')).toBeVisible()
}

test('l’acompte, l’assurance cochée par défaut, l’installation et le paiement complet changent ce qui se paie maintenant', async ({ page }) => {
  await jusquaLaRevue(page)
  // 298 000 de produits : acompte 29 800 + assurance 5 % (14 900) maintenant ; le reste et 2 000 de frais a la livraison.
  await expect(page.getByTestId('option-assurance')).toBeChecked()
  await expect(page.getByTestId('reglement-commande')).toContainText(montant(14_900))
  await expect(page.getByTestId('a-payer-maintenant')).toContainText(montant(44_700))
  await expect(page.getByTestId('a-payer-livraison')).toContainText(montant(270_200))

  await page.getByTestId(`option-installation-${CATEGORIE}`).check()
  await expect(page.getByTestId('a-payer-maintenant')).toContainText(montant(52_200))
  await expect(page.getByTestId('recap-options')).toContainText('Installation')

  await page.getByLabel(/Tout payer maintenant/).check()
  await expect(page.getByTestId('a-payer-maintenant')).toContainText(montant(298_000 + 2_000 + 14_900 + 7_500))
  await expect(page.getByTestId('a-payer-livraison')).toContainText('Rien à régler au livreur.')
  await expect(page.getByTestId('recap-livraison')).toContainText(montant(0))

  // L'assurance est facultative.
  await page.getByTestId('option-assurance').uncheck()
  await expect(page.getByTestId('a-payer-maintenant')).toContainText(montant(298_000 + 2_000 + 7_500))
  await expect(page.getByTestId('recap-maintenant')).toContainText(montant(307_500))
})

const commande = (surcharge: Record<string, unknown>) => ({
  id: 'c1', reference: 'CM-REG123', statut: 'confirmee', totalFermeTtc: 298_000, fraisLivraison: 2_000,
  acompteDu: 0, acompteRecu: 0, resteAPayer: 0, modePaiementMarketplace: 'acompte', assuranceFcfa: 0, installationFcfa: 0, katiUtilises: 0, remiseKatiFcfa: 0,
  sousCommandes: [{ reference: 'CM-REG123-1', boutiqueId: B, boutique: { nom: 'TechMall', slug: 'techmall' }, totalNetProduits: 298_000, modeLivraison: 'katihub', lignes: [{ offreTitreCapture: 'Téléphone', quantite: 2, totalNetFcfa: 298_000 }] }],
  kati: null,
  ...surcharge,
})

test('une commande payée en entier dit qu’il n’y a rien à payer au livreur', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/commandes\/CM-REG123$/, commande({
    modePaiementMarketplace: 'complet', acompteDu: 322_400, acompteRecu: 322_400, assuranceFcfa: 14_900, installationFcfa: 7_500,
  }))
  await page.goto('/marketplace/commande/CM-REG123/paiement')
  await expect(page.getByRole('heading', { name: 'Paiement reçu, merci.' })).toBeVisible()
  await expect(page.getByText('Votre commande est entièrement réglée : rien à payer au livreur.')).toBeVisible()
  await expect(page.getByText('Frais de livraison (payés en ligne)')).toBeVisible()
  await expect(page.getByText('Assurance KATI')).toBeVisible()
})

test('une commande dont les KATI couvrent l’acompte est confirmée sans paiement', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/commandes\/CM-REG123$/, commande({
    katiUtilises: 300_000, remiseKatiFcfa: 30_000, resteAPayer: 270_000,
  }))
  await page.goto('/marketplace/commande/CM-REG123/paiement')
  await expect(page.getByRole('heading', { name: 'Commande confirmée, merci.' })).toBeVisible()
  await expect(page.getByTestId('paiement-recu')).toContainText(montant(30_000))
  await expect(page.getByTestId('paiement-recu')).toContainText('payés en KATI')
  await expect(page.getByText('Le solde reste dû à la livraison.', { exact: false })).toBeVisible()
})
