import { expect, test, type Request } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LA MESSAGERIE KATI DE L'ESPACE VENDEUR : la boutique ouvre une conversation
 * avec l'equipe, lit la reponse signee et repond dans le meme fil.
 */
let api: ApiSimulee
const CONVERSATION = '00000000-0000-4000-8000-000000000a01'
const base = `/messagerie-vendeurs/boutiques/${IDS.boutique}`
const fil = (messages: unknown[], statut = 'ouverte') => ({ id: CONVERSATION, sujet: 'Reversement de septembre', statut, dernierMessageLe: '2026-11-03T10:00:00.000Z', creeLe: '2026-11-03T09:00:00.000Z', messages })
const question = { id: 'm1', auteurType: 'vendeur', auteurNom: 'Awa (Maison Kati)', contenu: 'Quand est versé mon solde ?', creeLe: '2026-11-03T09:00:00.000Z' }
const reponse = { id: 'm2', auteurType: 'equipe', auteurNom: 'Billy', contenu: 'Le virement part demain.', creeLe: '2026-11-03T10:00:00.000Z' }

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('la boutique écrit à l’équipe KATI, lit sa réponse et répond dans le fil', async ({ page }) => {
  const envoyes: unknown[] = []
  let conversations: unknown[] = []
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^${base}$`), () => conversations)
    .quand('POST', new RegExp(`^${base}$`), (requete: Request) => {
      envoyes.push(requete.postDataJSON())
      conversations = [{ id: CONVERSATION, sujet: 'Reversement de septembre', statut: 'ouverte', dernierMessageLe: '2026-11-03T10:00:00.000Z', nonLus: 1 }]
      return { id: CONVERSATION }
    })
    .quand('GET', new RegExp(`^${base}/${CONVERSATION}$`), fil([question, reponse]))
    .quand('POST', new RegExp(`^${base}/${CONVERSATION}/messages$`), (requete: Request) => {
      envoyes.push(requete.postDataJSON())
      return fil([question, reponse, { id: 'm3', auteurType: 'vendeur', auteurNom: 'Awa (Maison Kati)', contenu: 'Merci !', creeLe: '2026-11-03T10:05:00.000Z' }])
    })

  await page.goto('/espace-vendeur')
  await page.getByRole('button', { name: 'Messagerie KATI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Messagerie KATI', level: 1 })).toBeVisible()
  await expect(page.getByText('Aucune conversation pour le moment.')).toBeVisible()

  await page.getByTestId('messagerie-nouvelle').click()
  await page.getByTestId('messagerie-sujet').fill('Reversement de septembre')
  await page.getByTestId('messagerie-contenu').fill('Quand est versé mon solde ?')
  await page.getByTestId('messagerie-envoyer').click()

  await expect(page.getByTestId('messagerie-fil')).toContainText('Le virement part demain.')
  await expect(page.getByTestId('messagerie-fil')).toContainText('Billy · équipe KATI')
  expect(envoyes[0]).toEqual({ sujet: 'Reversement de septembre', contenu: 'Quand est versé mon solde ?' })

  await page.getByTestId('messagerie-reponse').fill('Merci !')
  await page.getByTestId('messagerie-repondre').click()
  await expect(page.getByTestId('messagerie-fil')).toContainText('Merci !')
  expect(envoyes[1]).toEqual({ contenu: 'Merci !' })
})
