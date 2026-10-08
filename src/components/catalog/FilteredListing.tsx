import {
  FilterPanel,
  NoResults,
  PRICE_STEPS,
  priceLabel,
  type PriceBand,
  type Rescue,
} from '@/components/catalog/FilterPanel'
import { Pager } from '@/components/catalog/Pager'
import { ProductGrid } from '@/components/product/ProductGrid'
import { CatalogueIndisponible, lireListe, type Payeur } from '@/lib/catalogue-en-direct'
import { categorieParSlug, libellesFacettes, marqueParSlug, rayonParSlug } from '@/lib/catalogue-vues'
import { formatAmount, formatCount } from '@/lib/format'
import {
  NO_FILTERS,
  PER_PAGE,
  countFilters,
  filtresListe,
  listingHref,
  listingQuery,
  readListing,
  withPrice,
  type CatalogFilters,
  type ListingParams,
  type ListingPlace,
  type ListingQuery,
  type ListingScope,
  type ListingState,
} from '@/lib/params'
import type { CarteProduit, EtapeFil, EnfantListe, Facettes, Navigation } from '@/types/catalogue'

/**
 * The filtered listing: the panel, the count, the grid and the pages.
 *
 * ONE COMPONENT FOR THE CATALOGUE, A DEPARTMENT, A FAMILY AND A BRAND. The
 * owner asked why the filters on /rayon/ordinateurs-accessoires were not the
 * ones on /catalogue, and the honest answer was that there were two listings:
 * the catalogue's, with its panel, and a bare grid with four orderings on the
 * three other routes. From the reader's side they are the same page — a set of
 * products, a way to narrow it, a way to order it — and what differs is only
 * which set the title stands for. That difference is a `ListingScope`, joined
 * to the backend's call and kept out of the URL's filters, so a department page
 * narrows inside the department and never out of it.
 *
 * The route keeps what is its own: title, breadcrumb, lead, the families above
 * the grid, and on /catalogue the twelve doors and the family index. Everything
 * from the panel down is here, once.
 *
 * THE COMPONENT DOES NOT KNOW WHERE ITS RESULTS CAME FROM. It draws a
 * {@link ListeFiltree}, which `lireListeFiltree` builds from
 * `/v1/catalogue/liste`. The results page has asked for the same panel; the
 * backend's search does not count every facet yet, and when it does, a second
 * reader building the same shape is all it takes.
 */

export interface ListeFiltree {
  readonly query: ListingQuery
  readonly produits: readonly CarteProduit[]
  readonly total: number
  readonly page: number
  readonly pages: number
  readonly parPage: number
  readonly facettes: Facettes
  readonly bands: readonly PriceBand[]
  /** Filters set, counted as the reader counts them: the price is one. */
  readonly active: number
  readonly rescue: Rescue | null
}

/** What the page is called, whatever the filters say. */
export interface IdentiteListe {
  readonly titre: string
  readonly fil: readonly EtapeFil[]
  readonly enfants: readonly EnfantListe[]
  /** The scope's own size, before any filter. */
  readonly total: number
}

function joined(values: readonly string[], name: (slug: string) => string | null): string {
  const names = values.map((slug) => name(slug) ?? slug)
  return names.length <= 2 ? names.join(' et ') : `${names[0]} et ${names.length - 1} autres`
}

/**
 * Who the backend counts the page's own listing against.
 *
 * THE SITE'S OWN PAGES ARE THE SHOP'S; EVERYTHING ELSE IS THE READER'S. With no
 * filter, a listing is a department, a family, a brand or the catalogue, on a
 * page that exists: a set the navigation bounds, shared in cache by every
 * visitor, and a crawler following every link reaches no more of it. A price
 * typed by hand, a combination of filters or `?page=9999` is a new address on
 * each variation and misses the cache each time, so it is read in the
 * reader's name and the backend's per-visitor limits apply to it.
 */
function payeur(filters: CatalogFilters, page: number, nav: Navigation, scope: ListingScope | null): Payeur {
  if (countFilters(filters) > 0) return 'visiteur'
  const size = !scope
    ? nav.nombreProduits
    : scope.group === 'rayon'
      ? (rayonParSlug(nav, scope.slug)?.compte ?? 0)
      : scope.group === 'famille'
        ? (categorieParSlug(nav, scope.slug)?.compte ?? 0)
        : (marqueParSlug(nav, scope.slug)?.compte ?? 0)
  return page <= Math.max(1, Math.ceil(size / PER_PAGE)) ? 'vitrine' : 'visiteur'
}

/**
 * Everything the listing draws, in as few calls as the page allows.
 *
 * `null` MEANS THE BACKEND DOES NOT KNOW THE SCOPE, and the route answers 404.
 * The routes check their slug against the navigation first, so this happens in
 * two cases: the two replies disagree for the length of a cache entry, or the
 * navigation lists a family whose slug `/v1/catalogue/liste` refuses (a capital
 * or an underscore typed in the panel), which no listing can be drawn for. On
 * /catalogue, which has no scope, every slug has just been validated and a 404
 * is a broken catalogue: it throws `CatalogueIndisponible`, like every other
 * failure, and the error page says so.
 */
export async function lireListeFiltree({
  nav,
  params,
  place,
}: {
  nav: Navigation
  params: ListingParams
  place: ListingPlace
}): Promise<{ liste: ListeFiltree; identite: IdentiteListe } | null> {
  const query = readListing(params, nav, place)
  const { filters, scope } = query
  const active = countFilters(filters)

  /**
   * The grid, the facets and the five price steps, in one request.
   *
   * THE STEPS ARE COUNTED BY THE BACKEND, ON TODAY'S PRICES. They were five more
   * passes over the compiled file, which counted a reference in the step of its
   * build-time price while the card beside it showed the live one. Each step is
   * counted with every other filter kept and the current price bounds REMOVED —
   * otherwise choosing one step would zero the other four.
   *
   * THE BACKEND NAMES A LISTING AFTER ITS NARROWEST SINGLE VALUE, family before
   * brand before department. `?rayons=reseaux-switchs-routeurs&marques=hp`
   * comes back titled "HP", with HP's families: on the department page with one
   * brand ticked, that would have renamed the page after the brand. So as soon
   * as a filter is on, the scope's identity and size are read from its own
   * unfiltered listing, one card long and cached like any other; without one,
   * the page's reply already is that identity and nothing more is asked.
   */
  const [principale, propre] = await Promise.all([
    lireListe(
      {
        ...filtresListe(filters, scope),
        tri: query.sort,
        page: query.page,
        facettes: true,
        tranches: PRICE_STEPS.map(({ min, max }) => ({ min, max })),
      },
      payeur(filters, query.page, nav, scope),
    ),
    scope && active > 0 ? lireListe({ ...filtresListe(NO_FILTERS, scope), parPage: 1 }, 'vitrine') : null,
  ])

  if (!principale || (scope && active > 0 && !propre)) {
    if (scope) return null
    throw new CatalogueIndisponible('/catalogue/liste', 'le catalogue entier a répondu 404')
  }
  if (!principale.facettes) {
    throw new CatalogueIndisponible('/catalogue/liste', 'facettes absentes')
  }
  const identite = propre ?? principale

  /**
   * The five price steps, counted, and what lets the price group obey the rule
   * every other group on the panel obeys: a step that would give nothing is not
   * offered. The panel does the dropping, because the panel is where the ladder
   * is drawn; this only has to say how big each step is.
   */
  const bands: PriceBand[] = PRICE_STEPS.map((step, index) => ({
    ...step,
    count: principale.facettes?.tranches[index]?.compte ?? 0,
  }))

  /**
   * Which single filter is standing between the reader and a result.
   *
   * Only computed on the dead end, where it is the only thing on screen worth
   * computing, and in two passes because a dead end has two shapes. The scope is
   * never one of the dimensions: it is the page, and the page is what the
   * reader is being kept on.
   *
   * FIRST, ONE FILTER TOO MANY. Each active dimension is dropped in turn and the
   * query re-run; the drop that gives back the most is offered. Dimensions, not
   * values: a reader who chose four brands and got nothing is not helped by being
   * told which of the four to remove, they are helped by being told it is the
   * brands.
   *
   * EACH PASS ASKS ALL ITS VARIANTS AT ONCE. They are one-card listings, cached
   * like any other, and only a dead end pays for them.
   *
   * SECOND, FILTERS THAT SIMPLY DO NOT MEET. `marque=hp` with
   * `rayon=onduleurs-energie` is empty and stays empty however many of the four
   * are removed one at a time, because the shop holds no HP inverter. Removing
   * one thing rescues nothing, so the page stops offering removals and offers the
   * widest single filter the reader actually asked for, which is one click from a
   * page with merchandise on it.
    *
   * THE SHOP ASKS THEM, NOT THE READER. Read in the reader's name, the five
   * variants of a five-filter dead end spent the backend's six listings a
   * second for that reader, and the next page they opened, 0.9 s later, came
   * back 429 and drew the error page: measured, two failures in three ordinary
   * clicks. Unmetered, they are still bounded by the listing that produced the
   * dead end, which IS metered: at most fourteen one-card reads behind each
   * page the reader is allowed, where there used to be no limit at all.
   *
   * A VARIANT THAT FAILS IS A VARIANT WITH NOTHING TO OFFER, NOT A BROKEN PAGE.
   * The grid and its panel are already read by then; a single lookup that timed
   * out used to throw the whole page onto the error screen, after up to eighteen
   * seconds of three delays in a row. A pass in which one failed is not followed
   * by the second: the backend is struggling, and six more seconds of waiting
   * would buy a suggestion, not the page.
   */
  let rescue: Rescue | null = null
  if (principale.total === 0 && active > 0) {
    const f = filters
    const dimensions: { label: string; without: CatalogFilters; only: CatalogFilters }[] = [
      ...(f.rayons.length > 0
        ? [
            {
              label: `Rayon : ${joined(f.rayons, (slug) => rayonParSlug(nav, slug)?.nom ?? null)}`,
              without: { ...f, rayons: [] },
              only: { ...NO_FILTERS, rayons: f.rayons },
            },
          ]
        : []),
      ...(f.familles.length > 0
        ? [
            {
              label: `Famille : ${joined(f.familles, (slug) => categorieParSlug(nav, slug)?.nom ?? null)}`,
              without: { ...f, familles: [] },
              only: { ...NO_FILTERS, familles: f.familles },
            },
          ]
        : []),
      ...(f.marques.length > 0
        ? [
            {
              label: `Marque : ${joined(f.marques, (slug) => marqueParSlug(nav, slug)?.nom ?? null)}`,
              without: { ...f, marques: [] },
              only: { ...NO_FILTERS, marques: f.marques },
            },
          ]
        : []),
      ...(f.prixMin !== null || f.prixMax !== null
        ? [
            {
              label: `Prix : ${priceLabel(f.prixMin, f.prixMax)}`,
              without: withPrice(f, null, null),
              only: withPrice(NO_FILTERS, f.prixMin, f.prixMax),
            },
          ]
        : []),
      ...(f.remise
        ? [
            {
              label: 'Remisé de 40 % ou plus',
              without: { ...f, remise: false },
              only: { ...NO_FILTERS, remise: true },
            },
          ]
        : []),
      ...(f.photo
        ? [
            {
              label: 'Avec photographie',
              without: { ...f, photo: false },
              only: { ...NO_FILTERS, photo: true },
            },
          ]
        : []),
    ]

    const best = async (
      mode: 'drop' | 'keep',
      pick: (dimension: (typeof dimensions)[number]) => CatalogFilters,
    ): Promise<{ found: Rescue | null; failed: boolean }> => {
      let failed = false
      const totals = await Promise.all(
        dimensions.map(async (dimension) => {
          try {
            const variant = await lireListe({ ...filtresListe(pick(dimension), scope), parPage: 1 }, 'vitrine')
            return variant?.total ?? 0
          } catch (erreur) {
            if (!(erreur instanceof CatalogueIndisponible)) throw erreur
            failed = true
            return 0
          }
        }),
      )
      let found: Rescue | null = null
      dimensions.forEach((dimension, index) => {
        const total = totals[index]
        if (total > (found?.total ?? 0)) {
          found = {
            mode,
            total,
            label: dimension.label,
            href: listingHref({ ...query, filters: pick(dimension) }),
          }
        }
      })
      return { found, failed }
    }

    const drop = await best('drop', (dimension) => dimension.without)
    rescue =
      drop.found ??
      (dimensions.length > 1 && !drop.failed
        ? (await best('keep', (dimension) => dimension.only)).found
        : null)
  }

  return {
    liste: {
      query,
      produits: principale.produits,
      total: principale.total,
      page: principale.page,
      pages: principale.pages,
      parPage: principale.parPage,
      facettes: principale.facettes,
      bands,
      active,
      rescue,
    },
    identite: {
      titre: identite.titre,
      fil: identite.fil,
      enfants: identite.enfants,
      total: identite.total,
    },
  }
}

export function FilteredListing({
  liste,
  nav,
  priorityCount,
}: {
  liste: ListeFiltree
  nav: Navigation
  /**
   * How many packshots load eagerly. Zero where something above the grid is the
   * largest paint (the catalogue's twelve doors), three where the grid is.
   */
  priorityCount: number
}) {
  const { query, bands, active, rescue } = liste
  // The page number and the ignored values ride along unread: every link below
  // is written from the state alone, and so returns to page 1.
  const state: ListingState = query

  const from = liste.total === 0 ? 0 : (liste.page - 1) * liste.parPage + 1
  const to = Math.min(liste.page * liste.parPage, liste.total)

  /* The backend offers fourteen departments; the panel has always shown twelve. */
  const facets = { ...liste.facettes, rayons: liste.facettes.rayons.slice(0, 12) }

  return (
    <>
      {/* A value the catalogue has never held is dropped rather than obeyed,
          and named rather than swallowed: a link that has aged past a renamed
          family should show the shop, and say why it is showing all of it. */}
      {query.ignored.length > 0 ? (
        <p className="enter e-text mb-stack rounded-well bg-space px-5 py-4 text-small leading-[1.6] text-ink-2">
          {query.ignored.length === 1
            ? `« ${query.ignored[0]} » n’est ni un rayon, ni une famille, ni une marque de ce catalogue : ce filtre a été ignoré.`
            : `${formatCount(query.ignored.length, 'valeur')} de l’adresse ne correspondent à rien au catalogue et ont été ignorées : ${query.ignored.map((value) => `« ${value} »`).join(', ')}.`}
        </p>
      ) : null}

      {/* THE PANEL COMES FIRST IN THE DOCUMENT AND SECOND ON THE SCREEN. A
          reader narrows, then reads; a screen reader and a keyboard should
          meet the controls in that order, and the grid places them on the
          right where the client asked for them. `items-start` is what lets the
          panel be sticky at all: a stretched grid item is as tall as its row
          and has nowhere to stick to. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-14">
        <FilterPanel
          state={state}
          facets={facets}
          bands={bands}
          total={liste.total}
          active={active}
          familyCount={nav.nombreFamilles}
          brandCount={nav.nombreMarques}
          libelles={libellesFacettes(nav)}
        />

        {/* WHERE "VOIR LES 544 RÉFÉRENCES" LANDS, AND IT HAS TO CLEAR TWO
            PINNED THINGS, NOT ONE. Closing the sheet is a jump to this anchor,
            so `scroll-mt` has to be the full height of everything that stays on
            screen. Measured with the sheet closed by its own foot button: at
            390 the masthead pins at 56 and the filter bar under it is 73, so
            8.5rem lands the results head at 135.9 with 6.9 pixels of air. At
            834 the masthead pins at 121 and the same bar is still drawn — the
            sheet exists everywhere below lg — which is 194, and 8.5rem put the
            head at 136: fifty-eight pixels BEHIND the chrome, so a reader who
            tapped "Voir les 544 références" arrived on a page whose count line
            was covered by the button they had just pressed. 13.125rem is
            121 + 73 + 16. From lg the bar is gone and 8.5rem is right again,
            measured at 1440 landing the head at 124 under a chrome of 121. */}
        <div
          id="resultats"
          className="min-w-0 scroll-mt-[8.5rem] md:scroll-mt-[13.125rem] lg:col-start-1 lg:row-start-1 lg:scroll-mt-[8.5rem]"
        >
          <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-3 border-b border-rule pb-5">
            <p className="e-text t-num text-small text-ink-2">
              {liste.total === 0
                ? 'Aucun produit'
                : liste.total <= liste.parPage
                  ? formatCount(liste.total, 'produit')
                  : `${formatAmount(from)} à ${formatAmount(to)} sur ${formatAmount(liste.total)}`}
            </p>
            <p className="e-item text-small text-ink-3">
              {active === 0 ? 'Aucun filtre' : formatCount(active, 'filtre actif', 'filtres actifs')}
            </p>
          </div>

          {liste.total === 0 && active > 0 ? (
            <NoResults
              rescue={rescue}
              cleared={listingHref({ ...state, filters: NO_FILTERS })}
              active={active}
            />
          ) : (
            // THREE COLUMNS, NOT FOUR. The panel takes 320 pixels off the
            // right of the shell, so the four-column step a listing used to
            // take at xl left each card 160 pixels wide at 1280 — a packshot
            // smaller than the thumbnail in the search panel. Three columns
            // put the card back at 267 at 1440, which is the size it is
            // everywhere else on the site.
            //
            // With no filter to blame, an empty grid is a family that holds
            // nothing today (four are reachable by address): the grid's own
            // empty state says so, where the dead-end block would have told
            // the reader to remove a filter they never set.
            <ProductGrid products={liste.produits} columns={3} priorityCount={priorityCount} />
          )}

          <Pager
            basePath={query.path}
            query={listingQuery(state)}
            page={liste.page}
            pages={liste.pages}
          />
        </div>
      </div>
    </>
  )
}
