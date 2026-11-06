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
  await page.getByRole('button', { name: 'Fiche et photos' }).click()
  await expect(page.getByRole('heading', { name: 'Samsung Galaxy A15' })).toBeVisible()

  await page.locator('main[data-seller-workspace] input[type=file][accept^="image"]').setInputFiles({ name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(PIXEL.split(',')[1]!, 'base64') })
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
  await page.getByRole('button', { name: 'Fiche et photos' }).click()
  await expect(page.getByRole('heading', { name: 'Samsung Galaxy A15' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour aux produits' }).click()
  await expect(page.getByRole('heading', { name: 'Produits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fiche et photos' })).toBeVisible()
})

test('le marchand crée une variante avec son prix, puis change le prix d’une offre', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/propositions-produits$`), [produit])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/offres$`), [offre])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/variantes$`), { id: 'nouvelle', statut: 'brouillon' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/revisions$`), { id: 'rev-2', statut: 'soumise' })
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/offres/${OFFRE}/prix$`), { id: OFFRE, prixFcfa: 139_000, prixReferenceFcfa: 149_000, statut: 'publiee' })

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
  // Plus de stock initial : la variante part « En stock » (6 novembre 2026).
  await expect(variante.getByLabel('Stock initial')).toHaveCount(0)
  await variante.getByRole('button', { name: 'Soumettre la variante' }).click()
  await expect(variante).toBeHidden()

  expect(api.appelsVers('POST', /\/variantes$/)[0]!.corps).toEqual({
    libelleVariante: '256 Go / Bleu / 2 ans', attributsVariante: { Capacité: '256 Go', Couleur: 'Bleu', 'Garantie fabricant': '2 ans' },
    referenceVendeur: 'A15-256-BLEU', prixFcfa: 179_000,
  })

  await page.getByRole('button', { name: 'Prix et minimum' }).click()
  const prix = page.getByRole('dialog', { name: 'Prix et minimum de commande' })
  await prix.getByLabel('Prix FCFA').fill('139000')
  await prix.getByLabel('Prix barré').fill('149000')
  // Le MOQ part de celui de l'offre (1 ici) ; le marchand le releve en meme temps que le prix.
  await expect(prix.getByLabel(/^Minimum de commande/)).toHaveValue('1')
  await prix.getByLabel(/^Minimum de commande/).fill('3')
  await prix.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(prix).toBeHidden()

  // Le prix et le prix barre partent tout de suite ; seul le nouveau minimum passe en validation.
  expect(api.appelsVers('POST', /\/prix$/)[0]!.corps).toEqual({ prixFcfa: 139_000, prixReferenceFcfa: 149_000 })
  expect(api.appelsVers('POST', /\/revisions$/)[0]!.corps).toMatchObject({
    titre: 'Samsung Galaxy A15 128 Go', prixFcfa: 139_000, prixReferenceFcfa: 149_000, etat: 'neuf', garantieMois: 12,
    modesLivraison: ['katihub'], villesLivraison: ['Douala'], delaiMaxJours: 2, quantiteMinimale: 3, libelleVariante: '128 Go', attributsVariante: { Capacité: '128 Go' },
  })
})

test('le marchand classe son produit dans une catégorie KatiHub et voit la garantie minimale', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'soumis' }, offres: [] })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  // Le prix part avec la fiche (6 novembre 2026).
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('button', { name: 'Soumettre à la validation' }).click()
  // Le navigateur bloque l'envoi tant que la sous-categorie manque.
  expect(await page.getByRole('combobox', { name: /^Sous-catégorie/ }).evaluate((champ: HTMLSelectElement) => champ.validity.valueMissing)).toBe(true)
  expect(api.appelsVers('POST', /produits-complets$/)).toHaveLength(0)

  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléviseurs' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('2 ans')
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await expect(page.getByTestId('garantie-categorie')).toContainText('1 an')
  await page.getByRole('button', { name: 'Soumettre à la validation' }).click()
  await expect(page.getByText('Produit envoyé à la modération.')).toBeVisible()

  expect(api.appelsVers('POST', /produits-complets$/)[0]!.corps).toEqual({
    produit: { nom: 'Samsung Galaxy A25', slug: 'samsung-galaxy-a25', categorieId: '00000000-0000-4000-8000-000000000402' },
    vente: { etat: 'neuf', garantieMois: 12, delaiMaxJours: 2 },
    variantes: [{ referenceVendeur: 'A25-128', prixFcfa: 189_000, quantiteMinimale: 1, statutStock: 'en_stock' }],
  })
})

test('le marchand crée un produit complet : deux variantes avec leur prix, leur statut et la garantie', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/produits-complets$`), { produit: { id: 'nouveau', statut: 'soumis' }, offres: [] })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Produits', exact: true }).click()
  await page.getByRole('button', { name: /Nouveau produit|Ajouter un produit/ }).first().click()
  await page.getByLabel('Nom du produit').fill('Samsung Galaxy A25')
  await page.getByRole('combobox', { name: /^Catégorie/ }).selectOption({ label: 'Électronique' })
  await page.getByRole('combobox', { name: /^Sous-catégorie/ }).selectOption({ label: 'Téléphones' })
  await page.getByLabel('Référence de la variante 1').fill('A25-128')
  await page.getByLabel('Prix de la variante 1').fill('189000')
  await page.getByLabel('Prix barré de la variante 1').fill('199000')
  await page.getByTestId('ajouter-variante').click()
  await page.getByLabel('Référence de la variante 2').fill('A25-256')
  await page.getByLabel('Prix de la variante 2').fill('219000')
  await page.getByLabel('Statut du stock de la variante 2').selectOption('reapprovisionnement')

  // Deux variantes : chacune doit porter un nom.
  await page.getByRole('button', { name: 'Soumettre à la validation' }).click()
  await expect(page.getByText('Donnez un nom à chaque variante (ex. 128 Go / Noir).')).toBeVisible()
  expect(api.appelsVers('POST', /produits-complets$/)).toHaveLength(0)

  await page.getByLabel('Nom de la variante 1').fill('128 Go')
  await page.getByLabel('Nom de la variante 2').fill('256 Go')
  await page.getByLabel('Garantie (mois)').fill('24')
  await expect(page.getByText('189 000 FCFA').first()).toBeVisible()
  await page.getByRole('button', { name: 'Soumettre à la validation' }).click()
  await expect(page.getByText('Produit envoyé à la modération.')).toBeVisible()
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
