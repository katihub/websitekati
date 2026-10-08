import type { RayonId } from '@/types/catalogue'

/**
 * The homepage's merchandising decisions.
 *
 * Everything else on this page is a query: the counts, the products, the
 * families, the brands and the arrival dates all come out of the catalog and
 * change when the catalog does. What lives here is the small amount that cannot
 * be derived, which is the argument the shop makes about itself in the first
 * screen.
 *
 * Three rules keep this file from turning into a CMS:
 *
 *   1. A slot binds to a department id, never to a product id or a category
 *      name. If the taxonomy moves, the copy follows it.
 *   2. Every number in the copy is a placeholder resolved at render from the
 *      live count, so nothing here can go stale into a lie.
 *   3. If a sentence could have been written by reading the data, it belongs in
 *      the data layer instead.
 */

export interface DepartmentCard {
  /**
   * Written as separate lines. Where a headline breaks is a design decision and
   * the browser is not the one making it.
   */
  readonly headline: readonly string[]
  /** `{n}` is replaced by the department's live reference count. */
  readonly body: string
  readonly cta: string
}

/**
 * Twelve cards, one per department, because the rail beside them has twelve
 * rows and every row now has to lead somewhere.
 *
 * A LINE IS AT MOST TWENTY-FOUR CHARACTERS. That is not a style rule, it is the
 * width of the column at the size the display token sets: past it the browser
 * breaks the line again and a headline written as two comes out as four. Where
 * a sentence would not fit, the sentence was cut rather than the type.
 *
 * This is the largest hand-written thing on the site and it earns its place.
 * The alternative was to generate each card from the department name and its
 * one-line tagline, which produces twelve grammatically identical panels and
 * teaches a visitor nothing they could not read off the rail itself. A card is
 * the only place where the shop gets to say why a department exists, and the
 * only twelve sentences on the page that a customer will actually remember.
 *
 * Every claim is checkable against the catalog: the brands named are brands the
 * shop genuinely carries in that department, and the counts come from the data.
 */
export const DEPARTMENT_CARDS: Readonly<Record<RayonId, DepartmentCard>> = {
  power: {
    headline: ['Le courant tombe.', 'Vos machines, non.'],
    body:
      'Onduleurs, régulateurs, batteries et solaire, dimensionnés avec vous. ' +
      '{n} références au catalogue, à Douala et Yaoundé.',
    cta: 'Voir le rayon énergie',
  },
  security: {
    headline: ['La surveillance,', 'du capteur à l’écran.'],
    body:
      'Caméras, enregistreurs, contrôle d’accès et interphonie. ' +
      '{n} références, dont Hikvision, Dahua et Uniview, posées et configurées par l’atelier.',
    cta: 'Voir le rayon sécurité',
  },
  network: {
    headline: ['Un réseau', 'qui tient la charge.'],
    body:
      'Commutation, points d’accès, fibre et baies de brassage. ' +
      '{n} références, du bureau de trois postes au site industriel.',
    cta: 'Voir le rayon réseaux',
  },
  computing: {
    headline: ['Le poste de travail,', 'prêt à brancher.'],
    body:
      'Portables, unités centrales, écrans et serveurs HP, Lenovo, Dell et Apple. ' +
      '{n} références, garanties de 1 à 24 mois.',
    cta: 'Voir le rayon ordinateurs',
  },
  printing: {
    headline: ['Imprimer aujourd’hui,', 'et dans deux ans.'],
    body:
      'Laser, jet d’encre, étiqueteuses et scanners, avec les encres et les tambours qui vont ' +
      'avec. {n} références, dont Canon, HP, Epson et Ricoh.',
    cta: 'Voir le rayon impression',
  },
  appliance: {
    headline: ['Le froid, le lavage,', 'la cuisson.'],
    body:
      'Réfrigérateurs, congélateurs, machines à laver, climatiseurs et cuisson. ' +
      '{n} références, livrées et raccordées à Douala et Yaoundé.',
    cta: 'Voir le rayon électroménager',
  },
  smart: {
    headline: ['Ce qui capte,', 'ce qui vole.'],
    body:
      'Appareils photo, caméscopes, drones, GPS et objets connectés. ' +
      '{n} références, du reflex au traceur de randonnée.',
    cta: 'Voir le rayon photo et drones',
  },
  vision: {
    headline: ['L’image et le son,', 'du salon à la salle.'],
    body:
      'Téléviseurs, vidéoprojecteurs, hi-fi et électroménager. ' +
      '{n} références, dont LG, Hisense, Epson et Skill Tech.',
    cta: 'Voir le rayon TV et audio',
  },
  connectics: {
    headline: ['Le bon câble,', 'du premier coup.'],
    body:
      'Câbles, adaptateurs, convertisseurs, splitters et extendeurs. ' +
      '{n} références en HDMI, VGA, DisplayPort, USB-C et réseau.',
    cta: 'Voir le rayon connectiques',
  },
  storage: {
    headline: ['De la clé USB', 'à la baie NAS.'],
    body:
      'Disques internes et externes, SSD, cartes mémoire et stockage réseau Synology et QNAP. ' +
      '{n} références, du poste isolé au serveur de sauvegarde.',
    cta: 'Voir le rayon stockage',
  },
  telecom: {
    headline: ['Un standard qui sonne', 'dans tout le bâtiment.'],
    body:
      'IPBX, passerelles GSM et postes IP Grandstream, Yealink, Panasonic et Cisco. ' +
      '{n} références pour l’entreprise.',
    cta: 'Voir le rayon télécom',
  },
  mobile: {
    headline: ['Le téléphone,', 'et de quoi le tenir.'],
    body:
      'Smartphones, tablettes et accessoires de charge et d’écoute. ' +
      '{n} références, dont Tecno, Infinix, Xiaomi et Oraimo.',
    cta: 'Voir le rayon mobiles',
  },
  office: {
    headline: ['Ce qui fait tourner', 'le comptoir.'],
    body:
      'Caisses enregistreuses, compteurs et détecteurs de billets, outillage, sérigraphie et ' +
      'matériel de bureau. {n} références.',
    cta: 'Voir le rayon bureautique',
  },
  services: {
    headline: ['Repris, remis à neuf,', 'et posé chez vous.'],
    body:
      'Postes et écrans reconditionnés, installation, maintenance et prestations d’atelier ' +
      'facturées à la ligne. {n} références.',
    cta: 'Voir le rayon services',
  },
}

export interface PromoBanner {
  readonly universeId: RayonId
  readonly headline: string
  readonly body: string
}

/**
 * The banner band under the deck.
 *
 * Six, not two, because the band now travels: it shows two at a time and walks
 * through three pages on its own. Two panels sitting still were a pair of
 * shortcuts; six that move are the shop saying it has more than two counters.
 *
 * These are the slots a designer's artwork will land in. Until it does, each
 * panel is a real department with its live count, so the band is never a row of
 * grey rectangles waiting for a delivery, and the day the images arrive the copy
 * they replace was true.
 */
export const PROMO_BANNERS: readonly PromoBanner[] = [
  {
    universeId: 'computing',
    headline: 'Portables, bureaux et serveurs',
    body: 'HP, Lenovo, Dell et Apple. {n} références, garanties de 1 à 24 mois.',
  },
  {
    universeId: 'printing',
    headline: 'Imprimantes et consommables d’origine',
    body: 'Laser, jet d’encre, étiqueteuses et scanners. {n} références, encres et toners suivis.',
  },
  {
    universeId: 'security',
    headline: 'Vidéosurveillance posée et configurée',
    body: 'Caméras, enregistreurs et contrôle d’accès. {n} références, du kit boutique au site classé.',
  },
  {
    universeId: 'network',
    headline: 'Du switch de bureau à la baie complète',
    body: 'Commutation, points d’accès, fibre et brassage. {n} références testées avant de sortir.',
  },
  {
    universeId: 'power',
    headline: 'Onduleurs, régulateurs et solaire',
    body: 'De la mini-UPS au tour modulaire. {n} références, dimensionnées avec vous.',
  },
  {
    universeId: 'storage',
    headline: 'Disques, SSD et baies NAS',
    body: 'Interne, externe, serveur et réseau. {n} références, Synology et QNAP compris.',
  },
]

/**
 * The departments the counter section covers.
 *
 * The six that the promo pair and the opening sequence do not reach. Stated as
 * an explicit list rather than derived by subtraction, so the section's promise
 * stays true if the opening is ever re-pointed.
 */
export const COUNTER_TOUR: readonly RayonId[] = [
  'vision',
  'storage',
  'connectics',
  'telecom',
  'mobile',
  'office',
]

/**
 * The four lists behind the tabs.
 *
 * Each is a filter a buyer would actually apply, and each returns a real slice
 * of this catalog: 513 products are discounted 40% or more, 1 554 sit under
 * 50 000 FCFA and 574 sit above 500 000. A "trending" or "best seller" tab is
 * deliberately absent, because the export carries no order history and
 * inventing one would be the only dishonest thing on the page.
 *
 * EACH RULE STATES ITS FILTER AND NOTHING ELSE. Three of the four used to name
 * the product families a shopper would expect to find, and all three were
 * wrong: "équipement pro, serveurs et onduleurs" returned laptops and an
 * all-in-one, and "remise constructeur sur le prix conseillé" named an issuer
 * and a reference price the export does not carry, since the struck price is
 * simply the shop's own previous price. A rule that describes anything the
 * filter does not do is a claim, and a claim the reader can check against the
 * ten products underneath it.
 */
export type SelectionId = 'nouveautes' | 'affaires' | 'petits-prix' | 'pro'

export interface SelectionDefinition {
  readonly id: SelectionId
  readonly label: string
  /** Sits under the grid, naming the rule the list follows. */
  readonly rule: string
}

export const SELECTIONS: readonly SelectionDefinition[] = [
  {
    id: 'nouveautes',
    label: 'Nouveautés',
    rule: 'Les dernières références entrées au catalogue.',
  },
  {
    id: 'affaires',
    label: 'Bonnes affaires',
    rule: 'Remise de 40 % ou plus sur le prix habituel de la boutique.',
  },
  {
    id: 'petits-prix',
    label: 'Sous 50 000 FCFA',
    rule: 'Tous rayons confondus, sous 50 000 FCFA.',
  },
  {
    id: 'pro',
    label: 'Équipement pro',
    rule: 'Tous rayons confondus, au-delà de 500 000 FCFA.',
  },
]
