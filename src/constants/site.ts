/**
 * The business facts, in one place.
 *
 * Every one of these is read off the live nowtechcenter.com pages, not
 * invented. They appear in the footer, the service strip, the product page and
 * the checkout, so they live here rather than being retyped in each component.
 */

export const SITE = {
  name: 'NowTech Center',
  shortName: 'NowTech',
  /** The storefront is French-first: the market is Cameroon and the catalog is French. */
  locale: 'fr-FR',
  currency: 'XAF',
} as const

/**
 * `tel:` and `wa.me` both want the number with no spaces and no plus.
 *
 * The numbers themselves are not here: they are the counters' lines, published
 * by the panel and read through `shopPhones` and `shopWhatsapp` in
 * `lib/comptoirs`.
 */
export function dialable(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

/**
 * Named on the page rather than drawn as card marks. Two of the four are mobile
 * money wallets with no payment-network artwork we hold a licence for, and a row
 * of Visa and Mastercard logos would misstate what this shop actually accepts.
 */
export const PAYMENT_METHODS: readonly string[] = [
  'Espèces au retrait',
  'Espèces à la livraison',
  'MTN Mobile Money',
  'Orange Money',
  'Virement bancaire',
]

/**
 * Delivery is a browse-time constraint, not a checkout detail: home delivery
 * and pickup points exist in Douala and Yaoundé only. Everywhere else ships by
 * intercity travel agency, which changes the lead time and the payment options.
 */
export const DELIVERY_CITIES: readonly string[] = ['Douala', 'Yaoundé']

/**
 * The four operating facts.
 *
 * A function and not a list because the first one is the panel's: where to
 * collect is read from the published counters (`pickupLine` in `lib/comptoirs`)
 * and handed in. `null` when those could not be read, and the fact is then
 * stated without a place rather than with one the shop may have closed.
 */
/**
 * `delai` est le délai réglé dans le panel pour UN produit, déjà mis en mots
 * par `formatDelai`. Sans lui — accueil, contact, ou produit sans délai —
 * la ligne garde la promesse générale de la maison.
 */
export function servicePoints(
  pickupLine: string | null,
  delai: string | null = null,
): readonly { title: string; detail: string | null }[] {
  return [
    { title: 'Retrait le jour même', detail: pickupLine },
    {
      title: delai ? `Livraison en ${delai}` : 'Livraison 24 à 48 h',
      detail: 'Douala et Yaoundé, agence de voyage ailleurs',
    },
    { title: 'Paiement à la livraison', detail: 'Espèces, MTN Mobile Money, Orange Money' },
    { title: 'Garantie constructeur', detail: 'De 1 à 24 mois selon le produit' },
  ]
}

export const VAT_RATE = 0.1925
