import type { ShopIconName } from '@/components/marketplace/ShopIcon'

/** L'ancre de la zone « Logo et bannière » dans les paramètres de la boutique. */
export const ANCRE_VISUELS = 'logo-et-banniere'

export type CibleRaccourci =
  | { readonly panel: 'verification' }
  | { readonly panel: 'settings'; readonly ancre: string }
  | { readonly href: string }

export interface RaccourciVendeur {
  readonly id: 'verification' | 'visuels' | 'contrat' | 'reglement'
  readonly titre: string
  readonly description: string
  readonly action: string
  readonly icone: ShopIconName
  readonly cible: CibleRaccourci
  readonly disponible: boolean
}

/**
 * Les cartes sous « Avancer aujourd'hui ». Les memes droits que la barre
 * laterale : la verification suit l'acces aux justificatifs, les parametres
 * sont reserves au proprietaire et au gestionnaire ; les pages legales sont
 * ouvertes a tous les membres. Une boutique deja validee n'a plus de carte
 * de verification.
 */
export function raccourcisVendeur({ roles, documents, en, verifiee = false }: {
  roles: readonly string[]
  documents: 'allowed' | 'denied' | 'error'
  en: boolean
  verifiee?: boolean
}): RaccourciVendeur[] {
  const gereLaBoutique = roles.some((role) => role === 'proprietaire' || role === 'gestionnaire')
  const cartes: RaccourciVendeur[] = [
    {
      id: 'verification',
      titre: en ? 'Verify my shop' : 'Vérifier ma boutique',
      description: en ? 'Send your documents to open sales.' : 'Envoyez vos justificatifs pour ouvrir la vente.',
      action: en ? 'Complete my verification' : 'Compléter ma vérification',
      icone: 'shield',
      cible: { panel: 'verification' },
      disponible: documents === 'allowed',
    },
    {
      id: 'visuels',
      titre: en ? 'Customise my shop' : 'Personnaliser ma boutique',
      description: en ? 'A logo and a banner make your shop easy to recognise.' : 'Un logo et une bannière rendent votre boutique reconnaissable.',
      action: en ? 'Add my logo / banner' : 'Ajouter mon logo / bannière',
      icone: 'star',
      cible: { panel: 'settings', ancre: ANCRE_VISUELS },
      disponible: gereLaBoutique,
    },
    {
      id: 'contrat',
      titre: en ? 'Seller agreement' : 'Contrat vendeur',
      description: en ? 'Your rights and duties as a KatiMarket seller.' : 'Vos droits et obligations de vendeur KatiMarket.',
      action: en ? 'Read the agreement' : 'Consulter le contrat',
      icone: 'file',
      cible: { href: '/contrat-vendeurs' },
      disponible: true,
    },
    {
      id: 'reglement',
      titre: en ? 'Platform rules' : 'Règlement de la plateforme',
      description: en ? 'The terms of sale that apply to your customers.' : 'Les conditions générales de vente appliquées à vos clients.',
      action: en ? 'Read the rules' : 'Consulter le règlement',
      icone: 'info',
      cible: { href: '/conditions-generales-vente' },
      disponible: true,
    },
  ]
  return verifiee ? cartes.filter((carte) => carte.id !== 'verification') : cartes
}
