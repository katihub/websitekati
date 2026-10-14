import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { litigeBoutique, mission } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

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

test('le marchand dépose un justificatif depuis son espace, et un format interdit est refusé avant l’envoi', async ({ page }) => {
  api = (await espaceVendeur(page, []))
    .quand('POST', /^\/vendeurs\/mes-boutiques\/[^/]+\/documents\/fichier$/, { id: 'doc1', statut: 'soumis' })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Vérification', exact: true }).click()
  const fichier = page.locator('input[type=file]')

  await fichier.setInputFiles({ name: 'outil.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') })
  await expect(page.getByText('outil.exe : format non accepté.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Transmettre le justificatif' })).toBeDisabled()

  await page.getByRole('combobox', { name: /^Type de document/ }).selectOption('rccm')
  await fichier.setInputFiles({ name: 'RCCM.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') })
  await page.getByLabel('Date d’expiration, si applicable').fill('2031-12-31')
  await page.getByRole('button', { name: 'Transmettre le justificatif' }).click()
  await expect(page.getByText('Justificatif transmis à KatiHub pour vérification.')).toBeVisible()

  const envoi = String(api.appelsVers('POST', /\/documents\/fichier$/)[0]!.corps)
  expect(envoi).toContain('filename="RCCM.pdf"')
  expect(envoi).toMatch(/name="type"\r\n\r\nrccm/)
  expect(envoi).toMatch(/name="expireLe"\r\n\r\n2031-12-31/)
})
