import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { espaceBoutique, IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LE CATALOGUE DU 16 OCTOBRE COTE MARCHAND : description courte et fiche
 * technique (texte et PDF), MOQ de l'offre, attributs de variante de la
 * categorie, boutique sans suivi de stock qui refuse une ligne.
 * On verifie ce que l'ecran envoie au backend.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B = IDS.boutique
const PRODUIT = '00000000-0000-4000-8000-000000000201'
const OFFRE = '00000000-0000-4000-8000-000000000202'
const produit = { id: PRODUIT, slug: 'galaxy-a15', nom: 'Samsung Galaxy A15', description: null, marque: 'Samsung', categorie: 'Téléphones', statut: 'actif', creeLe: '2026-10-13T09:00:00.000Z' }
const PDF = Buffer.from('%PDF-1.7\nfiche\n%%EOF')
const CLE = `marketplace/${PRODUIT}/fiche-technique/abc.pdf`

test('le marchand écrit la description courte et la fiche technique, et joint le PDF', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      produit: { id: PRODUIT, nom: produit.nom, slug: produit.slug, metaTitre: null, metaDescription: null, descriptionCourte: null, ficheTechnique: null, ficheTechniquePdfUrl: null, ficheTechniquePdfCle: null },
      images: [], revisionOuverte: null, revisions: [],
    })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/fiche-technique$`), { cle: CLE, url: `https://cdn.test/documents/${CLE}`, appliquee: false })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu/revisions$`), { id: 'rc-1', numero: 1, statut: 'soumise' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Fiche et photos' }).click()

  await page.getByRole('textbox', { name: /^Description courte/ }).fill('Smartphone endurant : batterie 5 000 mAh, 128 Go, double SIM.')
  await page.getByRole('textbox', { name: /^Fiche technique/ }).fill('Écran : 6,5 pouces\nBatterie : 5 000 mAh')
  await page.locator('input[type=file][accept="application/pdf"]').setInputFiles({ name: 'fiche.pdf', mimeType: 'application/pdf', buffer: PDF })
  await expect(page.getByText('PDF déposé. Soumettez la fiche pour le publier.')).toBeVisible()
  await expect(page.getByTestId('fiche-pdf')).toHaveAttribute('href', `https://cdn.test/documents/${CLE}`)

  await page.getByRole('button', { name: 'Soumettre la fiche à validation' }).click()
  await expect(page.getByText(/Elle sera publiée après validation/)).toBeVisible()
  expect(api.appelsVers('POST', /\/contenu\/revisions$/)[0]!.corps).toEqual({
    descriptionCourte: 'Smartphone endurant : batterie 5 000 mAh, 128 Go, double SIM.',
    ficheTechnique: 'Écran : 6,5 pouces\nBatterie : 5 000 mAh',
    ficheTechniquePdfCle: CLE,
    images: [],
  })
})

test('une proposition de produit part avec sa description courte, sa fiche technique et son PDF', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), { id: 'nouveau', statut: 'soumis' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/fiche-technique$`), { cle: 'marketplace/nouveau/fiche-technique/x.pdf', url: 'https://cdn.test/x.pdf', appliquee: true })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await page.getByLabel(/^Description courte/).fill('Le A25 : écran AMOLED, 5G et quatre ans de mises à jour.')
  await page.getByLabel(/^Fiche technique Une caractéristique/).fill('Écran : AMOLED 6,5 pouces')
  await page.getByLabel(/^Fiche technique en PDF/).setInputFiles({ name: 'a25.pdf', mimeType: 'application/pdf', buffer: PDF })
  await page.getByRole('button', { name: 'Envoyer à la modération' }).click()
  await expect(page.getByText('Produit envoyé à la modération.')).toBeVisible()

  expect(api.appelsVers('POST', /propositions-produits$/)[0]!.corps).toMatchObject({
    nom: 'Samsung Galaxy A25', descriptionCourte: 'Le A25 : écran AMOLED, 5G et quatre ans de mises à jour.', ficheTechnique: 'Écran : AMOLED 6,5 pouces',
  })
  expect(api.appelsVers('POST', /\/produits\/nouveau\/fiche-technique$/)).toHaveLength(1)
})

test('l’offre porte son minimum de commande, et la variante reprend les attributs de la catégorie', async ({ page }) => {
  const offre = {
    id: OFFRE, referenceVendeur: 'A15-128', statut: 'publiee', prixFcfa: 149_000, libelleVariante: '128 Go', attributsVariante: { Capacité: '128 Go' }, ordreVariante: 0,
    quantiteMinimale: 5, verifieParKatiLe: '2026-10-16T10:00:00.000Z',
    produit: { id: PRODUIT, nom: 'Samsung Galaxy A15', slug: 'galaxy-a15', statut: 'actif', proposeParBoutiqueId: B, attributsVariante: ['Capacité', 'Couleur'] },
    stock: { quantite: 50, quantiteReservee: 0 }, revisions: [],
  }
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres$`), { id: 'offre', statut: 'brouillon' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Offres', exact: true }).click()
  await expect(page.getByText('Minimum 5', { exact: false })).toBeVisible()
  await expect(page.getByText('Vérifié par KatiHub')).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter une variante' }).click()
  const variante = page.getByRole('dialog', { name: 'Ajouter une variante' })
  await expect(variante.getByLabel('Nom de l’attribut 1')).toHaveValue('Capacité')
  await expect(variante.getByLabel('Nom de l’attribut 2')).toHaveValue('Couleur')
  await variante.getByRole('button', { name: 'Annuler' }).click()

  await page.getByRole('combobox', { name: /^Produit/ }).selectOption({ label: 'Samsung Galaxy A15' })
  await page.getByLabel('Référence vendeur').fill('A15-CARTON')
  await page.getByLabel('Titre de l’offre').fill('Samsung Galaxy A15, carton de 10')
  await page.getByLabel('Prix FCFA').fill('140000')
  await page.getByLabel(/^Minimum de commande/).fill('10')
  await page.getByRole('button', { name: 'Créer et soumettre l’offre' }).click()
  await expect(page.getByText('Offre envoyée à la modération.')).toBeVisible()
  expect(api.appelsVers('POST', /\/offres$/)[0]!.corps).toMatchObject({ referenceVendeur: 'A15-CARTON', quantiteMinimale: 10 })
})

test('une boutique sans suivi de stock le règle, puis refuse une ligne qu’elle ne peut pas fournir', async ({ page }) => {
  let refusee = false
  const commandes = () => ({
    total: 1, suiviStock: false,
    elements: [{
      id: 'sc1', reference: 'CM-ABC123-1', statut: 'nouvelle', modeLivraison: 'katihub', totalNetProduits: 101_000, netVendeurPrevu: 90_900, creeLe: '2026-10-16T09:00:00.000Z',
      lignesRefusables: true,
      lignes: [
        { id: 'l1', produitNomCapture: 'Câble USB-C', quantite: 1, totalNetFcfa: 1_000, quantiteRefusee: 0, refus: null },
        { id: 'l2', produitNomCapture: 'Écran 24 pouces', quantite: 2, totalNetFcfa: 100_000, quantiteRefusee: refusee ? 2 : 0, refus: refusee ? { motif: 'Écran épuisé chez notre fournisseur', creeLe: '2026-10-16T10:00:00.000Z' } : null },
      ],
    }],
  })
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${B}$`), { ...espaceBoutique(), suiviStock: true })
    .quand('PATCH', new RegExp(`^/vendeurs/mes-boutiques/${B}$`), { ...espaceBoutique(), suiviStock: false })
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${B}/commandes`), commandes)
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/lignes/l2/refus$`), () => { refusee = true; return { id: 'r1', remboursementDuFcfa: 9_100 } })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Paramètres boutique' }).click()
  await page.getByLabel('Je tiens mon stock à jour sur KatiHub').uncheck()
  await expect(page.getByText(/Vos offres restent toujours commandables/)).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible()
  expect(api.appelsVers('PATCH', new RegExp(`/vendeurs/mes-boutiques/${B}$`))[0]!.corps).toMatchObject({ suiviStock: false })

  await page.getByRole('button', { name: 'Commandes', exact: true }).click()
  const commande = page.getByTestId('commande-CM-ABC123-1')
  await commande.getByRole('button', { name: 'Article indisponible' }).nth(1).click()
  const fenetre = page.getByRole('dialog', { name: 'Refuser la ligne' })
  await expect(fenetre).toContainText('Écran 24 pouces')
  await fenetre.getByLabel('Motif, lu par le client').fill('Écran épuisé chez notre fournisseur')
  await fenetre.getByRole('button', { name: 'Refuser la ligne' }).click()
  await expect(fenetre).toBeHidden()
  await expect(page.getByText('Écran 24 pouces est retiré de la commande CM-ABC123-1. Le client est prévenu.')).toBeVisible()
  await expect(commande.getByText('Refusée : Écran épuisé chez notre fournisseur')).toBeVisible()
  expect(api.appelsVers('POST', /\/lignes\/l2\/refus$/)[0]!.corps).toEqual({ motif: 'Écran épuisé chez notre fournisseur' })
})
