import { expect, test, type Page } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { boutique, espaceBoutique, IDS, litigeBoutique, mission } from './support/donnees'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const vide = { total: 0, elements: [] }

/** Toutes les sections que l'espace vendeur charge a l'ouverture d'une boutique. */
async function espaceVendeur(page: Page, litiges: unknown[]) {
  const b = IDS.boutique
  return (await simulerApi(page))
    .quand('GET', /^\/vendeurs\/mes-boutiques$/, [boutique()])
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}$`), espaceBoutique())
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/documents$`), [])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${b}/propositions-produits$`), [])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${b}/offres$`), [])
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/(commandes|livraisons|paiements|avis)`), vide)
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/clients`), { elements: [] })
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/membres$`), [])
    .quand('GET', new RegExp(`^/marketplace/finance/boutiques/${b}$`), { soldes: { disponibleFcfa: 0, geleFcfa: 0 }, destinations: [], retraits: [], transactions: [] })
    .quand('GET', new RegExp(`^/marketplace/demandes-client/boutiques/${b}$`), () => litiges)
}

test('le vendeur retrouve le litige ouvert par le client dans son espace', async ({ page }) => {
  api = await espaceVendeur(page, [litigeBoutique()])

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Litiges et retours' }).click()

  await expect(page.getByRole('heading', { name: 'Litiges et retours' })).toBeVisible()
  await expect(page.getByText('Écran fissuré à la réception').first()).toBeVisible()
  await expect(page.getByText('DC-20261013-E2E').first()).toBeVisible()
})

test('le livreur voit sa mission et le montant à encaisser', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/expeditions\/miennes$/, [mission()])

  await page.goto('/espace-livreur')

  await expect(page.getByRole('heading', { name: 'Mes missions' })).toBeVisible()
  await expect(page.getByText('CM-E2E-E1').first()).toBeVisible()
  await expect(page.getByText(/160[\s  ]000/).first()).toBeVisible()
  await expect(page.getByLabel('Code à 6 chiffres')).toBeVisible()
})
