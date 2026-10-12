import { chromium } from 'playwright'

const base = process.env.QA_BASE_URL ?? 'http://localhost:3000'
const password = process.env.QA_DEV_PASSWORD ?? 'developpement'
const stamp = Date.now()
const browser = await chromium.launch({ headless: true })

async function clientSignup() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const browserErrors = []
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto(`${base}/inscription`)
  await page.waitForTimeout(1_000)
  await page.locator('[name=name]').fill('Cliente QA KatiHub')
  await page.locator('[name=email]').fill(`client.qa.${stamp}@example.cm`)
  await page.locator('[name=phone]').fill('699123456')
  await page.locator('[name=password]').fill(password)
  await page.locator('[name=terms]').check()
  await page.getByRole('button', { name: /Créer mon compte/ }).click()
  try {
    await page.getByRole('heading', { name: 'Compte créé' }).waitFor({ timeout: 10_000 })
  } catch {
    const visibleError = await page.locator('[role=alert]').textContent().catch(() => null)
    const buttonText = await page.getByRole('button', { name: /Créer mon compte|Création en cours/ }).textContent().catch(() => null)
    throw new Error(`Inscription client non confirmée${visibleError ? ` : ${visibleError}` : ''}${buttonText ? ` [bouton=${buttonText.trim()}]` : ''}${browserErrors.length ? ` [navigateur=${browserErrors.join(' | ')}]` : ''}`)
  }
  const profile = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('nowtech.session-locale.v1') ?? 'null')
    if (!session?.jeton) return { ok: false, reason: 'session_absente' }
    const response = await fetch('http://localhost:3101/v1/profil', { headers: { Authorization: `Bearer ${session.jeton}` } })
    return { ok: response.ok, body: await response.json().catch(() => null) }
  })
  if (!profile.ok || profile.body?.profil?.nom !== 'Cliente QA KatiHub' || profile.body?.profil?.telephoneChiffres !== '699123456') throw new Error(`Profil client non persisté : ${JSON.stringify(profile)}`)
  return 'client:ok'
}

async function sellerSignup() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/devenir-vendeur`)
  await page.waitForTimeout(1_000)
  await page.getByLabel('Nom et prénom').fill('Vendeur QA KatiHub')
  await page.getByLabel('Téléphone').fill('+237698123456')
  await page.getByLabel('Adresse e-mail').fill(`seller.qa.${stamp}@example.cm`)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: /Continuer/ }).click()
  await page.getByLabel('Nom légal').fill(`Entreprise QA ${stamp}`)
  await page.getByLabel('NIU').fill(`M${stamp}`)
  await page.getByLabel('RCCM').fill(`RC/DLA/2026/B/${String(stamp).slice(-6)}`)
  await page.getByRole('button', { name: /Continuer/ }).click()
  await page.getByLabel('Nom de la boutique').fill(`Boutique QA ${stamp}`)
  await page.getByLabel('Description').fill('Boutique créée par le test de parcours complet KatiHub.')
  await page.getByRole('button', { name: /Envoyer ma candidature/ }).click()
  await page.getByRole('heading', { name: /est enregistrée/ }).waitFor()
  const shops = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('nowtech.session-locale.v1') ?? 'null')
    if (!session?.jeton) return { ok: false, reason: 'session_absente' }
    const response = await fetch('http://localhost:3101/v1/vendeurs/mes-boutiques', { headers: { Authorization: `Bearer ${session.jeton}` } })
    return { ok: response.ok, body: await response.json().catch(() => null) }
  })
  if (!shops.ok || !Array.isArray(shops.body) || !shops.body.some((shop) => shop.nom === `Boutique QA ${stamp}` && shop.statut === 'inactive')) throw new Error(`Compte vendeur non relié : ${JSON.stringify(shops)}`)
  await page.goto(`${base}/espace-vendeur`)
  await page.getByRole('heading', { name: 'Bienvenue sur votre espace vendeur' }).waitFor({ timeout: 10_000 })
  await page.screenshot({ path: `${process.env.TEMP ?? '.'}/katihub-seller-overview-desktop.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${process.env.TEMP ?? '.'}/katihub-seller-overview-mobile.png`, fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: /Vérification/ }).click()
  await page.getByLabel('Clé du fichier privé').fill(`vendeurs/qa-${stamp}/identite.pdf`)
  await page.getByRole('button', { name: 'Ajouter au dossier' }).click()
  await page.getByText('Justificatif ajouté au dossier.').waitFor({ timeout: 10_000 })
  await page.screenshot({ path: `${process.env.TEMP ?? '.'}/katihub-seller-workspace.png`, fullPage: true })
  return 'seller:ok workspace:ok document:ok'
}

try {
  const results = []
  results.push(await clientSignup())
  results.push(await sellerSignup())
  console.log(results.join(' '))
} finally {
  await browser.close()
}
