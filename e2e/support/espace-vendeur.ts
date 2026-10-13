import type { Page } from '@playwright/test'

import { simulerApi } from './api'
import { boutique, espaceBoutique, IDS } from './donnees'

const vide = { total: 0, elements: [] }

/** Toutes les sections que l'espace vendeur charge a l'ouverture d'une boutique. */
export async function espaceVendeur(page: Page, litiges: unknown[]) {
  const b = IDS.boutique
  return (await simulerApi(page))
    .quand('GET', /^\/vendeurs\/mes-boutiques$/, [boutique()])
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}$`), espaceBoutique())
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/documents$`), [])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${b}/propositions-produits$`), [])
    .quand('GET', new RegExp(`^/marketplace/boutiques/${b}/offres$`), [])
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/(commandes|livraisons|paiements|avis)`), vide)
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/clients`), { elements: [] })
    .quand('GET', new RegExp(`^/vendeurs/mes-boutiques/${b}/membres$`), [])
    .quand('GET', new RegExp(`^/marketplace/finance/boutiques/${b}$`), { soldes: { disponibleFcfa: 0, geleFcfa: 0 }, destinations: [], retraits: [], transactions: [] })
    .quand('GET', new RegExp(`^/marketplace/demandes-client/boutiques/${b}$`), () => litiges)
}
