import { chromium } from 'playwright'
import { strict as assert } from 'node:assert'
import { join } from 'node:path'

const base = process.env.QA_BASE ?? 'http://127.0.0.1:3011'
const out = process.env.TEMP ?? '.'
const now = new Date().toISOString()

const order = {
  id: '00000000-0000-4000-8000-000000000001', reference: 'CM-RECETTE', statut: 'confirmee',
  totalFermeTtc: 200000, acompteDu: 40000, acompteRecu: 40000, resteAPayer: 160000,
  sousCommandes: [{
    id: '00000000-0000-4000-8000-000000000002', reference: 'CM-RECETTE-1', statut: 'prete',
    boutique: { nom: 'Maison Kati', slug: 'maison-kati' },
    lignes: [{ id: '00000000-0000-4000-8000-000000000003', offreTitreCapture: 'Téléphone recette', quantite: 1, quantiteLivree: 0, quantiteRetournee: 0, quantiteRemboursee: 0, totalNetFcfa: 200000 }],
    expeditions: [{ id: '00000000-0000-4000-8000-000000000004', reference: 'CM-RECETTE-E1', statut: 'en_livraison', ville: 'Douala', montantACollecterFcfa: 160000, livreeLe: null, evenements: [{ id: 'evt-1', type: 'depart_livraison', versStatut: 'en_livraison', motif: null, creeLe: now }] }],
  }],
}
const mission = {
  id: '00000000-0000-4000-8000-000000000004', reference: 'CM-RECETTE-E1', statut: 'en_livraison', ville: 'Douala', adresseFigee: { quartier: 'Akwa', repere: 'Face mairie' }, montantACollecterFcfa: 160000, livraisonPrevueDebut: now, livraisonPrevueFin: null,
  sousCommande: { reference: 'CM-RECETTE-1', boutique: { nom: 'Maison Kati' }, commande: { reference: 'CM-RECETTE', telephoneLivraison: '699000000' } }, evenements: [],
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
await page.route('**/v1/**', async (route) => {
  const path = new URL(route.request().url()).pathname
  const body = path.endsWith('/marketplace/expeditions/miennes') ? [mission]
    : path.includes('/marketplace/demandes-client') ? [] : order
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
})

await page.goto(`${base}/marketplace/commande/CM-RECETTE/suivi`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Commande CM-RECETTE' }).waitFor()
assert.equal(await page.getByText('Téléphone recette × 1').count(), 1)
await page.screenshot({ path: join(out, 'katihub-suivi-client-mobile.png'), fullPage: true })

await page.goto(`${base}/espace-livreur`, { waitUntil: 'networkidle' })
await page.getByRole('heading', { name: 'Mes missions' }).waitFor()
assert.equal(await page.getByRole('button', { name: /Envoyer le code client/ }).count(), 1)
assert.equal(await page.getByLabel('Code à 6 chiffres').count(), 1)
await page.screenshot({ path: join(out, 'katihub-missions-livreur-mobile.png'), fullPage: true })

await browser.close()
if (errors.length) throw new Error(errors.join('\n'))
console.log('Interfaces client et livreur validées sans erreur navigateur.')
