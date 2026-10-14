import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LE MARCHAND ADMINISTRE SON PRODUIT : photos, referencement, variantes et prix.
 * Tout part en moderation ; on verifie ce que l'ecran envoie au backend.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B = IDS.boutique
const PRODUIT = '00000000-0000-4000-8000-000000000201'
const OFFRE = '00000000-0000-4000-8000-000000000202'
const PHOTO = '00000000-0000-4000-8000-00000000000a'
// Un PNG d'un pixel : l'apercu s'affiche sans aucun appel reseau.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='

const produit = { id: PRODUIT, slug: 'galaxy-a15', nom: 'Samsung Galaxy A15', description: null, marque: 'Samsung', categorie: 'Téléphones', statut: 'actif', creeLe: '2026-10-13T09:00:00.000Z' }
const revision = {
  id: 'rev-1', statut: 'approuvee', numero: 1, titre: 'Samsung Galaxy A15 128 Go', description: null, prixFcfa: 149_000, prixReferenceFcfa: null,
  etat: 'neuf', garantieMois: 12, modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 2, libelleVariante: '128 Go', attributsVariante: { Capacité: '128 Go' },
}
const offre = {
  id: OFFRE, referenceVendeur: 'A15-128', statut: 'publiee', prixFcfa: 149_000, libelleVariante: '128 Go', attributsVariante: { Capacité: '128 Go' }, ordreVariante: 0,
  produit: { id: PRODUIT, nom: 'Samsung Galaxy A15', slug: 'galaxy-a15', statut: 'actif', proposeParBoutiqueId: B },
  stock: { quantite: 5, quantiteReservee: 1 }, revisions: [revision],
}

test('le marchand ajoute une photo, écrit son référencement et soumet la fiche', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      produit: { id: PRODUIT, nom: produit.nom, slug: produit.slug, metaTitre: null, metaDescription: null },
      images: [], revisionOuverte: null, revisions: [],
    })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/images$`), { id: PHOTO, url: PIXEL, texteAlternatif: null, ordre: 0, statut: 'proposee', tailleOctets: 68 })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu/revisions$`), { id: 'rc-1', numero: 1, statut: 'soumise' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Photos et référencement' }).click()
  await expect(page.getByRole('heading', { name: 'Samsung Galaxy A15' })).toBeVisible()

  await page.locator('input[type=file]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(PIXEL.split(',')[1]!, 'base64') })
  await expect(page.getByTestId(`fiche-photo-${PHOTO}`)).toBeVisible()
  await expect(page.getByText('Image principale · nouvelle')).toBeVisible()
  await page.getByLabel('Texte alternatif').fill('Vue de face, coloris noir')

  await page.getByLabel('Meta title').fill('Samsung Galaxy A15 128 Go au meilleur prix')
  const description = 'Le Galaxy A15 128 Go, neuf et garanti 12 mois, livré à Douala sous 48 h par KatiHub.'
  await page.getByLabel('Meta description').fill(description)
  await expect(page.getByLabel('Aperçu dans les résultats de recherche')).toContainText('Samsung Galaxy A15 128 Go au meilleur prix')

  await page.getByRole('button', { name: 'Soumettre la fiche à validation' }).click()
  await expect(page.getByText(/Elle sera publiée après validation/)).toBeVisible()

  const envoi = api.appelsVers('POST', /\/contenu\/revisions$/)
  expect(envoi).toHaveLength(1)
  expect(envoi[0]!.corps).toEqual({
    metaTitre: 'Samsung Galaxy A15 128 Go au meilleur prix',
    metaDescription: description,
    images: [{ imageId: PHOTO, texteAlternatif: 'Vue de face, coloris noir' }],
  })
})

test('le marchand crée une variante avec son prix, puis change le prix d’une offre', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/variantes$`), { id: 'nouvelle', statut: 'brouillon' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/revisions$`), { id: 'rev-2', statut: 'soumise' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Offres', exact: true }).click()
  await expect(page.getByText('— 128 Go')).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter une variante' }).click()
  const variante = page.getByRole('dialog', { name: 'Ajouter une variante' })
  await variante.getByLabel('Nom de l’attribut 1').fill('Capacité')
  await variante.getByLabel('Valeur de l’attribut 1').fill('256 Go')
  await variante.getByLabel('Nom de l’attribut 2').fill('Couleur')
  await variante.getByLabel('Valeur de l’attribut 2').fill('Bleu')
  await expect(variante.getByLabel('Nom de l’attribut 4')).toHaveCount(0)
  await variante.getByRole('button', { name: '+ Ajouter un attribut' }).click()
  await variante.getByLabel('Nom de l’attribut 4').fill('Garantie fabricant')
  await variante.getByLabel('Valeur de l’attribut 4').fill('2 ans')
  await variante.getByLabel('Référence vendeur').fill('A15-256-BLEU')
  await variante.getByLabel('Prix FCFA').fill('179000')
  await variante.getByLabel('Stock initial').fill('3')
  await variante.getByRole('button', { name: 'Soumettre la variante' }).click()
  await expect(variante).toBeHidden()

  expect(api.appelsVers('POST', /\/variantes$/)[0]!.corps).toEqual({
    libelleVariante: '256 Go / Bleu / 2 ans', attributsVariante: { Capacité: '256 Go', Couleur: 'Bleu', 'Garantie fabricant': '2 ans' },
    referenceVendeur: 'A15-256-BLEU', prixFcfa: 179_000, quantiteInitiale: 3,
  })

  await page.getByRole('button', { name: 'Modifier le prix' }).click()
  const prix = page.getByRole('dialog', { name: 'Modifier le prix' })
  await prix.getByLabel('Prix FCFA').fill('139000')
  await prix.getByLabel('Prix barré').fill('149000')
  await prix.getByRole('button', { name: 'Soumettre le nouveau prix' }).click()
  await expect(prix).toBeHidden()

  expect(api.appelsVers('POST', /\/revisions$/)[0]!.corps).toMatchObject({
    titre: 'Samsung Galaxy A15 128 Go', prixFcfa: 139_000, prixReferenceFcfa: 149_000, etat: 'neuf', garantieMois: 12,
    modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 2, libelleVariante: '128 Go', attributsVariante: { Capacité: '128 Go' },
  })
})

test('le marchand classe son produit dans une catégorie KatiHub et voit la garantie minimale', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), { id: 'nouveau', statut: 'soumis' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('button', { name: 'Envoyer à la modération' }).click()
  // Le navigateur bloque l'envoi tant que la sous-categorie manque.
  expect(await page.getByRole('combobox', { name: /^Sous-catégorie/ }).evaluate((champ: HTMLSelectElement) => champ.validity.valueMissing)).toBe(true)
  expect(api.appelsVers('POST', /propositions-produits$/)).toHaveLength(0)

  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléviseurs' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('2 ans')
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('1 an')
  await page.getByRole('button', { name: 'Envoyer à la modération' }).click()
  await expect(page.getByText('Produit envoyé à la modération.')).toBeVisible()

  expect(api.appelsVers('POST', /propositions-produits$/)[0]!.corps).toEqual({
    nom: 'Samsung Galaxy A25', slug: 'samsung-galaxy-a25', categorieId: '00000000-0000-4000-8000-000000000402',
  })
})

test('l’offre part de la garantie minimale de la catégorie et ne peut pas descendre en dessous', async ({ page }) => {
  const classe = { ...produit, categorieDetail: { id: 'c', nom: 'Téléphones', slug: 'electronique-telephones', parent: { id: 'p', nom: 'Électronique', slug: 'electronique' }, garantieMinimaleMois: 12, garantie: '1 an' } }
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [classe])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres$`), { id: 'offre', statut: 'brouillon' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await expect(page.getByText('Électronique › Téléphones')).toBeVisible()
  await page.getByRole('button', { name: 'Offres', exact: true }).click()

  await page.getByRole('combobox', { name: /^Produit/ }).selectOption({ label: 'Samsung Galaxy A15' })
  const garantie = page.getByLabel('Garantie en mois')
  await expect(garantie).toHaveValue('12')
  await expect(page.getByText('Minimum de la catégorie : 1 an')).toBeVisible()
  await page.getByLabel('Référence vendeur').fill('A15-NOIR')
  await page.getByLabel('Titre de l’offre').fill('Samsung Galaxy A15 128 Go')
  await page.getByLabel('Prix FCFA').fill('149000')
  await garantie.fill('6')
  await page.getByRole('button', { name: 'Créer et soumettre l’offre' }).click()
  expect(await garantie.evaluate((champ: HTMLInputElement) => champ.validity.rangeUnderflow)).toBe(true)
  expect(api.appelsVers('POST', /\/offres$/)).toHaveLength(0)

  await garantie.fill('24')
  await page.getByRole('button', { name: 'Créer et soumettre l’offre' }).click()
  await expect(page.getByText('Offre envoyée à la modération.')).toBeVisible()
  expect(api.appelsVers('POST', /\/offres$/)[0]!.corps).toMatchObject({ produitId: PRODUIT, garantieMois: 24 })
})
