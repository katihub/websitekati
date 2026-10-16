import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LES DEVIS MARKETPLACE : le client lit son devis multi-boutiques et l'accepte,
 * la boutique repond a sa seule partie.
 */

let api: ApiSimulee | undefined

test.beforeEach(() => { api = undefined })
test.afterEach(() => {
  if (!api) return
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const B1 = '00000000-0000-4000-8000-0000000000b1'
const B2 = '00000000-0000-4000-8000-0000000000b2'
const DEMAIN = new Date(Date.now() + 24 * 3600_000).toISOString()

const ligne = (id: string, titre: string, prix: number, demandee: number, confirmee: number | null, prixActuel = prix) => ({
  id, offreId: `offre-${id}`, rang: 1, produitNomCapture: titre, offreTitreCapture: titre, libelleVarianteCapture: null,
  prixUnitaireFcfa: prix, quantiteDemandee: demandee, quantiteConfirmee: confirmee, totalFcfa: prix * (confirmee ?? demandee), prixActuelFcfa: prixActuel,
})
const partie = (id: string, boutiqueId: string, nom: string, statut: string, lignes: ReturnType<typeof ligne>[], extra: Record<string, unknown> = {}) => ({
  id, reference: `DM-E2E-${id}`, boutiqueId, statut, totalFcfa: lignes.reduce((s, l) => s + l.totalFcfa, 0), delaiLivraisonJours: statut === 'confirmee' ? 3 : null,
  valideJusquau: statut === 'confirmee' ? DEMAIN : null, messageVendeur: null, motifRefus: null, reponduLe: null,
  boutique: { id: boutiqueId, nom, slug: nom.toLowerCase().replace(/\s+/g, '-'), ville: 'Douala' }, lignes,
  expiree: false, acceptable: statut === 'confirmee', prixAJour: lignes.every((l) => l.prixActuelFcfa === l.prixUnitaireFcfa),
  livraison: { modes: ['katihub', 'vendeur'], villes: ['Douala', 'Yaoundé'] }, ...extra,
})
const devis = (parties: ReturnType<typeof partie>[], extra: Record<string, unknown> = {}) => ({
  id: 'd1', reference: 'DM-E2E', statut: 'ouvert', entreprise: 'Batiplus SARL', message: null, totalFcfa: parties.reduce((s, p) => s + p.totalFcfa, 0),
  creeLe: '2026-10-15T08:00:00.000Z', accepteLe: null, commande: null, parties, prixAJour: parties.every((p) => p.prixAJour), ...extra,
})

test('le client lit les réponses des boutiques et accepte la partie confirmée', async ({ page }) => {
  const actuel = devis([
    partie('1', B1, 'TechMall', 'confirmee', [ligne('l1', 'Ordinateur HP 15', 295_000, 10, 8)], { messageVendeur: 'Livraison groupée possible.' }),
    partie('2', B2, 'Digital House', 'refusee', [ligne('l2', 'Écouteurs', 25_000, 4, null)], { motifRefus: 'Rupture fournisseur.' }),
  ])
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/devis\/DM-E2E$/, actuel)
    .quand('POST', /^\/marketplace\/devis\/DM-E2E\/acceptation$/, { reference: 'DM-E2E', commande: 'CM-E2E-DEVIS' })
    .quand('GET', /^\/marketplace\/commandes\/CM-E2E-DEVIS$/, { status: 404, body: { message: 'introuvable' } })

  await page.goto('/compte/devis/DM-E2E')
  await expect(page.getByRole('heading', { name: 'Devis DM-E2E' })).toBeVisible()
  const techmall = page.getByTestId('partie-DM-E2E-1')
  await expect(techmall).toContainText('Confirmé par la boutique')
  await expect(techmall).toContainText('« Livraison groupée possible. »')
  await expect(page.getByTestId('partie-DM-E2E-2')).toContainText('Motif : Rupture fournisseur.')

  const formulaire = page.getByTestId('accepter-devis')
  await expect(formulaire).toContainText(/Total retenu : 2[\s  ]360[\s  ]000 FCFA/)
  await formulaire.getByLabel('Livraison TechMall').selectOption('vendeur')
  await formulaire.getByLabel('Quartier').fill('Bonanjo')
  await formulaire.getByLabel('Repère').fill('Immeuble Batiplus, 2e étage')
  await formulaire.getByLabel('Téléphone du destinataire').fill('699000001')
  await formulaire.getByRole('button', { name: 'Accepter et commander' }).click()
  await page.waitForURL(/\/marketplace\/commande\/CM-E2E-DEVIS\/paiement$/)

  expect(api.appelsVers('POST', /acceptation$/)[0]!.corps).toEqual({
    partieIds: ['1'],
    livraisons: [{ boutiqueId: B1, mode: 'vendeur' }],
    adresse: { ville: 'Douala', quartier: 'Bonanjo', repere: 'Immeuble Batiplus, 2e étage', telephoneDestinataire: '+237 699 00 00 01' },
  })
  // La page de paiement simulee ne trouve pas la commande : son erreur n'est pas l'objet du test.
  api.erreursNavigateur.length = 0
})

test('un prix changé bloque l’acceptation, et le client actualise son devis', async ({ page }) => {
  const perime = devis([partie('1', B1, 'TechMall', 'confirmee', [ligne('l1', 'Ordinateur HP 15', 295_000, 2, 2, 285_000)])])
  const aJour = devis([partie('1', B1, 'TechMall', 'confirmee', [ligne('l1', 'Ordinateur HP 15', 285_000, 2, 2)])])
  api = (await simulerApi(page))
    .quand('GET', /^\/marketplace\/devis\/DM-E2E$/, perime)
    .quand('POST', /^\/marketplace\/devis\/DM-E2E\/actualisation$/, aJour)

  await page.goto('/compte/devis/DM-E2E')
  await expect(page.getByText('Certains prix ont changé depuis votre demande.')).toBeVisible()
  await expect(page.getByTestId('partie-DM-E2E-1')).toContainText('Prix actuel')
  await page.getByRole('button', { name: 'Actualiser le devis' }).first().click()
  await expect(page.getByText('Les prix du devis ont été mis à jour avec les prix publiés.')).toBeVisible()
  await expect(page.getByText('Certains prix ont changé depuis votre demande.')).toBeHidden()
})

test('la liste des devis résume où en est chaque demande', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/devis$/, [
    devis([partie('1', B1, 'TechMall', 'confirmee', [ligne('l1', 'HP 15', 295_000, 1, 1)]), partie('2', B2, 'Digital House', 'en_attente', [ligne('l2', 'Écouteurs', 25_000, 1, null)])]),
    devis([partie('3', B1, 'TechMall', 'acceptee', [ligne('l3', 'HP 15', 295_000, 1, 1)], { acceptable: false })], { id: 'd2', reference: 'DM-E2E2', statut: 'accepte', commande: { reference: 'CM-XYZ' } }),
  ])
  await page.goto('/compte/devis')
  const liste = page.getByTestId('mes-devis')
  await expect(liste.getByRole('link', { name: /DM-E2E · Batiplus SARL/ })).toContainText('1 boutique a confirmé : vous pouvez accepter')
  await expect(liste.getByRole('link', { name: /DM-E2E2/ })).toContainText('Devenu la commande CM-XYZ')
})

test('sans session, la page des devis propose de se connecter', async ({ page }) => {
  api = (await simulerApi(page)).quand('GET', /^\/marketplace\/devis$/, { status: 401, body: { message: 'Non authentifie' } })
  await page.goto('/compte/devis')
  await expect(page.getByText('Connectez-vous pour retrouver vos devis.')).toBeVisible()
})

test('la boutique confirme sa partie du devis, sans voir celle des autres', async ({ page }) => {
  const B = IDS.boutique
  const recue = {
    ...partie('1', B, 'Maison Kati', 'en_attente', [ligne('l1', 'Samsung Galaxy A15', 149_000, 10, null), ligne('l2', 'Coque A15', 5_000, 10, null)]),
    devis: { reference: 'DM-E2E', statut: 'ouvert', entreprise: 'Batiplus SARL', message: 'Pour nos commerciaux.', creeLe: '2026-10-15T08:00:00.000Z', client: { nom: 'Awa Mbarga', ville: 'Douala' } },
  }
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^/marketplace/boutiques/${B}/devis$`), [recue])
    .quand('POST', new RegExp(`^/marketplace/boutiques/${B}/devis/1/reponse$`), { ok: true })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Devis', exact: true }).click()
  const ligneDevis = page.getByTestId('devis-DM-E2E-1')
  await expect(ligneDevis).toContainText('Batiplus SARL')
  await expect(ligneDevis).toContainText('« Pour nos commerciaux. »')
  await ligneDevis.getByRole('button', { name: 'Confirmer' }).click()

  const fenetre = page.getByRole('dialog', { name: 'Confirmer le devis DM-E2E-1' })
  await fenetre.getByLabel('Samsung Galaxy A15').fill('6')
  await fenetre.getByLabel('Coque A15').fill('0')
  await fenetre.getByLabel('Délai de livraison (jours)').fill('4')
  await fenetre.getByLabel('Réponse valable (jours)').fill('10')
  await fenetre.getByLabel('Message au client (facultatif)').fill('Six unités disponibles tout de suite.')
  await fenetre.getByRole('button', { name: 'Envoyer la confirmation' }).click()
  await expect(fenetre).toBeHidden()

  expect(api.appelsVers('POST', /\/reponse$/)[0]!.corps).toEqual({
    decision: 'confirmee', lignes: [{ ligneId: 'l1', quantiteConfirmee: 6 }, { ligneId: 'l2', quantiteConfirmee: 0 }],
    delaiLivraisonJours: 4, validiteJours: 10, message: 'Six unités disponibles tout de suite.',
  })
})

test('depuis le panier, un visiteur non connecté peut se connecter avant de demander un devis', async ({ page, request }) => {
  // Le panier est rendu cote serveur depuis le backend : sans backend local, rien a verifier ici.
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  test.skip(!(await request.get(`${backend}/v1/marketplace/accueil`).then((r) => r.ok()).catch(() => false)), 'backend local injoignable')

  api = (await simulerApi(page)).quand('POST', /^\/marketplace\/panier\/verifier$/, [])
  await page.addInitScript(() => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([{ slug: 'galaxy-a15', name: 'Samsung Galaxy A15', price: 149_000, image: null, qty: 3, offerId: '00000000-0000-4000-8000-000000000202', boutiqueId: '00000000-0000-4000-8000-0000000000b1', boutiqueNom: 'TechMall' }]))
  })
  await page.goto('/panier')
  await page.getByRole('button', { name: 'Demander un devis pour la sélection' }).click()
  // Sans compte, la fenetre demande les coordonnees ; « se connecter » mene a la connexion.
  await expect(page.getByRole('dialog').getByLabel('E-mail')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'se connecter' }).click()
  await page.waitForURL(/\/connexion\?retour=%2Fpanier$/)
  expect(api.appelsVers('POST', /^\/marketplace\/devis$/)).toHaveLength(0)
  api.erreursNavigateur.length = 0
})
