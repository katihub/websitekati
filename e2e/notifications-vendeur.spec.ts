import { expect, test } from '@playwright/test'

import type { ApiSimulee } from './support/api'
import { IDS } from './support/donnees'
import { espaceVendeur } from './support/espace-vendeur'

/**
 * LA CLOCHE DE L'ESPACE VENDEUR : le compteur des non lues, les dernieres
 * notifications, et l'ouverture qui marque lue et mene a la bonne rubrique.
 */
let api: ApiSimulee
const boite = `/notifications-app/boutiques/${IDS.boutique}`
const notifications = [
  { id: '00000000-0000-4000-8000-000000000c01', type: 'commande.nouvelle', titre: 'Nouvelle commande KM-1-A', texte: '2 article(s) à préparer, 150 000 XAF.', lien: '/espace-vendeur?rubrique=orders', creeLe: new Date().toISOString(), lu: false },
  { id: '00000000-0000-4000-8000-000000000c02', type: 'messagerie.equipe', titre: 'Message de l’équipe KatiMarket : Reversement', texte: 'Billy : Le virement part demain.', lien: '/espace-vendeur?rubrique=messages', creeLe: new Date(Date.now() - 3_600_000).toISOString(), lu: true },
]

test.afterEach(() => {
  expect(api.nonPrevues, 'appels non simules').toEqual([])
  expect(api.erreursNavigateur, 'erreurs du navigateur').toEqual([])
})

test('la boutique voit ses notifications, en ouvre une et arrive sur la bonne rubrique', async ({ page }) => {
  let nonLues = 1
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^${boite}/compteur$`), () => ({ nonLues }))
    .quand('GET', new RegExp(`^${boite}\\?limite=8$`), () => ({ elements: notifications, nonLues, suivant: null }))
    .quand('POST', new RegExp(`^${boite}/${notifications[0]!.id}/lue$`), () => { nonLues = 0; return { nonLues } })

  await page.goto('/espace-vendeur')
  const cloche = page.getByTestId('cloche-notifications')
  await expect(page.getByTestId('cloche-pastille')).toHaveText('1')
  await expect(cloche).toHaveAccessibleName('Notifications, 1 non lue(s)')

  await cloche.click()
  const panneau = page.getByTestId('cloche-panneau')
  await expect(panneau.getByTestId('notification-ligne')).toHaveCount(2)
  await expect(panneau.getByTestId('notification-ligne').first()).toHaveAttribute('data-lu', 'non')
  await expect(panneau).toContainText('Billy : Le virement part demain.')

  await panneau.getByText('Nouvelle commande KM-1-A').click()
  await expect(page.getByRole('heading', { name: 'Commandes de la boutique', level: 1 })).toBeVisible()
  await expect(page.getByTestId('cloche-pastille')).toHaveCount(0)
  expect(api.appelsVers('POST', new RegExp(`^${boite}/[^/]+/lue$`))).toHaveLength(1)
})

test('« tout marquer comme lu » vide la pastille', async ({ page }) => {
  let nonLues = 3
  api = (await espaceVendeur(page, []))
    .quand('GET', new RegExp(`^${boite}/compteur$`), () => ({ nonLues }))
    .quand('GET', new RegExp(`^${boite}\\?limite=8$`), () => ({ elements: notifications, nonLues, suivant: null }))
    .quand('POST', new RegExp(`^${boite}/tout-lu$`), () => { nonLues = 0; return { nonLues } })

  await page.goto('/espace-vendeur')
  await expect(page.getByTestId('cloche-pastille')).toHaveText('3')
  await page.getByTestId('cloche-notifications').click()
  await page.getByTestId('cloche-tout-lu').click()
  await expect(page.getByTestId('cloche-pastille')).toHaveCount(0)
  expect(api.appelsVers('POST', new RegExp(`^${boite}/tout-lu$`))).toHaveLength(1)
})
