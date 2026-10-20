import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B = '00000000-0000-4000-8000-0000000000b1'
const O = '00000000-0000-4000-8000-0000000000f1'
const AKWA = '00000000-0000-4000-8000-0000000000a1'
const BONANJO = '00000000-0000-4000-8000-0000000000b2'

test('le checkout recalcule les frais sur le quartier sélectionné et transmet son identifiant', async ({ page }) => {
  api = await simulerApi(page)
  api
    .quand('GET', /^\/marketplace\/localites$/, [
      { ville: 'Douala', quartiers: [{ id: AKWA, nom: 'Akwa' }, { id: BONANJO, nom: 'Bonanjo' }] },
    ])
    .quand('POST', /^\/marketplace\/panier\/verifier$/, [
      {
        nom: 'Téléphone', slug: 'telephone', offres: [{
          id: O, titre: 'Téléphone neuf', prixFcfa: 50_000, disponible: 10,
          modesLivraison: ['katihub', 'vendeur'], villesLivraison: ['Douala'], delaiMaxJours: 3,
          boutique: { id: B, nom: 'TechMall', slug: 'techmall' },
        }],
      },
    ])
    .quand('GET', /^\/marketplace\/livraison\/tarifs$/, [
      { id: 't1', quartierId: AKWA, quartier: 'Akwa', ville: 'Douala', mode: 'katihub', montantFcfa: 1_000, gratuitDesFcfa: null },
      { id: 't2', quartierId: BONANJO, quartier: 'Bonanjo', ville: 'Douala', mode: 'katihub', montantFcfa: 3_000, gratuitDesFcfa: null },
    ])
    .quand('POST', /^\/marketplace\/commandes\/sans-compte$/, { reference: 'CM-QUARTIER', jeton: 'suivi' })
    .quand('GET', /^\/marketplace\/commandes\/sans-compte\/CM-QUARTIER$/, {
      id: 'commande-quartier', reference: 'CM-QUARTIER', statut: 'soumise', totalFermeTtc: 50_000,
      fraisLivraison: 3_000, acompteDu: 5_000, acompteRecu: 0, resteAPayer: 48_000,
      modePaiementMarketplace: 'acompte', assuranceFcfa: 0, installationFcfa: 0, katiUtilises: 0, remiseKatiFcfa: 0,
      sousCommandes: [{
        reference: 'CM-QUARTIER-1', boutiqueId: B, boutique: { nom: 'TechMall', slug: 'techmall' },
        totalNetProduits: 50_000, modeLivraison: 'katihub', noteAgence: null,
        lignes: [{ offreTitreCapture: 'Téléphone neuf', quantite: 1, totalNetFcfa: 50_000 }],
      }],
    })
  await page.addInitScript(([offre, boutique]) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([
      { slug: 'telephone', name: 'Téléphone', price: 50_000, image: null, qty: 1, offerId: offre, boutiqueId: boutique, boutiqueNom: 'TechMall' },
    ]))
  }, [O, B])

  await page.goto(`/marketplace/commande?articles=${O}`)
  const quartier = page.getByRole('combobox', { name: 'Quartier', exact: true })
  await quartier.selectOption(AKWA)
  await expect(page.getByTestId(`frais-${B}-katihub`)).toHaveText(/1[\s\u202f\u00a0]000 FCFA/)
  await quartier.selectOption(BONANJO)
  await expect(page.getByTestId(`frais-${B}-katihub`)).toHaveText(/3[\s\u202f\u00a0]000 FCFA/)

  await page.getByLabel('Nom complet').fill('Awa Test')
  await page.getByLabel(/Téléphone mobile/).fill('699000000')
  await page.getByLabel('E-mail').fill('awa@example.cm')
  await page.getByLabel(/Rep/).fill('Face au marché')
  await page.getByLabel(/Téléphone du destinataire/).fill('699000000')
  await page.getByLabel(/J’ai vérifié ma commande/).check()
  await page.getByRole('button', { name: /Commander et payer/ }).click()
  await expect(page).toHaveURL(/CM-QUARTIER\/paiement/)

  const commande = api.appelsVers('POST', /^\/marketplace\/commandes\/sans-compte$/)[0]
  expect(commande!.corps).toMatchObject({ adresse: { quartierId: BONANJO, quartier: 'Bonanjo', ville: 'Douala' } })
})
