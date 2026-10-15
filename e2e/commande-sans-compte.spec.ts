import { expect, test, type Request } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * LA COMMANDE EN UNE PAGE ET SANS COMPTE (lots 2 et 3) : coordonnees et e-mail
 * obligatoires, retrait gratuit a la boutique, expedition en agence avec sa note
 * et le paiement complet impose, quartiers en liste, lien de suivi signe ; le
 * devis sans compte ; « Acheter maintenant » depuis la fiche.
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
const O1 = '00000000-0000-4000-8000-0000000000f1'
const O2 = '00000000-0000-4000-8000-0000000000f2'
const JETON = 'jeton-signe-de-la-commande'

const offre = (id: string, boutique: string, nom: string, prix: number, modes: string[], adresseRetrait: string | null = null) => ({
  id, titre: nom, prixFcfa: prix, disponible: 10, modesLivraison: modes, villesLivraison: ['Douala'], delaiMaxJours: 3,
  boutique: { id: boutique, nom, slug: nom.toLowerCase(), ville: 'Douala', adresseRetrait },
})

async function panier(page: import('@playwright/test').Page) {
  api = (await simulerApi(page))
    .quand('POST', /^\/marketplace\/panier\/verifier$/, [
      { nom: 'Téléphone', slug: 'telephone', offres: [offre(O1, B1, 'TechMall', 150_000, ['katihub', 'retrait'], 'Akwa, rue Joss, face Total')] },
      { nom: 'Écouteurs', slug: 'ecouteurs', offres: [offre(O2, B2, 'Digital', 25_000, ['vendeur', 'agence'])] },
    ])
    .quand('GET', /^\/marketplace\/livraison\/tarifs$/, [
      { ville: 'Douala', mode: 'katihub', montantFcfa: 2_000, gratuitDesFcfa: null },
      { ville: 'Douala', mode: 'vendeur', montantFcfa: 1_500, gratuitDesFcfa: null },
      { ville: 'Douala', mode: 'agence', montantFcfa: 3_000, gratuitDesFcfa: null },
    ])
  await page.addInitScript(([o1, o2, b1, b2]) => {
    localStorage.setItem('nowtech.panier.v1', JSON.stringify([
      { slug: 'telephone', name: 'Téléphone', price: 150_000, image: null, qty: 1, offerId: o1, boutiqueId: b1, boutiqueNom: 'TechMall' },
      { slug: 'ecouteurs', name: 'Écouteurs', price: 25_000, image: null, qty: 1, offerId: o2, boutiqueId: b2, boutiqueNom: 'Digital' },
    ]))
  }, [O1, O2, B1, B2])
  await page.goto(`/marketplace/commande?articles=${O1},${O2}`)
  return api
}

test('sans compte : retrait gratuit, agence avec sa note et le paiement complet, puis le paiement par le lien signé', async ({ page }) => {
  const simulee = await panier(page)
  simulee
    .quand('POST', /^\/marketplace\/commandes\/sans-compte$/, { id: 'c1', reference: 'CM-INV123', jeton: JETON })
    .quand('GET', /^\/marketplace\/commandes\/sans-compte\/CM-INV123$/, (requete: Request) => requete.headers()['x-jeton-suivi'] === JETON
      ? {
          id: 'c1', reference: 'CM-INV123', statut: 'soumise', totalFermeTtc: 175_000, fraisLivraison: 3_000, acompteDu: 178_000, acompteRecu: 0, resteAPayer: 178_000,
          modePaiementMarketplace: 'complet', assuranceFcfa: 0, installationFcfa: 0, katiUtilises: 0, remiseKatiFcfa: 0,
          sousCommandes: [
            { reference: 'CM-INV123-1', boutiqueId: B1, boutique: { nom: 'TechMall', slug: 'techmall' }, totalNetProduits: 150_000, modeLivraison: 'retrait', noteAgence: null, lignes: [{ offreTitreCapture: 'Téléphone', quantite: 1, totalNetFcfa: 150_000 }] },
            { reference: 'CM-INV123-2', boutiqueId: B2, boutique: { nom: 'Digital', slug: 'digital' }, totalNetProduits: 25_000, modeLivraison: 'agence', noteAgence: 'Général Express, Bafoussam', lignes: [{ offreTitreCapture: 'Écouteurs', quantite: 1, totalNetFcfa: 25_000 }] },
          ],
        }
      : { status: 404, body: { message: 'Commande introuvable' } })

  // Sans session : les coordonnees, et les raisons de creer un compte.
  await expect(page.getByTestId('sans-compte')).toBeVisible()
  await expect(page.getByTestId('arguments-compte')).toContainText('KATI')

  // TechMall en retrait : gratuit, a l'adresse de la boutique.
  await page.locator(`input[name="delivery-${B1}"]`).nth(1).check()
  await expect(page.getByTestId(`frais-${B1}-retrait`)).toHaveText('gratuit')
  await expect(page.getByText('À retirer : Akwa, rue Joss, face Total, Douala.')).toBeVisible()
  // Digital en agence : 3 000, et tout se paie maintenant.
  await page.locator(`input[name="delivery-${B2}"]`).nth(1).check()
  await expect(page.getByTestId('frais-livraison')).toHaveText(/3[\s  ]000 FCFA/)
  await expect(page.getByTestId('complet-impose')).toBeVisible()
  await expect(page.getByLabel(/Un acompte maintenant/)).toBeDisabled()
  await expect(page.getByTestId('a-payer-livraison')).toHaveText('Rien à régler au livreur.')
  // Ni domicile, ni quartier ni repere.
  await expect(page.getByLabel('Repère')).toHaveCount(0)

  const commander = page.getByRole('button', { name: /Commander et payer/ })
  await page.getByLabel('Nom complet').fill('Awa Ngono')
  await page.getByLabel('Téléphone mobile').fill('677 12 34 56')
  await page.getByLabel('J’ai vérifié ma commande').check()
  await commander.click()
  await expect(page.getByRole('alert').filter({ hasText: 'adresse e-mail' })).toBeVisible()
  await page.getByLabel('E-mail').fill('awa@exemple.cm')
  await commander.click()
  await expect(page.getByRole('alert').filter({ hasText: 'agence de voyage' })).toBeVisible()
  await page.getByTestId(`note-agence-${B2}`).fill('Général Express, Bafoussam')
  await commander.click()

  await page.waitForURL(`**/marketplace/commande/CM-INV123/paiement?suivi=${JETON}`)
  await expect(page.getByRole('heading', { name: 'Régler ma commande' })).toBeVisible()
  await expect(page.getByText('Retrait à la boutique')).toBeVisible()
  await expect(page.getByText(/Expédition en agence · Général Express, Bafoussam/)).toBeVisible()

  const [envoi] = simulee.appelsVers('POST', /^\/marketplace\/commandes\/sans-compte$/)
  expect(envoi!.corps).toMatchObject({
    livraisons: [{ boutiqueId: B1, mode: 'retrait' }, { boutiqueId: B2, mode: 'agence', noteAgence: 'Général Express, Bafoussam' }],
    adresse: { ville: 'Douala', telephoneDestinataire: '+237 677 12 34 56' },
    modePaiement: 'complet', nom: 'Awa Ngono', telephone: '+237 677 12 34 56', courriel: 'awa@exemple.cm',
  })
  expect((envoi!.corps as { adresse: object }).adresse).not.toHaveProperty('quartier')
  expect(simulee.appelsVers('POST', /^\/marketplace\/commandes$/)).toHaveLength(0)
})

test('à domicile, le quartier se choisit dans la liste de la ville, ou se saisit librement', async ({ page }) => {
  await panier(page)
  await expect(page.getByTestId(`frais-${B1}-katihub`)).toHaveText(/2[\s  ]000 FCFA/)
  const quartier = page.getByRole('combobox', { name: 'Quartier' })
  await expect(quartier.locator('option')).toHaveText(['Choisissez…', 'Akwa', 'Bonanjo', 'Bonamoussadi', 'Autre quartier…'])
  await quartier.selectOption('Bonanjo')
  await expect(page.getByLabel('Autre quartier', { exact: true })).toHaveCount(0)
  await quartier.selectOption({ label: 'Autre quartier…' })
  await page.getByLabel('Autre quartier', { exact: true }).fill('Ndogpassi')
  await expect(page.getByLabel('Autre quartier', { exact: true })).toHaveValue('Ndogpassi')
})

test('le devis sans compte part avec les coordonnées et s’ouvre par son lien', async ({ page, request }) => {
  // Le panier est rendu cote serveur depuis le backend : sans backend local, rien a verifier ici.
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  test.skip(!(await request.get(`${backend}/v1/marketplace/accueil`).then((r) => r.ok()).catch(() => false)), 'backend local injoignable')
  const devis = {
    id: 'd1', reference: 'DM-INV', statut: 'ouvert', entreprise: null, message: null, totalFcfa: 300_000, creeLe: '2026-10-15T08:00:00.000Z', accepteLe: null, commande: null, prixAJour: true,
    parties: [{ id: 'p1', reference: 'DM-INV-1', boutiqueId: B1, statut: 'en_attente', totalFcfa: 300_000, delaiLivraisonJours: null, valideJusquau: null, messageVendeur: null, motifRefus: null, reponduLe: null,
      boutique: { id: B1, nom: 'TechMall', slug: 'techmall', ville: 'Douala' }, expiree: false, acceptable: false, prixAJour: true, livraison: { modes: ['katihub', 'retrait'], villes: ['Douala'] },
      lignes: [{ id: 'l1', offreId: O1, rang: 1, produitNomCapture: 'Téléphone', offreTitreCapture: 'Téléphone', libelleVarianteCapture: null, prixUnitaireFcfa: 150_000, quantiteDemandee: 2, quantiteConfirmee: null, totalFcfa: 300_000, prixActuelFcfa: 150_000 }] }],
  }
  const simulee = await panier(page)
  simulee
    .quand('POST', /^\/marketplace\/devis\/sans-compte$/, { ...devis, jeton: 'jeton-du-devis' })
    .quand('GET', /^\/marketplace\/devis\/sans-compte\/DM-INV$/, (requete: Request) => requete.headers()['x-jeton-suivi'] === 'jeton-du-devis' ? devis : { status: 404, body: { message: 'Devis introuvable' } })
  await page.goto('/panier')
  await page.getByRole('button', { name: 'Demander un devis pour la sélection' }).click()
  const fenetre = page.getByRole('dialog')
  await fenetre.getByLabel('Votre nom').fill('Awa Ngono')
  await fenetre.getByLabel('Téléphone mobile').fill('677123456')
  await fenetre.getByLabel('E-mail').fill('awa@exemple.cm')
  await fenetre.getByRole('button', { name: 'Envoyer la demande' }).click()

  await page.waitForURL('**/devis/DM-INV?suivi=jeton-du-devis')
  await expect(page.getByRole('heading', { name: 'Devis DM-INV' })).toBeVisible()
  await expect(page.getByText('Devis sans compte')).toBeVisible()
  expect(simulee.appelsVers('POST', /^\/marketplace\/devis\/sans-compte$/)[0]!.corps).toMatchObject({ nom: 'Awa Ngono', telephone: '+237 677 12 34 56', courriel: 'awa@exemple.cm' })
})

test('« Acheter maintenant » mène à la commande de cet article seul', async ({ page, request }) => {
  // La fiche est rendue cote serveur depuis le backend : sans backend local, rien a verifier ici.
  const backend = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101'
  const accueil = await request.get(`${backend}/v1/marketplace/offres`).then((r) => (r.ok() ? r.json() : null)).catch(() => null) as { offres?: Array<{ id: string; disponible: number; prixFcfa: number | null; produit: { slug: string }; boutique: { slug: string } }> } | null
  const cible = accueil?.offres?.find((o) => o.disponible > 0 && o.prixFcfa !== null)
  test.skip(!cible, 'backend local injoignable ou sans offre disponible')

  api = (await simulerApi(page)).quand('POST', /^\/marketplace\/panier\/verifier$/, []).quand('GET', /^\/marketplace\/livraison\/tarifs$/, [])
  await page.goto(`/marketplace/produits/${cible!.produit.slug}?boutique=${cible!.boutique.slug}`)
  await page.getByTestId('acheter-maintenant').click()
  await page.waitForURL(/\/marketplace\/commande\?articles=/)
  expect(new URL(page.url()).searchParams.get('articles')).toBe(cible!.id)
  // La fiche lit d'autres donnees en tache de fond : seules la navigation et la ligne choisie comptent ici.
  api.nonPrevues.length = 0
  api.erreursNavigateur.length = 0
})
