import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { espaceBoutique, IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LE MARCHAND ADMINISTRE SON PRODUIT : photos, referencement, variantes et prix.
 * Depuis le 7 novembre 2026, un vendeur actif publie tout de suite ; un vendeur
 * sous surveillance passe encore par la validation. On verifie ce que l'ecran
 * envoie au backend et ce qu'il annonce au marchand.
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

// Une photo deposee, puis publiee : un produit se met en ligne avec au moins une image (9 novembre 2026).
const IMAGE_DEPOSEE = { id: PHOTO, url: PIXEL, texteAlternatif: null, ordre: 0, statut: 'proposee', tailleOctets: 68 }
const IMAGE_PUBLIEE = { ...IMAGE_DEPOSEE, texteAlternatif: 'Vue de face', statut: 'publiee' }
const ajouterPhoto = (page: import('@playwright/test').Page) =>
  page.locator('main[data-seller-workspace] input[type=file][accept^="image"]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(PIXEL.split(',')[1]!, 'base64') })

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
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu/revisions$`), { id: 'rc-1', numero: 1, statut: 'approuvee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier la fiche' }).click()
  await expect(page.getByRole('heading', { name: 'Samsung Galaxy A15' })).toBeVisible()
  await expect(page.getByTestId('conseil-photos')).toContainText('1 000 × 1 000 px')

  await page.locator('main[data-seller-workspace] input[type=file][accept^="image"]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(PIXEL.split(',')[1]!, 'base64') })
  await expect(page.getByTestId(`fiche-photo-${PHOTO}`)).toBeVisible()
  await expect(page.getByText('Image principale · nouvelle')).toBeVisible()
  await page.getByLabel('Texte alternatif').fill('Vue de face, coloris noir')

  await page.getByLabel('Meta title').fill('Samsung Galaxy A15 128 Go au meilleur prix')
  const description = 'Le Galaxy A15 128 Go, neuf et garanti 12 mois, livré à Douala sous 48 h par KatiHub.'
  await page.getByLabel('Meta description').fill(description)
  await expect(page.getByLabel('Aperçu dans les résultats de recherche')).toContainText('Samsung Galaxy A15 128 Go au meilleur prix')

  await page.getByRole('button', { name: 'Enregistrer et mettre en ligne' }).click()
  await expect(page.getByText('Fiche enregistrée : elle est en ligne.')).toBeVisible()

  const envoi = api.appelsVers('POST', /\/contenu\/revisions$/)
  expect(envoi).toHaveLength(1)
  expect(envoi[0]!.corps).toEqual({
    metaTitre: 'Samsung Galaxy A15 128 Go au meilleur prix',
    metaDescription: description,
    images: [{ imageId: PHOTO, texteAlternatif: 'Vue de face, coloris noir' }],
  })
})

test('le marchand peut revenir à la liste après avoir ouvert une fiche produit', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      produit: { id: PRODUIT, nom: produit.nom, slug: produit.slug, metaTitre: null, metaDescription: null },
      images: [], revisionOuverte: null, revisions: [],
    })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier la fiche' }).click()
  await expect(page.getByRole('heading', { name: 'Samsung Galaxy A15' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour aux produits' }).click()
  await expect(page.getByRole('heading', { name: 'Produits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifier la fiche' })).toBeVisible()
})

test('le marchand crée une variante depuis la fiche produit, sans onglet Offres', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      produit: { id: PRODUIT, nom: produit.nom, slug: produit.slug, marque: 'Samsung', description: null, metaTitre: null, metaDescription: null },
      images: [], revisionOuverte: null, revisions: [],
    })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/variantes$`), { offre: { id: 'nouvelle', statut: 'publiee' } })

  await page.goto('/espace-vendeur')
  // Le prix se gere depuis Produits (7 novembre 2026) : plus d'onglet Offres.
  await expect(page.getByRole('button', { name: 'Offres', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier la fiche' }).click()

  await page.getByTestId('fiche-ajouter-variante').click()
  const variante = page.getByRole('dialog', { name: 'Ajouter une variante' })
  await variante.getByLabel('Nom de l’attribut 1').fill('Capacité')
  await variante.getByLabel('Valeur de l’attribut 1').fill('256 Go')
  await variante.getByLabel('Nom de l’attribut 2').fill('Couleur')
  await variante.getByLabel('Valeur de l’attribut 2').fill('Bleu')
  await variante.getByLabel('Référence vendeur').fill('A15-256-BLEU')
  await variante.getByLabel('Prix FCFA').fill('179000')
  await variante.getByRole('button', { name: 'Soumettre la variante' }).click()
  await expect(variante).toBeHidden()

  expect(api.appelsVers('POST', /\/variantes$/)[0]!.corps).toMatchObject({
    libelleVariante: '256 Go / Bleu', attributsVariante: { Capacité: '256 Go', Couleur: 'Bleu' },
    referenceVendeur: 'A15-256-BLEU', prixFcfa: 179_000,
  })
})

test('le marchand classe son produit dans une catégorie KatiHub et voit la garantie minimale', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'actif' }, offres: [] })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/images$`), IMAGE_DEPOSEE)
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/contenu/revisions$`), { id: 'rc-n', numero: 1, statut: 'approuvee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await ajouterPhoto(page)
  // Le prix part avec la fiche (6 novembre 2026).
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('button', { name: 'Mettre en ligne' }).click()
  // Le navigateur bloque l'envoi tant que la sous-categorie manque.
  expect(await page.getByRole('combobox', { name: /^Sous-catégorie/ }).evaluate((champ: HTMLSelectElement) => champ.validity.valueMissing)).toBe(true)
  expect(api.appelsVers('POST', /produits-complets$/)).toHaveLength(0)

  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléviseurs' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('2 ans')
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('1 an')
  await page.getByRole('button', { name: 'Mettre en ligne' }).click()
  await expect(page.getByText('Produit en ligne : il est visible sur votre boutique.')).toBeVisible()

  expect(api.appelsVers('POST', /produits-complets$/)[0]!.corps).toEqual({
    produit: { nom: 'Samsung Galaxy A25', slug: 'samsung-galaxy-a25', categorieId: '00000000-0000-4000-8000-000000000402' },
    vente: { etat: 'neuf', garantieMois: 12, delaiMaxJours: 2 },
    variantes: [{ referenceVendeur: 'A25-128', prixFcfa: 189_000, quantiteMinimale: 1, statutStock: 'en_stock' }],
  })
})

test('sans photo, le produit ne part pas et le vendeur sait pourquoi (9 novembre 2026)', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'actif' }, offres: [] })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/images$`), IMAGE_DEPOSEE)
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/contenu/revisions$`), { id: 'rc-n', numero: 1, statut: 'approuvee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await page.getByRole('button', { name: 'Mettre en ligne' }).click()
  await expect(page.getByText('Ajoutez au moins une photo du produit : sans image, il ne peut pas être mis en ligne.')).toBeVisible()
  expect(api.appelsVers('POST', /produits-complets$/)).toHaveLength(0)
})

test('le marchand crée un produit complet : deux variantes avec leur prix, leur statut et la garantie', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'actif' }, offres: [] })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/images$`), IMAGE_DEPOSEE)
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/contenu/revisions$`), { id: 'rc-n', numero: 1, statut: 'approuvee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await ajouterPhoto(page)
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByLabel('Prix barré de la variante 1').fill('199000')
  await page.getByTestId('ajouter-variante').click()
  await page.getByLabel('Référence de la variante 2').fill('A25-256')
  await page.getByLabel('Prix de la variante 2').fill('219000')
  await page.getByLabel('Statut du stock de la variante 2').selectOption('reapprovisionnement')

  // Le bouton est sous le formulaire, apres le referencement (9 novembre 2026), et il est le seul.
  await expect(page.getByRole('button', { name: 'Mettre en ligne' })).toHaveCount(1)
  const referencement = await page.locator('legend', { hasText: 'Référencement' }).boundingBox()
  const bouton = await page.getByRole('button', { name: 'Mettre en ligne' }).boundingBox()
  expect(bouton!.y).toBeGreaterThan(referencement!.y)

  // Deux variantes : chacune doit porter un nom.
  await page.getByRole('button', { name: 'Mettre en ligne' }).click()
  await expect(page.getByText('Donnez un nom à chaque variante (ex. 128 Go / Noir).')).toBeVisible()
  expect(api.appelsVers('POST', /produits-complets$/)).toHaveLength(0)

  await page.getByLabel('Nom de la variante 1').fill('128 Go')
  await page.getByLabel('Nom de la variante 2').fill('256 Go')
  await page.getByLabel('Garantie (mois)').fill('24')
  await expect(page.getByText('189 000 FCFA').first()).toBeVisible()
  await page.getByRole('button', { name: 'Mettre en ligne' }).click()
  await expect(page.getByText('Produit en ligne : il est visible sur votre boutique.')).toBeVisible()
  expect(api.appelsVers('POST', /produits-complets$/)[0]!.corps).toMatchObject({
    vente: { etat: 'neuf', garantieMois: 24, delaiMaxJours: 2 },
    variantes: [
      { libelleVariante: '128 Go', referenceVendeur: 'A25-128', prixFcfa: 189_000, prixReferenceFcfa: 199_000, quantiteMinimale: 1, statutStock: 'en_stock' },
      { libelleVariante: '256 Go', referenceVendeur: 'A25-256', prixFcfa: 219_000, quantiteMinimale: 1, statutStock: 'reapprovisionnement' },
    ],
  })
})

test('la création reflète instantanément les données et la photo dans l’aperçu client', async ({ page }) => {
  api = await espaceVendeur(page, [])

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25 5G')
  await page.getByLabel('Marque').fill('Samsung')
  await page.getByLabel('Description courte').fill('Un smartphone 5G endurant avec un écran lumineux et 128 Go de stockage.')
  await page.locator('main[data-seller-workspace] input[type=file][accept^="image"]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(PIXEL.split(',')[1]!, 'base64') })

  const apercu = page.getByRole('complementary').filter({ hasText: 'Aperçu client en direct' })
  await expect(apercu).toContainText('Samsung Galaxy A25 5G')
  await expect(apercu).toContainText('Samsung')
  await expect(page.getByAltText('Aperçu principal du produit')).toBeVisible()
  // Sans prix saisi, l'aperçu le demande ; le prix part avec la fiche (6 novembre 2026).
  await expect(page.getByText('Indiquez un prix')).toBeVisible()
  if (process.env.CAPTURE_SELLER_PRODUCTS) await page.screenshot({ path: 'test-results/katihub-ajout-produit.png', fullPage: true })
})

test('le copilote KatiHub génère toute la fiche, signale les faits à vérifier et permet de revenir en arrière', async ({ page }) => {
  api = await espaceVendeur(page, [])
  await page.route('**/api/marchand/assistant-produit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ suggestion: {
        nom: 'HP Omen 16-an0008tx', marque: 'HP', categorieId: '00000000-0000-4000-8000-000000000402',
        descriptionCourte: 'Ordinateur portable HP Omen avec 16 Go de mémoire et un SSD de 1 To.',
        description: 'Conçu pour les usages exigeants, ce HP Omen associe une mémoire de 16 Go à un stockage SSD de 1 To.\n\nLes caractéristiques non fournies restent à confirmer avant publication.',
        ficheTechnique: 'Mémoire : 16 Go\nStockage : SSD 1 To',
        metaTitre: 'HP Omen 16-an0008tx 16 Go et SSD 1 To',
        metaDescription: 'Découvrez le HP Omen 16-an0008tx avec 16 Go de mémoire et un SSD de 1 To sur KatiHub.',
        pointsAValider: ['Confirmer le processeur exact et la taille de l’écran.'],
      } }),
    })
  })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Informations source à respecter').fill('HP Omen 16-an0008tx, mémoire 16 Go, stockage SSD 1 To.')
  await page.getByRole('button', { name: 'Générer toute la fiche' }).click()

  await expect(page.getByTestId('assistant-produit-resultat')).toContainText('8 champs proposés et appliqués')
  await expect(page.getByTestId('assistant-produit-resultat')).toContainText('Confirmer le processeur exact')
  await expect(page.getByLabel('Nom du produit')).toHaveValue('HP Omen 16-an0008tx')
  await expect(page.getByLabel('Marque')).toHaveValue('HP')
  await expect(page.getByLabel('Meta title')).toHaveValue('HP Omen 16-an0008tx 16 Go et SSD 1 To')
  await expect(page.getByRole('complementary').filter({ hasText: 'Aperçu client en direct' })).toContainText('HP Omen 16-an0008tx')
  if (process.env.CAPTURE_SELLER_PRODUCTS) await page.screenshot({ path: 'test-results/katihub-assistant-produit.png', fullPage: true })

  await page.getByRole('button', { name: 'Annuler l’application' }).click()
  await expect(page.getByLabel('Nom du produit')).toHaveValue('')
  await expect(page.getByTestId('assistant-produit-resultat')).toHaveCount(0)
})

test('le marchand modifie prix, statut du stock et minimum en lot depuis Produits', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/statut-stock$`), { id: OFFRE, statutStock: 'reapprovisionnement' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/revisions$`), { id: 'rev-lot', statut: 'soumise' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/prix$`), { id: OFFRE, prixFcfa: 139_000, prixReferenceFcfa: null, statut: 'publiee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modification en lot' }).click()
  await page.getByLabel('Prix de Samsung Galaxy A15').fill('139000')
  await page.getByLabel('Statut du stock de Samsung Galaxy A15').selectOption('reapprovisionnement')
  await page.getByLabel('Minimum de Samsung Galaxy A15').fill('3')
  await expect(page.getByText('3 modification(s) non enregistrée(s)')).toBeVisible()
  if (process.env.CAPTURE_SELLER_PRODUCTS) await page.screenshot({ path: 'test-results/katihub-produits-lot.png', fullPage: true })
  await page.getByRole('button', { name: 'Enregistrer 3 modification(s)' }).click()
  await expect(page.getByText(/1 offre\(s\) enregistrée\(s\)/)).toBeVisible()

  expect(api.appelsVers('POST', /\/statut-stock$/)[0]!.corps).toEqual({ statutStock: 'reapprovisionnement' })
  // Le prix est publie tout de suite ; le minimum passe en validation.
  expect(api.appelsVers('POST', /\/prix$/)[0]!.corps).toEqual({ prixFcfa: 139_000, prixReferenceFcfa: null })
  expect(api.appelsVers('POST', /\/revisions$/)[0]!.corps).toMatchObject({ prixFcfa: 139_000, quantiteMinimale: 3 })
})

test('le marchand range son produit dans trois catégories, publiées sans validation', async ({ page }) => {
  const famille = (id: string, nom: string, sous: [string, string][]) => ({ id, nom, slug: id, garantie: { mois: 0, unite: 'mois', heritee: false, libelle: 'aucune' },
    sousCategories: sous.map(([sid, snom]) => ({ id: sid, nom: snom, slug: sid, garantie: { mois: 0, unite: 'mois', heritee: true, libelle: 'aucune' }, sousCategories: [] })) })
  const T = '00000000-0000-4000-8000-0000000003a1'; const A = '00000000-0000-4000-8000-0000000003a2'; const E = '00000000-0000-4000-8000-0000000003a3'
  api = (await espaceVendeur(page, []))
    .quand('GET', /^\/marketplace\/categories$/, [famille('f1', 'Électronique', [[T, 'Téléphones'], [A, 'Accessoires téléphonie']]), famille(E, 'Électricité', [])])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [{ ...produit, categorieId: T, categoriesSupplementaires: [] }])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/categories$`), { id: PRODUIT, categorieId: T, categoriesSupplementaires: [A, E] })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByTestId('categories-galaxy-a15').click()
  const fenetre = page.getByRole('dialog', { name: /Catégories de « Samsung Galaxy A15 »/ })
  await expect(fenetre.getByTestId('categorie-principale')).toHaveValue(T)
  await expect(fenetre.getByTestId('autre-categorie-2')).toBeDisabled()
  await fenetre.getByTestId('autre-categorie-1').selectOption(A)
  await fenetre.getByTestId('autre-categorie-2').selectOption(E)
  await fenetre.getByRole('button', { name: 'Enregistrer les catégories' }).click()
  await expect(page.getByText('Catégories enregistrées et publiées.')).toBeVisible()
  expect(api.appelsVers('POST', /\/categories$/)[0]!.corps).toEqual({ categorieId: T, categoriesSupplementaires: [A, E] })
})

test('un produit en ligne sans prix le reçoit sur sa ligne, avec la garantie minimale de sa catégorie', async ({ page }) => {
  const classe = { ...produit, categorieDetail: { id: 'c', nom: 'Téléphones', slug: 'electronique-telephones', parent: { id: 'p', nom: 'Électronique', slug: 'electronique' }, garantieMinimaleMois: 12, garantie: '1 an' } }
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [classe])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres$`), { offre: { id: 'offre', statut: 'publiee' } })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  const ligne = page.getByTestId('ajouter-prix-galaxy-a15')
  await expect(ligne).toContainText('Sans prix : ajoutez un prix')
  await ligne.getByLabel('Prix de Samsung Galaxy A15 en FCFA').fill('149 000')
  await ligne.getByRole('button', { name: 'Mettre en vente' }).click()
  await expect(page.getByText('Prix enregistré : « Samsung Galaxy A15 » est en ligne.')).toBeVisible()
  expect(api.appelsVers('POST', /\/offres$/)[0]!.corps).toEqual({
    produitId: PRODUIT, referenceVendeur: 'galaxy-a15', titre: 'Samsung Galaxy A15', prixFcfa: 149_000, etat: 'neuf', garantieMois: 12,
    modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 2, quantiteMinimale: 1,
  })
})

test('un vendeur sous surveillance soumet encore son produit à la validation', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${B}$`), { ...espaceBoutique(), vendeur: { ...espaceBoutique().vendeur, statut: 'sous_surveillance' } })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'soumis' }, offres: [] })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/images$`), IMAGE_DEPOSEE)
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/nouveau/contenu/revisions$`), { id: 'rc-n', numero: 1, statut: 'soumise' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await expect(page.getByText('Ce qui sera contrôlé')).toBeVisible()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await ajouterPhoto(page)
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await page.getByRole('button', { name: 'Soumettre à la validation' }).click()
  await expect(page.getByText('Produit envoyé à la validation de KatiMarket. Vous pouvez suivre son statut dans la liste.')).toBeVisible()
})

test('la fiche complète publie prix, délai et nouveau nom tout de suite', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      produit: { id: PRODUIT, nom: produit.nom, slug: produit.slug, marque: 'Samsung', description: 'Un téléphone fiable.', metaTitre: null, metaDescription: null },
      images: [IMAGE_PUBLIEE], revisionOuverte: null, revisions: [],
    })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/prix$`), { id: OFFRE, prixFcfa: 139_000, prixReferenceFcfa: 149_000, statut: 'publiee' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/conditions$`), { id: OFFRE, delaiMaxJours: 1 })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu/revisions$`), { id: 'rc-1', numero: 1, statut: 'approuvee' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier la fiche' }).click()
  for (const titre of ['Général', 'Catégories', 'Prix et variantes', 'Vente et livraison']) await expect(page.getByRole('heading', { name: titre, exact: true })).toBeVisible()
  await expect(page.getByTestId('fiche-marque')).toHaveValue('Samsung')
  // Sur mobile, la fiche n'elargit pas la page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)

  // Publie tout de suite : le prix et le prix barre de la variante.
  await page.getByLabel('Prix de 128 Go', { exact: true }).fill('139000')
  await page.getByLabel('Prix barré de 128 Go').fill('149000')
  await page.getByTestId(`fiche-enregistrer-${OFFRE}`).click()
  await expect(page.getByText('128 Go : enregistré et publié.')).toBeVisible()
  expect(api.appelsVers('POST', /\/prix$/)[0]!.corps).toEqual({ prixFcfa: 139_000, prixReferenceFcfa: 149_000 })

  // Le delai, pour toutes les variantes.
  await page.getByLabel(/Délai de préparation/).selectOption('1')
  await page.getByRole('button', { name: 'Publier le délai' }).click()
  await expect(page.getByText('Délai de préparation publié.')).toBeVisible()
  expect(api.appelsVers('POST', /\/conditions$/)[0]!.corps).toEqual({ delaiMaxJours: 1 })

  // Seul le nom change, lui seul part, et il est en ligne aussitot (7 novembre 2026).
  await page.getByTestId('fiche-nom').fill('Samsung Galaxy A15 4G')
  await page.getByRole('button', { name: 'Enregistrer et mettre en ligne' }).click()
  await expect(page.getByText('Fiche enregistrée : elle est en ligne.')).toBeVisible()
  expect(api.appelsVers('POST', /\/contenu\/revisions$/)[0]!.corps).toEqual({ nom: 'Samsung Galaxy A15 4G', images: [{ imageId: PHOTO, texteAlternatif: 'Vue de face' }] })
})

test('sur téléphone, la fiche produit tient dans l’écran malgré une catégorie au nom long', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const garantie = { mois: 12, unite: 'mois', heritee: false, libelle: '12 mois' }
  api = (await espaceVendeur(page, []))
    .quand('GET', /^\/marketplace\/categories$/, [{
      id: '00000000-0000-4000-8000-000000000501', nom: 'Sécurité & Surveillance', slug: 'securite-surveillance', garantie,
      sousCategories: [{ id: '00000000-0000-4000-8000-000000000502', nom: 'Contrôle d’accès, pointage et lecteurs biométriques professionnels', slug: 'securite-controle-acces', garantie }],
    }])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [{ ...offre, referenceVendeur: 'NOWTECH-LEGACY-60533' }])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/produits/${PRODUIT}/contenu$`), {
      // Une adresse NowTech reelle : d'un seul tenant, elle elargissait toute la fiche.
      produit: { id: PRODUIT, nom: produit.nom, slug: 'nowtech-60533-laptop-hp-omen-16-core-i7-13700hx-16go-ram-1to-ssd-rtx-4060-8go-ecran-16-1-165hz', marque: 'Samsung', description: null, metaTitre: null, metaDescription: null },
      images: [], revisionOuverte: null, revisions: [],
    })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier la fiche' }).click()
  await expect(page.getByTestId('fiche-categorie-principale')).toBeVisible()
  // L'espace vendeur masque ce qui deborde : on mesure la fiche elle-meme. Le tableau
  // des variantes defile dans son propre cadre et ne compte pas.
  const fiche = await page.locator('section[aria-labelledby="fiche-titre"]').evaluate((el) => ({ contenu: el.scrollWidth, visible: el.clientWidth }))
  expect(fiche.contenu).toBeLessThanOrEqual(fiche.visible + 1)
})
