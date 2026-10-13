import { expect, test } from '@playwright/test'

import { simulerApi, type ApiSimulee } from './support/api'
import { commande, demandeClient, IDS, litigeBoutique, mission } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * Les actions de litige passent par des fenetres de saisie, plus par des
 * `window.prompt`. Chaque test verifie le corps envoye, la confirmation
 * explicite des decisions irreversibles et l'affichage du resultat.
 */

let api: ApiSimulee

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

const RETOUR_REFUSE = { id: IDS.retour, statut: 'refuse', quantite: 1, montantRembourseFcfa: 0, referenceRetour: null, motifDecision: 'Photo de remise conforme.' }

test.describe('client', () => {
  test('demande un retour avec quantité et motif, sans boîte de dialogue du navigateur', async ({ page }) => {
    let dossiers: unknown[] = [demandeClient()]
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
      .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, () => dossiers)
      .quand('POST', new RegExp(`^/marketplace/demandes-client/${IDS.demande}/retour$`), () => {
        dossiers = [demandeClient({ retour: { id: IDS.retour, statut: 'demande', quantite: 1, montantRembourseFcfa: 0, referenceRetour: null } })]
        return { status: 201, body: { id: IDS.retour } }
      })
    page.on('dialog', (dialogue) => { throw new Error(`boîte du navigateur inattendue : ${dialogue.message()}`) })

    await page.goto('/marketplace/commande/CM-E2E/suivi')
    await page.getByRole('button', { name: 'Demander un retour' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Demander un retour' })
    await fenetre.getByLabel('Motif du retour').fill('Écran fissuré dès le déballage.')
    await fenetre.getByRole('button', { name: 'Demander le retour' }).click()

    await expect(fenetre).toBeHidden()
    await expect(page.getByRole('status')).toContainText('demande de retour est envoyée')
    await expect(page.getByText('Retour :')).toBeVisible()
    expect(api.appelsVers('POST', /\/retour$/)[0]?.corps).toEqual({ ligneId: IDS.ligne, quantite: 1, motif: 'Écran fissuré dès le déballage.' })
  })

  test('ne peut contester un refus qu’après avoir confirmé le caractère définitif', async ({ page }) => {
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
      .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [demandeClient({ statut: 'en_attente_client', retour: RETOUR_REFUSE, capacites: { repondre: true, expedier: false, contester: true } })])
      .quand('POST', new RegExp(`^/marketplace/demandes-client/retours/${IDS.retour}/contestation$`), { status: 201, body: {} })

    await page.goto('/marketplace/commande/CM-E2E/suivi')
    await expect(page.getByText('Motif de la boutique : Photo de remise conforme.')).toBeVisible()
    await page.getByRole('button', { name: 'Contester la décision' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Contester la décision' })
    await fenetre.getByLabel('Pourquoi contestez-vous ?').fill('Le dommage est visible sous un autre angle.')
    const envoyer = fenetre.getByRole('button', { name: 'Envoyer la contestation' })
    await expect(envoyer).toBeDisabled()
    await fenetre.getByRole('checkbox').check()
    await envoyer.click()

    await expect(page.getByRole('status')).toContainText('transmise à KatiHub')
    expect(api.appelsVers('POST', /contestation$/)).toHaveLength(1)
  })

  test('voit les pièces avant l’envoi et les fichiers refusés avec leur raison', async ({ page }) => {
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
      .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [demandeClient()])
      .quand('POST', new RegExp(`^/marketplace/demandes-client/${IDS.demande}/messages/${IDS.message}/pieces$`), { status: 201, body: { id: 'piece-1' } })

    await page.goto('/marketplace/commande/CM-E2E/suivi')
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'ecran.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') },
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('texte') },
    ])
    const fenetre = page.getByRole('dialog', { name: 'Joindre des preuves' })
    await expect(fenetre.getByRole('img', { name: 'Aperçu de ecran.png' })).toBeVisible()
    await expect(fenetre.getByText('notes.txt : format non accepté')).toBeVisible()
    await fenetre.getByRole('button', { name: 'Joindre 1 fichier(s)' }).click()

    await expect(page.getByRole('status')).toContainText('1 pièce(s) jointe(s)')
    expect(api.appelsVers('POST', /\/pieces$/)).toHaveLength(1)
  })

  test('une erreur du serveur s’affiche dans la fenêtre, la saisie conservée', async ({ page }) => {
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/commandes\/CM-E2E$/, commande())
      .quand('GET', /^\/marketplace\/demandes-client\?commandeId=/, [demandeClient()])
      .quand('POST', new RegExp(`^/marketplace/demandes-client/${IDS.demande}/messages$`), { status: 409, body: { message: 'Cette demande ne reçoit plus de message' } })

    await page.goto('/marketplace/commande/CM-E2E/suivi')
    await page.getByRole('button', { name: 'Répondre' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Répondre' })
    await fenetre.getByLabel('Votre message').fill('Avez-vous reçu mes photos ?')
    await fenetre.getByRole('button', { name: 'Envoyer le message' }).click()

    await expect(fenetre.getByRole('alert')).toContainText('Cette demande ne reçoit plus de message')
    await expect(fenetre.getByLabel('Votre message')).toHaveValue('Avez-vous reçu mes photos ?')
  })
})

test.describe('vendeur', () => {
  test('autorise un retour en déclarant l’origine du problème, après confirmation', async ({ page }) => {
    const retour = { id: IDS.retour, statut: 'demande', motifClient: 'Écran fissuré.', motifDecision: null, motifContestation: null, referenceRetour: null }
    api = (await espaceVendeur(page, [litigeBoutique({ retour, capacites: { repondre: true, decider: true, recevoir: false, contester: false } })]))
      .quand('POST', new RegExp(`^/marketplace/demandes-client/retours/${IDS.retour}/decision$`), { status: 201, body: {} })

    await page.goto('/espace-vendeur')
    await page.getByRole('button', { name: 'Litiges et retours' }).click()
    await page.getByRole('button', { name: 'Autoriser le retour' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Autoriser le retour' })
    await fenetre.getByLabel('La livraison (colis abîmé pendant le transport)').check()
    await fenetre.getByLabel('Motif communiqué au client').fill('Choc visible sur le carton à la livraison.')
    await expect(fenetre.getByRole('button', { name: 'Autoriser', exact: true })).toBeDisabled()
    await fenetre.getByRole('checkbox').check()
    await fenetre.getByRole('button', { name: 'Autoriser', exact: true }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Retour autorisé' })).toBeVisible()
    expect(api.appelsVers('POST', /\/decision$/)[0]?.corps).toEqual({
      decision: 'autorise', motif: 'Choc visible sur le carton à la livraison.', responsable: 'agent_livraison', fraisRetourFcfa: 0,
    })
  })
})

test.describe('livreur', () => {
  test('prend en charge un colis avec la référence du bordereau, sans en exposer la valeur', async ({ page }) => {
    let missions = [mission({ statut: 'affectee' })]
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/expeditions\/miennes$/, () => missions)
      .quand('POST', new RegExp(`^/marketplace/expeditions/${IDS.expedition}/prise-en-charge$`), () => {
        missions = [mission({ statut: 'prise_en_charge' })]
        return { status: 201, body: {} }
      })

    await page.goto('/espace-livreur')
    await page.getByRole('button', { name: 'Prendre en charge' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Prendre en charge CM-E2E-E1' })
    await fenetre.getByLabel('Référence du bordereau ou du colis').fill('BRD-48213')
    await fenetre.getByRole('button', { name: 'Confirmer la prise en charge' }).click()

    await expect(page.getByRole('status')).toContainText('pris en charge')
    await expect(page.getByRole('button', { name: 'Démarrer la livraison' })).toBeVisible()
    const corps = api.appelsVers('POST', /prise-en-charge$/)[0]?.corps as { type: string; empreinteSha256: string }
    expect(corps.type).toBe('scan_etiquette')
    expect(corps.empreinteSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(corps)).not.toContain('BRD-48213')
  })

  test('ne déclare un colis perdu qu’après confirmation explicite', async ({ page }) => {
    api = (await simulerApi(page))
      .quand('GET', /^\/marketplace\/expeditions\/miennes$/, [mission()])
      .quand('POST', new RegExp(`^/marketplace/expeditions/${IDS.expedition}/incidents$`), { status: 201, body: {} })

    await page.goto('/espace-livreur')
    await page.getByRole('button', { name: 'Déclarer un incident' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Incident sur CM-E2E-E1' })
    await fenetre.getByLabel('Colis perdu').check()
    await fenetre.getByLabel('Détails').fill('Colis introuvable après le dépôt au relais.')
    const declarer = fenetre.getByRole('button', { name: 'Déclarer l’incident' })
    await expect(declarer).toBeDisabled()
    await fenetre.getByRole('checkbox').check()
    await declarer.click()

    await expect(page.getByRole('status')).toContainText('Incident déclaré')
    expect(api.appelsVers('POST', /incidents$/)[0]?.corps).toEqual({ statut: 'perdue', motif: 'Colis introuvable après le dépôt au relais.' })
  })
})
