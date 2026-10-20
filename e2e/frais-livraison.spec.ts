import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LES FRAIS DE LIVRAISON A LA COMMANDE : par boutique, selon le quartier et le
 * mode, offerts au-dela du seuil, et un mode non tarife dans la ville n'est pas
 * proposable.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B1 = '00000000-0000-4000-8000-0000000000b1'
const B2 = '00000000-0000-4000-8000-0000000000b2'
const O1 = '00000000-0000-4000-8000-0000000000f1'
const O2 = '00000000-0000-4000-8000-0000000000f2'

const offre = (id: string, boutique: string, nom: string, prix: number) => ({
  id, titre: nom, prixFcfa: prix, disponible: 10, modesLivraison: ['katihub', 'vendeur'], villesLivraison: ['Douala', 'Yaoundé'], delaiMaxJours: 3,
  boutique: { id: boutique, nom, slug: nom.toLowerCase() },
})

test('la commande affiche les frais de chaque boutique et les ajoute au solde, pas à l’acompte', async ({ page }) => {
  api = (await simulerApi(page))
    .quand('POST', /^\/marketplace\/panier\/verifier$/, [
      { nom: 'Téléphone', slug: 'telephone', offres: [offre(O1, B1, 'TechMall', 150_000)] },
      { nom: 'Écouteurs', slug: 'ecouteurs', offres: [offre(O2, B2, 'Digital', 25_000)] },
    ])
    .quand('GET', /^\/marketplace\/livraison\/tarifs$/, [
      { quartierId: '00000000-0000-4000-8000-0000000000a1', quartier: 'Akwa', ville: 'Douala', mode: 'katihub', montantFcfa: 2_000, gratuitDesFcfa: 100_000 },
      { quartierId: '00000000-0000-4000-8000-0000000000a1', quartier: 'Akwa', ville: 'Douala', mode: 'vendeur', montantFcfa: 1_500, gratuitDesFcfa: null },
      { quartierId: '00000000-0000-4000-8000-0000000000b2', quartier: 'Bonanjo', ville: 'Douala', mode: 'katihub', montantFcfa: 3_000, gratuitDesFcfa: null },
    ])
  await page.addInitScript(([o1, o2, b1, b2]) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([
      { slug: 'telephone', name: 'Téléphone', price: 150_000, image: null, qty: 1, offerId: o1, boutiqueId: b1, boutiqueNom: 'TechMall' },
      { slug: 'ecouteurs', name: 'Écouteurs', price: 25_000, image: null, qty: 1, offerId: o2, boutiqueId: b2, boutiqueNom: 'Digital' },
    ]))
  }, [O1, O2, B1, B2])

  await page.goto(`/marketplace/commande?articles=${O1},${O2}`)
  await page.getByRole('combobox', { name: 'Quartier' }).selectOption('00000000-0000-4000-8000-0000000000a1')
  // Douala : TechMall depasse le seuil (offerte), Digital paie 2 000 en KatiHub.
  await expect(page.getByTestId(`frais-${B1}-katihub`)).toHaveText('offerte')
  await expect(page.getByTestId(`frais-${B2}-katihub`)).toHaveText(/2[\s  ]000 FCFA/)
  await expect(page.getByTestId(`frais-${B2}-vendeur`)).toHaveText(/1[\s  ]500 FCFA/)
  await expect(page.getByTestId('frais-livraison')).toHaveText(/2[\s  ]000 FCFA/)

  // Digital en livraison par la boutique : 1 500.
  await page.locator(`input[name="delivery-${B2}"]`).nth(1).check()
  await expect(page.getByTestId('frais-livraison')).toHaveText(/1[\s  ]500 FCFA/)

  // Bonanjo : tarif KatiHub distinct, sans tarif vendeur configuré.
  await page.getByRole('combobox', { name: 'Quartier' }).selectOption('00000000-0000-4000-8000-0000000000b2')
  await expect(page.getByTestId(`frais-${B2}-vendeur`)).toHaveText('non proposée dans Bonanjo')
  await expect(page.locator(`input[name="delivery-${B2}"]`).nth(1)).toBeDisabled()
  await expect(page.getByTestId('frais-livraison')).toHaveText(/6[\s  ]000 FCFA/)
})
