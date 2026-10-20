import { expect, test } from '@playwright/test'

import { simulerApi } from './support/api'

test('inscription vendeur : villes et catégories multiples, CNI jointe et entreprise présélectionnée', async ({ page }) => {
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
  await page.getByRole('button', { name: /Continuer/ }).click({ force: true })

  await page.getByLabel(/Nom de la boutique/).fill('Boutique test')
  await page.getByLabel('Yaoundé', { exact: true }).check()
  await page.getByLabel('Mode · Vêtements', { exact: true }).check()
  await page.getByLabel(/Présentez votre boutique/).fill('Boutique de vêtements et accessoires de mode.')
  await page.getByRole('button', { name: /Continuer/ }).click({ force: true })

  await expect(page.getByLabel('Je représente une entreprise')).toBeChecked()
  await page.getByLabel(/Dénomination de l’entreprise/).fill('Entreprise test SARL')
  await page.getByLabel('NIU').fill('M123456789012A')
  await page.getByLabel('RCCM').fill('RC/DLA/2026/B/1234')
  await page.getByLabel(/Carte nationale d’identité/).setInputFiles({ name: 'cni.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) })
  await page.getByRole('button', { name: /Continuer/ }).click({ force: true })

  await page.getByLabel(/contrat vendeur/).check()
  await page.getByRole('button', { name: /Envoyer ma candidature/ }).click({ force: true })
  await expect(page.getByRole('heading', { name: /Candidature reçue/ })).toBeVisible()
  const envoi = api.appelsVers('POST', /^\/vendeurs\/inscription$/)[0]?.corps
  expect(typeof envoi).toBe('string')
  expect(envoi).toContain('Yaoundé')
  expect(envoi).toContain('00000000-0000-4000-8000-000000000402')
  expect(envoi).toContain('cni.png')
  expect(envoi).toContain('image/png')
  expect(api.nonPrevues).toEqual([])
})
