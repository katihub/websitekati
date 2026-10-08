import { slugValide } from './catalogue-en-direct'
import { categorieParSlug, marqueParSlug, rayonParSlug } from './catalogue-vues'
import type { FiltresListe, Navigation, Tri } from '@/types/catalogue'

/**
 * The four orderings, under the names the URL and the backend both use.
 *
 * The labels are the shop's own words and stay here; the backend only knows the
 * keys. A key that is not in this list never reaches it.
 */
export type SortKey = Tri

export const SORTS: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'recent', label: 'Arrivage' },
  { key: 'prix-croissant', label: 'Prix croissant' },
  { key: 'prix-decroissant', label: 'Prix décroissant' },
  { key: 'remise', label: 'Remise' },
]

/**
 * Twenty-four a page, the backend's own `PAR_PAGE`. A listing reply carries its
 * `parPage` and the listings read that; the search reply does not, so the
 * results page reads this.
 */
export const PER_PAGE = 24

/** The whole state of the filter panel, as the URL carries it. */
export interface CatalogFilters {
  readonly rayons: readonly string[]
  readonly familles: readonly string[]
  readonly marques: readonly string[]
  readonly prixMin: number | null
  readonly prixMax: number | null
  /** Only the references genuinely marked down 40% or more. */
  readonly remise: boolean
  /** Only what the supplier actually photographed. */
  readonly photo: boolean
}

export const NO_FILTERS: CatalogFilters = {
  rayons: [],
  familles: [],
  marques: [],
  prixMin: null,
  prixMax: null,
  remise: false,
  photo: false,
}

/**
 * Query parameters, read defensively, and written back in one shape.
 *
 * A listing URL is a thing people edit, share and mistype, and Next hands the
 * value through as `string | string[] | undefined`. Anything that is not one of
 * the four orderings falls back to the default rather than 404ing: a customer
 * who lands on `?tri=cheapest` from a stale link wants the family, not an error
 * page about a parameter they did not know existed.
 *
 * THE FILTERED CATALOGUE URL IS A MESSAGE, NOT A SESSION. The real use here is a
 * counter clerk pasting a link into WhatsApp: "voilà tout ce qu'on a en HP, en
 * stock, sous 300 000". So the whole state of the panel lives in the address bar
 * and nowhere else, it is written in words a human can read and edit, and it is
 * short enough to survive a chat client's link preview:
 *
 *   /catalogue?rayon=reseaux-switchs-routeurs&marque=hp&prix=50000-300000&stock=1
 *
 * COMMA-JOINED, NOT REPEATED. `?rayon=a&rayon=b` and `?rayon=a,b` mean the same
 * thing to the reader below, and both are accepted, but only the comma form is
 * ever written. Three reasons, in increasing order of weight: it is shorter in a
 * chat message; a comma survives hand-editing where a repeated key invites
 * someone to delete the wrong half; and it is the only form that fits
 * `Record<string, string>`, which is what {@link Pager} takes, so pagination and
 * the panel cannot drift into two different URL dialects.
 *
 * A VALUE THE CATALOGUE DOES NOT KNOW IS DROPPED, AND SAID OUT LOUD. `?rayon=
 * nimportequoi` renders the whole shop rather than an empty grid or a 404, which
 * is the same decision `parseSort` has always made. But silence there would be a
 * page that quietly ignores what the reader asked for, so the dropped values come
 * back in `ignored` and the page names them. That is the difference between
 * forgiving and pretending.
 */
export function parseSort(value: string | string[] | undefined): SortKey {
  const first = Array.isArray(value) ? value[0] : value
  return SORTS.some((sort) => sort.key === first) ? (first as SortKey) : 'recent'
}

/**
 * A page number, floored at 1 and capped at ten thousand.
 *
 * THE CAP IS WHAT KEEPS `?page=99999999` A PAGE AND NOT AN ERROR. The backend
 * already brings a page past the end back to the last one, but it computes the
 * offset as page times page size in a 32-bit integer first: from about 89
 * million that multiplication overflows and it answers 500, which this site
 * reads as a catalogue down. The whole shop is 180 pages of 24, so ten thousand
 * changes nothing a reader can reach and still lands on the last page, as the
 * compiled catalogue did.
 */
const MAX_PAGE = 10_000

export function parsePage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value
  const page = Number(first)
  return Number.isFinite(page) && page >= 1 ? Math.min(Math.floor(page), MAX_PAGE) : 1
}

/* -------------------------------------------------------------------------- */
/* The query of a filtered listing                                            */
/* -------------------------------------------------------------------------- */

type Param = string | string[] | undefined

export interface ListingParams {
  readonly tri?: Param
  readonly page?: Param
  readonly rayon?: Param
  readonly famille?: Param
  readonly marque?: Param
  /** `min-max`, either side optional: `50000-300000`, `-49999`, `500000-`. */
  readonly prix?: Param
  /** What the two-field price form posts. A GET form cannot join two inputs. */
  readonly prixmin?: Param
  readonly prixmax?: Param
  readonly remise?: Param
  readonly photo?: Param
  /** Which long facet groups are unfolded. */
  readonly voir?: Param
  /** The phone sheet, open. Ignored from lg up, where the panel is always there. */
  readonly filtres?: Param
}

/** The three multi-value dimensions, named as they appear in the URL. */
export type FacetGroup = 'rayon' | 'famille' | 'marque'

const FACET_GROUPS: readonly FacetGroup[] = ['rayon', 'famille', 'marque']

/**
 * The one value a listing page stands for, and that no control on it may take away.
 *
 * /catalogue has none. /rayon/reseaux-switchs-routeurs is the department,
 * /categorie/laptop-hp the family, /marque/hp the brand: the same panel is drawn
 * on all four, and this is the whole difference between them.
 *
 * IT IS NOT A FILTER, AND IT NEVER ENTERS `filters`. Inside one group, values
 * are unioned: ticking a second department on /rayon/impression would have
 * WIDENED the page past its own title, and a chip for the page's own value would
 * have offered a removal the page cannot perform, since its path still names the
 * department. So the scope is joined to the backend's call and nowhere else — not
 * counted, not drawn as a chip, not written back into the address, which already
 * carries it in its path — and its group is not offered on the panel.
 */
export interface ListingScope {
  readonly group: FacetGroup
  readonly slug: string
  /** Its name as the navigation spells it, for the one line that says where the panel filters. */
  readonly nom: string
}

/** Where a listing lives: the path its links are written against, and what it stands for. */
export interface ListingPlace {
  readonly path: string
  readonly scope: ListingScope | null
}

export const CATALOGUE: ListingPlace = { path: '/catalogue', scope: null }

/** The route each kind of scope has always lived under. The URL names a family `categorie`. */
const SCOPE_PATH = {
  rayon: '/rayon',
  famille: '/categorie',
  marque: '/marque',
} as const satisfies Record<FacetGroup, string>

/** A department, family or brand page, from the slug and name the navigation gave for it. */
export function scopedPlace(group: FacetGroup, slug: string, nom: string): ListingPlace {
  return { path: `${SCOPE_PATH[group]}/${slug}`, scope: { group, slug, nom } }
}

/** Which key of {@link CatalogFilters} each URL group fills. */
const FILTER_KEY = {
  rayon: 'rayons',
  famille: 'familles',
  marque: 'marques',
} as const satisfies Record<FacetGroup, keyof CatalogFilters>

/**
 * Everything the panel and the listing need, and nothing else. `page` is not in
 * here on purpose: every control in the panel returns to page 1, and a state
 * object that could not express page 7 is a state object that cannot forget to
 * reset it. The pager builds its own hrefs from {@link listingQuery}.
 */
export interface ListingState extends ListingPlace {
  readonly filters: CatalogFilters
  readonly sort: SortKey
  readonly open: readonly FacetGroup[]
  readonly sheet: boolean
}

export interface ListingQuery extends ListingState {
  readonly page: number
  /** Values the catalogue has never heard of, kept so the page can say so. */
  readonly ignored: readonly string[]
}

/**
 * Twenty values per dimension, because the backend refuses the twenty-first.
 *
 * It was 24, the length of a facet list, back when the filtering ran on a file
 * in this process. `/v1/catalogue/liste` caps each dimension at 20 and answers
 * 400 past it, and a 400 is read here as a broken catalogue: a hand-written URL
 * carrying 21 brands would have put the error page in front of the reader
 * instead of a slightly shorter selection. Dropping the tail is the same
 * forgiveness this file already extends to a mistyped slug.
 */
const MAX_VALUES = 20

/** Well above the 11 800 000 FCFA ceiling, low enough to stay an integer. */
const PRICE_CEILING = 100_000_000

function slugs(value: Param): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value]
  const out: string[] = []
  for (const entry of raw) {
    for (const piece of entry.split(',')) {
      const slug = piece.trim().toLowerCase()
      // Anything `/v1/catalogue/liste` would refuse is not a slug this catalogue
      // can list, and it is dropped before it reaches a lookup rather than after.
      if (!slugValide(slug) || out.includes(slug)) continue
      out.push(slug)
      if (out.length >= MAX_VALUES) return out
    }
  }
  return out
}

/**
 * A flag is on when it says so and off in every other case, including absent,
 * `0`, `false` and the empty string a checkbox leaves behind.
 */
function flag(value: Param): boolean {
  const first = Array.isArray(value) ? value[0] : value
  return first === '1' || first === 'oui' || first === 'true'
}

function amount(value: string | undefined): number | null {
  if (value === undefined) return null
  const trimmed = value.trim()
  if (trimmed === '' || !/^\d{1,9}$/.test(trimmed)) return null
  return Math.min(Number(trimmed), PRICE_CEILING)
}

/**
 * The price bound, from either door.
 *
 * `prix=50000-300000` is what every link writes. `prixmin` / `prixmax` is what
 * the two-field form posts, because a GET form cannot compose two inputs into
 * one parameter and requiring JavaScript for a price box was not on the table.
 * The pair is read here and never written: the next click on any control
 * rewrites the address in the canonical single-parameter form.
 *
 * A lone number, `prix=50000`, is read as a floor. It is what someone typing the
 * URL by hand means, and the alternative is discarding an intention we can see.
 */
function bounds(params: ListingParams): { min: number | null; max: number | null } {
  const first = Array.isArray(params.prix) ? params.prix[0] : params.prix
  let min: number | null = null
  let max: number | null = null

  if (typeof first === 'string' && first.trim() !== '') {
    const [low, high] = first.includes('-') ? first.split('-') : [first, '']
    min = amount(low)
    max = amount(high)
  }

  const low = amount(Array.isArray(params.prixmin) ? params.prixmin[0] : params.prixmin)
  const high = amount(Array.isArray(params.prixmax) ? params.prixmax[0] : params.prixmax)
  if (low !== null) min = low
  if (high !== null) max = high

  // Someone typed the ceiling into the floor. Swapping is what they meant, and
  // it beats an empty grid explained by nothing.
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  return { min, max }
}

/**
 * Does the catalogue actually hold this value, under this dimension?
 *
 * CHECKED HERE, BEFORE THE BACKEND IS ASKED, AND NOT LEFT TO IT. The backend
 * answers 404 when the only value of a dimension is unknown and silently drops
 * unknown values when there are several, so the same stale link would render an
 * error page or an unexplained wider grid depending on how many filters it
 * carried. Validated against the navigation, the page drops it and says so in
 * both cases.
 */
function known(group: FacetGroup, slug: string, nav: Navigation): boolean {
  switch (group) {
    case 'rayon':
      return rayonParSlug(nav, slug) !== null
    case 'famille':
      return categorieParSlug(nav, slug) !== null
    case 'marque':
      return marqueParSlug(nav, slug) !== null
  }
}

/**
 * The URL of a listing page, read against the navigation.
 *
 * THE SCOPE'S OWN GROUP IS NOT READ FROM THE QUERY. `/marque/hp?marque=dell`
 * would otherwise union Dell into a page titled HP. The path already says which
 * brand this is, so a brand in the query is not read at all, and not reported
 * either: no link this site writes ever puts it there.
 */
export function readListing(
  params: ListingParams,
  nav: Navigation,
  place: ListingPlace,
): ListingQuery {
  const ignored: string[] = []
  const chosen = { rayons: [] as string[], familles: [] as string[], marques: [] as string[] }

  for (const group of FACET_GROUPS) {
    if (group === place.scope?.group) continue
    const raw = group === 'rayon' ? params.rayon : group === 'famille' ? params.famille : params.marque
    for (const slug of slugs(raw)) {
      if (known(group, slug, nav)) chosen[FILTER_KEY[group]].push(slug)
      else if (!ignored.includes(slug)) ignored.push(slug)
    }
  }

  const { min, max } = bounds(params)

  return {
    path: place.path,
    scope: place.scope,
    filters: {
      ...NO_FILTERS,
      rayons: chosen.rayons,
      familles: chosen.familles,
      marques: chosen.marques,
      prixMin: min,
      prixMax: max,
      remise: flag(params.remise),
      photo: flag(params.photo),
    },
    sort: parseSort(params.tri),
    page: parsePage(params.page),
    open: slugs(params.voir).filter((value): value is FacetGroup =>
      (FACET_GROUPS as readonly string[]).includes(value),
    ),
    sheet: flag(params.filtres),
    ignored,
  }
}

/**
 * The panel's state, as the backend's listing reads it, with the page's scope
 * joined to its own dimension. Page and ordering are the caller's.
 *
 * The scope's group never holds anything else: {@link readListing} does not read
 * it from the URL and the panel does not offer it.
 */
export function filtresListe(filters: CatalogFilters, scope: ListingScope | null): FiltresListe {
  const avec = (group: FacetGroup, values: readonly string[]) =>
    scope?.group === group ? [scope.slug] : values
  return {
    rayons: avec('rayon', filters.rayons),
    familles: avec('famille', filters.familles),
    marques: avec('marque', filters.marques),
    prixMin: filters.prixMin,
    prixMax: filters.prixMax,
    remise: filters.remise,
    photo: filters.photo,
  }
}

/* -------------------------------------------------------------------------- */
/* Writing it back                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The state as key/value pairs, in a fixed order.
 *
 * FIXED ORDER MATTERS MORE THAN IT LOOKS. Two readers who chose the same three
 * filters in a different sequence must land on byte-identical URLs, or the same
 * page is cached twice, shared twice, and reads as two pages in a browser's
 * history. The order below is the order the panel is read in, top to bottom.
 */
function pairs(state: ListingState): [string, string][] {
  const { filters } = state
  const out: [string, string][] = []

  if (state.sort !== 'recent') out.push(['tri', state.sort])
  if (filters.rayons.length > 0) out.push(['rayon', filters.rayons.join(',')])
  if (filters.familles.length > 0) out.push(['famille', filters.familles.join(',')])
  if (filters.marques.length > 0) out.push(['marque', filters.marques.join(',')])
  if (filters.prixMin !== null || filters.prixMax !== null) {
    out.push(['prix', `${filters.prixMin ?? ''}-${filters.prixMax ?? ''}`])
  }
  if (filters.remise) out.push(['remise', '1'])
  if (filters.photo) out.push(['photo', '1'])
  if (state.open.length > 0) out.push(['voir', state.open.join(',')])
  if (state.sheet) out.push(['filtres', '1'])

  return out
}

/**
 * What {@link Pager} needs: everything except the page number.
 *
 * The pager runs the record through `URLSearchParams`, which percent-encodes the
 * commas. That is uglier and still exactly this parser's input, so page 2 of a
 * filtered catalogue is a correct link that reads slightly worse than page 1.
 * The alternative was a second URL dialect, which reads worse everywhere.
 */
export function listingQuery(state: ListingState): Record<string, string> {
  return Object.fromEntries(pairs(state))
}

/**
 * The address of a state of a listing, on the page it belongs to.
 *
 * Hand-encoded rather than run through `URLSearchParams`, for one reason: that
 * class escapes the comma, and `rayon=reseaux%2Cimpression` in a WhatsApp
 * message is a link a human being cannot check before sending. Slugs and digits
 * are the only things that ever reach here, both already URL-safe, and the comma
 * is a legal sub-delimiter inside a query string.
 */
export function listingHref(state: ListingState, hash = ''): string {
  const search = pairs(state)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return `${state.path}${search ? `?${search}` : ''}${hash}`
}

/* -------------------------------------------------------------------------- */
/* Small changes to a state                                                   */
/* -------------------------------------------------------------------------- */

/** Adds a value, or removes it if it is already there. */
export function toggleFacet(
  filters: CatalogFilters,
  group: FacetGroup,
  value: string,
): CatalogFilters {
  const key = FILTER_KEY[group]
  const current = filters[key]
  return {
    ...filters,
    [key]: current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value].slice(0, MAX_VALUES),
  }
}

export function withPrice(
  filters: CatalogFilters,
  min: number | null,
  max: number | null,
): CatalogFilters {
  return { ...filters, prixMin: min, prixMax: max }
}

/**
 * How many filters are on, counted the way the reader can count them.
 *
 * THE PRICE IS ONE FILTER, NOT TWO, AND THAT IS THE WHOLE REASON THIS EXISTS.
 * `facets.active` adds a floor and a ceiling separately, so `?prix=50000-150000`
 * made the page print "2 filtres actifs" and "répondent à 2 filtres" over a panel
 * drawing ONE chip, offering ONE removal, and a dead-end screen naming ONE
 * dimension. Measured on the live page before this: 2 against 1, in four places
 * at once. A reader who set one bracket and is told they set two has no way to
 * find the second, because there is no second.
 *
 * The panel, the chips, the phone button's badge, the dead end and the page
 * header now all read this one function, so the number cannot drift again. The
 * two flags and the three slug groups count as themselves.
 */
export function countFilters(filters: CatalogFilters): number {
  return (
    filters.rayons.length +
    filters.familles.length +
    filters.marques.length +
    (filters.prixMin !== null || filters.prixMax !== null ? 1 : 0) +
    Number(filters.remise) +
    Number(filters.photo)
  )
}

/** Unfolds or refolds one of the long groups. */
export function toggleGroup(
  open: readonly FacetGroup[],
  group: FacetGroup,
): readonly FacetGroup[] {
  return open.includes(group) ? open.filter((entry) => entry !== group) : [...open, group]
}
