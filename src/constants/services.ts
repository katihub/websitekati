/**
 * The workshop's trades, and the rule that files its own records under them.
 *
 * WHY THIS FILE EXISTS. `/services` used to print one flat price list read
 * straight off a WooCommerce term, and a reader who arrived asking "what do you
 * know how to do" was handed nineteen rows sorted by price. Nineteen rows is a
 * catalogue. Five trades is an answer. Nothing here adds a prestation, a rate
 * or a lead time: a trade is a HEADING OVER RECORDS THAT ALREADY EXIST, and if
 * no record matches, the heading is not drawn.
 *
 * THE ORDER OF THE FIRST FOUR IS NOT A PREFERENCE. `constants/assistant.ts`
 * already answers the installation question with one sentence, "vidéosurveillance,
 * réseau, contrôle d'accès, onduleurs et solaire", and that sentence is the only
 * public claim this shop makes about its own workshop. The four headings below
 * are that sentence, split. The fifth exists because the supplier filed
 * accounting, customs, joinery, graphic design and car mechanics under the same
 * term, and hiding them would be editing the shop rather than describing it.
 *
 * MATCHED ON A FOLDED NAME, NEVER ON A HAND-PICKED LIST OF IDS. The export
 * spells the same word three ways inside nineteen rows: `Controle d'accès` with
 * no circumflex, `Energie solaire` and `d'energie solaire` with no acute,
 * `INSTALLATION ELECTRIQUE` in capitals beside `installation du kit`. An id list
 * would be right today and silently wrong at the next rebuild; a fold to
 * lowercase unaccented text is right in both.
 */

/**
 * THE ONE PICTURE A TRADE IS ALLOWED TO CARRY, AND THE ONLY DOWNLOADED
 * PHOTOGRAPHS ON THIS ENTIRE STOREFRONT.
 *
 * THE RULE EVERYWHERE ELSE IS THAT WE ILLUSTRATE WITH WHAT THE SHOP OWNS. The
 * catalogue holds 4 215 packshots, so a family, a rayon and a brand each get to
 * show a real product they actually sell, which is free, unambiguous and true.
 * `/services` is the one page that cannot do that, and the reason is structural
 * rather than editorial: THE WORKSHOP DOES NOT SELL A PHOTOGRAPHABLE OBJECT. A
 * technician's morning on a ladder has no packshot, and the fourteen pieces of
 * hardware that share the supplier's term are exactly the confusion this page
 * was rewritten to remove. Printing a laptop next to "installation de caméras"
 * would put the mistake straight back.
 *
 * SO FIVE PICTURES WERE DOWNLOADED, ONCE, AND THEY LIVE ON OUR ORIGIN. Free
 * licence, checkable in one click from `source`, served from `/metiers/` and
 * never hot-linked to anybody's CDN: a storefront whose audience pays for its
 * megabytes does not put five third-party requests on a page it controls.
 *
 * WHAT THEY MAY AND MAY NOT SHOW, and this is the part that matters more than
 * the licence. Not one of them may be read as a photograph of NowTech. No
 * identifiable person appears in any of the five, no shopfront, no signage, no
 * branded van, nothing that a reader could take for the counters in Akwa or for
 * the people behind them. They are pictures of the TRADE, not of the firm, and
 * because a picture cannot say that about itself the page says it in words
 * underneath, in `PHOTO_NOTE`. A page whose whole argument is that it invents
 * nothing cannot open with an image that implies something.
 *
 * The subjects are the trades themselves, read off the records that group under
 * each heading: a camera on a wall, a patch panel, a roof of solar modules, an
 * opened laptop on a bench, a joiner's tool wall. Nothing is generated, nothing
 * is an office stock scene, and nothing is a picture of a happy customer.
 */
export interface TradePhoto {
  /** File in `public/metiers/`, extension included. */
  readonly file: string
  /**
   * What the picture shows, for a reader who cannot see it. It describes the
   * PICTURE and never the shop: the card beside it already carries the trade.
   */
  readonly alt: string
  /** The photographer, spelled as the source page spells it. */
  readonly author: string
  /** The photo's own page, so the licence can be checked without asking us. */
  readonly source: string
}

export interface Trade {
  readonly id: string
  /** The heading a reader sees. Describes the records under it, never more. */
  readonly label: string
  /**
   * Tested against {@link fold}ed names, so every pattern here is lowercase and
   * unaccented on purpose. FIRST MATCH WINS, so the order below is the rule.
   */
  readonly match: RegExp
  /** The trade's one illustration. See {@link TradePhoto}. */
  readonly photo: TradePhoto
}

/**
 * The sentence that stops five photographs from becoming five claims.
 *
 * Printed under the shelf, at the smallest size on the page, because it is a
 * caption and not an argument. It states the licence and it states the thing a
 * reader would otherwise assume, which is that these are our walls and our
 * technicians. They are not.
 */
export const PHOTO_NOTE =
  'Photographies d’illustration du métier, sous licence Unsplash. Ce ne sont ni les locaux, ' +
  'ni les chantiers, ni les équipes de NowTech.'

export const TRADES: readonly Trade[] = [
  {
    id: 'surveillance',
    label: 'Vidéosurveillance et contrôle d’accès',
    // `incendie` and `interphone` sit here rather than in their own headings:
    // one record each, and a heading over a single line is a bullet with a
    // title. They are the same trade to the same technician on the same wall.
    match: /camera|surveillance|pointeuse|biometrique|controle d.acces|incendie|interphone/,
    photo: {
      file: 'videosurveillance.jpg',
      alt: 'Deux caméras de surveillance fixées sur les deux pans d’un bardage métallique.',
      author: 'Miłosz Klinowski',
      source: 'https://unsplash.com/photos/two-grey-cctv-cameras-BW0d0IllW8E',
    },
  },
  {
    id: 'reseau',
    label: 'Réseau, téléphonie IP et internet',
    // `securite informatique` is a network job in these records, not a camera
    // job: the line reads "solutions de sécurité informatique". Tested before
    // the bare `informatique` of the next entry for that reason.
    match: /reseau|telephonie|internet|antenne|vsat|nanostation|powerbeam|securite informatique/,
    photo: {
      file: 'reseau.jpg',
      alt: 'Une baie de brassage vue de face : panneaux, commutateurs et jarretières turquoise et jaunes.',
      author: 'Yuriy Vertikov',
      source:
        'https://unsplash.com/photos/server-rack-with-multiple-wires-and-cables-attached-c-lSQecD9oI',
    },
  },
  {
    id: 'energie',
    label: 'Énergie solaire, backup et électricité',
    // `electr` and not `electri`: the shoutiest line in the term is
    // "INSTALLATION ELECTRIQUE ET ÉLECTROTECHNIQUE", and the second word folds
    // to `electrotechnique`.
    match: /energie|solaire|onduleur|electr/,
    photo: {
      file: 'energie-solaire.jpg',
      alt: 'Des panneaux solaires posés en toiture, éclairés par un soleil rasant.',
      author: 'Michael Pointner',
      source:
        'https://unsplash.com/photos/a-group-of-solar-panels-sitting-on-top-of-a-roof-9XNbOxsSIrw',
    },
  },
  {
    id: 'informatique',
    label: 'Parc informatique et maintenance',
    match: /maintenance|infogerance|telemaintenance|laptop|desktop/,
    photo: {
      file: 'parc-informatique.jpg',
      alt: 'Un ordinateur portable ouvert sur l’établi : carte mère, batterie, ventilateurs et caloducs à nu.',
      author: 'Andrey Matveev',
      source:
        'https://unsplash.com/photos/the-motherboard-of-a-laptop-is-being-dismantled-V_ESJ2MM2Us',
    },
  },
  {
    id: 'autres',
    label: 'Au-delà de l’informatique',
    // The catch-all, and it must stay last. Accounting, customs and joinery
    // have no keyword in common; what they have in common is that the shop
    // sells them and this site never said so.
    match: /./,
    // THE HARDEST OF THE FIVE TO ILLUSTRATE, AND THE ANSWER IS THE WORKBENCH
    // RATHER THAN ONE OF THE FIVE JOBS. Accounting, customs, joinery, graphic
    // design and car mechanics fall under this heading, and any picture of one
    // of them turns the other four into a footnote. A joiner's tool wall is the
    // one subject that is BOTH literally one of these records, `Menuiserie bois
    // meubles`, and legible as the general statement the heading makes: this
    // shop has hands as well as keyboards.
    photo: {
      file: 'atelier.jpg',
      alt: 'Un mur d’atelier couvert d’outils rangés sur leurs râteliers : scies, rabots, ciseaux à bois et tournevis.',
      author: 'Barn Images',
      source: 'https://unsplash.com/photos/assorted-handheld-tools-in-tool-rack-t5YUoHW6zRo',
    },
  },
]

/**
 * Lowercase, unaccented, single-spaced. The one shape every pattern above is
 * written against.
 */
function fold(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A record is a prestation when ITS OWN NAME OPENS BY NAMING ONE.
 *
 * Anchored at the start, and that anchor is the whole test. `kit GPS +
 * installation` and `Kit GPS Vehicule + Installation` both carry the word
 * installation and are both a box with a cable in it; a loose test sells a
 * carton as a technician's morning. Read against a folded name, so `Énergie`,
 * `energie` and `ENERGIE` are one word.
 */
const PRESTATION = /^(services?|installations?|maintenance|menuiserie|douane|energie)\b/

export function isPrestation(name: string): boolean {
  return PRESTATION.test(fold(name))
}

export function tradeOf(name: string): Trade {
  const folded = fold(name)
  return TRADES.find((trade) => trade.match.test(folded)) ?? TRADES[TRADES.length - 1]
}

/**
 * The record's name, with the supplier's en dashes turned into hyphens.
 *
 * One line in this term reads `Installation Antenne – Vsat Nanostation`. The
 * house rule on this storefront is that no em or en dash reaches a reader, and
 * a rule that holds for text we write and breaks for text we print is not a
 * rule. The hyphen says the same thing and is the mark the rest of that same
 * name already uses.
 */
export function readable(name: string): string {
  return name.replace(/[–—]/g, '-').trim()
}
