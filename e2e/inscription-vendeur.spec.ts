import { expect, test, type Page } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'

/**
 * L'INSCRIPTION VENDEUR (5 novembre 2026) : ni CNI, ni NIU, ni RCCM ne sont
 * exiges ; le particulier donne sa naissance, sa residence et, s'il veut, un
 * fournisseur ou parrain.
 */
async function preparer(page: Page): Promise<ApiSimulee> {
  const api = await simulerApi(page)
  api.quand('GET', /^\/marketplace\/categories$/, [{
    id: '00000000-0000-4000-8000-000000000401', nom: 'Mode', slug: 'mode', garantie: { mois: 0, unite: 'mois', heritee: false, libelle: 'aucune' },
    sousCategories: [{ id: '00000000-0000-4000-8000-000000000402', nom: 'Vêtements', slug: 'vetements', garantie: { mois: 0, unite: 'mois', heritee: false, libelle: 'aucune' } }],
  }])
  api.quand('POST', /^\/vendeurs\/inscription$/, { reference: 'vendeur-test', statut: 'candidature_recue', boutique: { nom: 'Boutique test', slug: 'boutique-test' } })

  await page.goto('/devenir-vendeur')
  await page.getByLabel(/Votre nom complet/).fill('Aline Test')
  await page.getByLabel(/Adresse e-mail/).fill('aline.test@example.cm')
  await page.getByLabel(/Numéro mobile/).fill('699123456')
  const password = page.getByLabel(/Créer un mot de passe/)
  if (await password.isVisible()) {
    await password.fill('TestPass123!')
    await page.getByLabel(/Confirmer le mot de passe/).fill('TestPass123!')
  }
  await page.getByRole('button', { name: /Continuer/ }).click()

  await page.getByLabel(/Nom de la boutique/).fill('Boutique test')
  await page.getByLabel('Yaoundé', { exact: true }).check()
  await page.getByLabel('Mode · Vêtements', { exact: true }).check()
  await page.getByLabel(/Présentez votre boutique/).fill('Boutique de vêtements et accessoires de mode.')
  await page.getByRole('radio', { name: /Kati Service gère mon SAV/ }).check()
  await page.getByRole('button', { name: /Continuer/ }).click()
  return api
}

async function envoyer(page: Page, api: ApiSimulee) {
  await page.getByRole('button', { name: /Continuer/ }).click()
  await page.getByLabel(/contrat vendeur/).check()
  await page.getByRole('button', { name: /Envoyer ma candidature/ }).click()
  await expect(page.getByRole('heading', { name: /Candidature reçue/ })).toBeVisible()
  const envoi = api.appelsVers('POST', /^\/vendeurs\/inscription$/)[0]?.corps
  expect(typeof envoi).toBe('string')
  expect(api.nonPrevues).toEqual([])
  return envoi as string
}

test('une entreprise s’inscrit sans CNI, sans NIU et sans RCCM', async ({ page }) => {
  const api = await preparer(page)
  await expect(page.getByLabel('Je représente une entreprise')).toBeChecked()
  await expect(page.getByLabel(/Carte nationale d’identité/)).toHaveCount(0)
  await page.getByLabel(/Dénomination de l’entreprise/).fill('Entreprise test SARL')

  const envoi = await envoyer(page, api)
  expect(envoi).toContain('Entreprise test SARL')
  expect(envoi).toContain('Yaoundé')
  expect(envoi).toContain('00000000-0000-4000-8000-000000000402')
  expect(envoi).toContain('kati_service')
  expect(envoi).not.toContain('name="cni"')
  expect(envoi).not.toContain('name="niu"')
  expect(envoi).not.toContain('name="rccm"')
})

test('un particulier donne sa naissance, sa résidence et un parrain facultatif', async ({ page }) => {
  const api = await preparer(page)
  await page.getByLabel('Je vends en mon nom').check()
  await expect(page.getByLabel(/^NIU/)).toHaveCount(0)
  await page.getByTestId('inscription-nom').fill('Aline Ngono')
  await page.getByTestId('inscription-naissance').fill('1995-04-12')
  await page.getByTestId('inscription-lieu-naissance').fill('Bafoussam')
  await page.getByTestId('inscription-ville-residence').selectOption('Douala')
  await page.getByTestId('inscription-quartier').selectOption('Akwa')
  await page.getByLabel(/Nom d’un fournisseur ou parrain/).fill('Paul Etoa')
  await page.getByLabel(/Téléphone d’un fournisseur ou parrain/).fill('6 77 00 11 22')

  await page.getByRole('button', { name: /Continuer/ }).click()
  await expect(page.getByText(/né\(e\) le 12 avril 1995 à Bafoussam/)).toBeVisible()
  await expect(page.getByText(/Réside à Douala, Akwa/)).toBeVisible()
  await page.getByRole('button', { name: /Retour/ }).click()

  const envoi = await envoyer(page, api)
  for (const attendu of ['personne_physique', 'Aline Ngono', '1995-04-12', 'Bafoussam', 'Akwa', 'Paul Etoa', '677001122']) expect(envoi).toContain(attendu)
})

test('un particulier de moins de 18 ans ne peut pas continuer', async ({ page }) => {
  const api = await preparer(page)
  await page.getByLabel('Je vends en mon nom').check()
  await page.getByTestId('inscription-nom').fill('Junior Test')
  await page.getByTestId('inscription-naissance').fill('2012-01-01')
  await page.getByRole('button', { name: /Continuer/ }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Vous devez avoir au moins 18 ans pour vendre sur KatiMarket.' })).toBeVisible()
  expect(api.appelsVers('POST', /^\/vendeurs\/inscription$/)).toHaveLength(0)
})
