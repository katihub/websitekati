/**
 * LES COORDONNEES DE KATIMARKET, la plateforme : celles que le client appelle
 * pour une commande, un paiement ou une boutique. Distinctes des points
 * d'accueil, que le panel publie un par un (`/vitrine/points-vente`), et du
 * telephone que chaque boutique affiche sur sa propre page.
 */
export const SUPPORT_WHATSAPP = '+237 6 81 95 81 69'
export const SUPPORT_WHATSAPP_NUMBERS = [SUPPORT_WHATSAPP, '+237 6 88 91 32 27'] as const

export const CONTACT_MARKETPLACE = {
  telephones: ['+237 6 88 91 32 27', SUPPORT_WHATSAPP],
  adresse: 'Akwa, Douala',
} as const

/** Le numero tel quel pour un lien `tel:` : le plus et les chiffres. */
export const lienTelephone = (numero: string) => `tel:${numero.replace(/[^\d+]/g, '')}`
