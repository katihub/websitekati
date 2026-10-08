import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { Pager } from '@/components/catalog/Pager'
import { Packshot } from '@/components/product/Packshot'
import { ProductMedia } from '@/components/product/ProductMedia'
import { Action } from '@/components/ui/Action'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { lireMarques, lireNavigation } from '@/lib/catalogue-en-direct'
import { entreesMarques } from '@/lib/catalogue-vues'
import { formatAmount, formatCount } from '@/lib/format'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'
import type { BrandEntry } from '@/types/catalogue'

/**
 * The brand directory: ONE index, in tiles, paginated, and now photographed.
 *
 * WHAT THIS LIST IS, BEFORE ANYTHING ELSE. The WooCommerce export carries no
 * brand taxonomy: the column exists and is filled on 14 rows out of 7 116. The
 * 101 names below were recovered at ingest by reading category paths and product
 * titles, which is what makes it possible to hold an HP laptop and a Dell one in
 * a single list, something the current site cannot do. The page says so out
 * loud, because a wall of manufacturer names on a retailer's site is normally
 * read as a claim of distribution, and this one is not one. Nothing here is a
 * partnership, an official distribution or a certification. It is an inventory
 * fact: 3 042 of the 4 254 references carry a recovered brand, and each name
 * opens the same query a customer could run themselves.
 *
 * THIS PAGE CARRIED 451 WORDS AND NOT ONE PICTURE, AND THAT IS WHAT CHANGED.
 * Measured on a 390x844 phone before this pass: 451 words, 0 images, 6 000
 * pixels of page. The reader met a title, a lead, three figures, a paragraph, a
 * filter, an ordering bar and only then, at y=1 721, the first thing that could
 * be called merchandise: the word HP. A shop whose brand page shows nothing it
 * sells is a directory, and the client's own words for it were "visuellement
 * c'est fade".
 *
 * THE PICTURES COME FROM THE SHOP, NOT FROM A STOCK LIBRARY. 68 of the 101
 * brands have no logo and never will (see the mark note below), but every one of
 * the 101 has PHOTOGRAPHED PRODUCTS: checked across the whole catalogue, not one
 * brand with references is without at least one packshot, and 100 of the 101
 * have one in every family they appear in. So each brand is illustrated by one
 * of its own references, the most recent one the supplier photographed, which
 * the backend picks and carries on each entry as `image`. It is free, it needs
 * no licence, and it is TRUE: a real ZKTECO terminal says more about ZKTECO
 * than a logo we do not hold.
 *
 * ONE BRAND, ONE PHOTOGRAPH, TWO SIZES. The same picture is used big in the
 * shelf at the top and small in the index tile below, so a reader who saw
 * HIKVISION in the shelf recognises it in the index. It is a system rather than
 * two decorations, which is why the shelf may sit above the index without being
 * a second list: it is the first twelve of the same list, enlarged.
 *
 * THE SHELF SCROLLS SIDEWAYS ON A PHONE AND IS A GRID EVERYWHERE ELSE. Twelve
 * square photographs stacked vertically would be 3 000 pixels of page, which is
 * the disease and not the cure, so under 768 the shelf is a rail: it snaps
 * (`snap-x mandatory` on the rail, `snap-start` on the cards), it contains its
 * own overscroll so it never steals the page's vertical scroll, it bleeds into
 * the gutter so the next card is visibly cut by the screen edge, and every card
 * is a 200-pixel touch target. From `md` it is a plain grid, four columns then
 * six, exactly as it always would have been drawn: the rail exists only where
 * the screen cannot hold a grid.
 *
 * ONE TILE IN THREE CARRIES A MARK, AND THAT WAS THE OLD DESIGN PROBLEM.
 * Marks exist for 33 of the 101 and never will for the other 68: the names were
 * checked one by one against Simple Icons' index, 3 453 entries, and 67 are not
 * in it. Simple Icons dropped most non-free marks in 2024, so Canon, Logitech,
 * Microsoft, Philips, Xerox, Brother, SanDisk, Western Digital, Hisense, TCL,
 * BenQ, Transcend, Ricoh, Legrand, Eaton, Tenda, D-Link, APC, HPE and HIKVISION
 * are absent, and HIKVISION is 266 references, the second deepest brand in the
 * shop. Nothing may be drawn in their place: an initial in a circle or a grey
 * rectangle is a fabricated logo standing exactly where a real one is missing.
 *
 * THE PHOTOGRAPH DOES NOT REPLACE THE MARK, IT ANSWERS A DIFFERENT QUESTION.
 * The mark is still a stamp in the tile's bottom corner, absent on 68 tiles, and
 * the page still prints that ratio in figures. What the photograph does is stop
 * the coverage rate from being the page's subject: a tile now shows a product
 * whether or not we hold the logo, so an empty corner is a missing file on a
 * tile that is already complete rather than a hole in the middle of it.
 *
 * WHY THE STAMP IS 40 PIXELS AND NOT 48. Every file in the set is a 24x24
 * square, so `contain` binds the mark to the box and a wordmark like PANASONIC,
 * 6.25 wide for 1 tall inside its file, is drawn across 40 by 6.4 of it. The old
 * wall answered with 48, which multiplied whatever the file already painted, and
 * the heaviest files paint a great deal: the ink measurement that decides which
 * ones are cut back to 30 is written out over the constant below. At 48 they
 * came out as black slabs beside every wordmark, which is the audit finding this
 * page was rebuilt to answer.
 *
 * TWO READERS, ONE INDEX. Someone asking "vous avez du Mikrotik ?" needs to hit
 * one name out of 101; someone asking what this shop actually stocks needs to
 * see that HP has 544 references and eight brands have exactly one. Those wants
 * are opposite orderings of the same list, so the list is ordered two ways and
 * the reader picks. Both orderings are URLs, not state: `?tri=nom` is shareable,
 * back-buttonable and renders without JavaScript, the filter is a plain GET form
 * for the same reason, and so is the page number. No client component beyond the
 * packshots themselves, no 3.3 MB catalogue anywhere near the browser.
 *
 * AND BECAUSE THEY ARE URLS, EVERY CONTROL COSTS A COLD LOAD, WHICH IS WHY THIS
 * PAGE HAS TWO STATES. The filter form and the pager do not refresh a grid in
 * place; they fetch the document again, and the reader lands wherever that new
 * document starts. Measured at 390 on the live page: the first tile of
 * `?q=hik` sat at 1 757 pixels, two full screens under an 844-pixel viewport,
 * behind a title, a lead, three figures and a paragraph the reader had just
 * scrolled past. The `#index` fragment does not rescue it. Measured in a cold
 * browser, one launched per URL: `/marques#index` lands at scrollY 0 and so
 * does `/marques?q=i#index`, while the same address lands at 822 under
 * `prefers-reduced-motion: reduce` and an in-page click on an ordering link
 * lands at 831. The fragment therefore serves the reader who is already on the
 * page and is dropped on the load that follows the form, which is the one load
 * that needed it. It is kept, because it costs nothing and it is right for
 * those two cases, but it is not what solves this.
 *
 * WHAT SOLVES IT IS THAT AN ANSWERING PAGE STOPS INTRODUCING ITSELF. The three
 * figures, the long paragraph AND THE SHELF are the front door: they say what
 * kind of list this is to someone who arrived at `/marques` and has asked for
 * nothing yet. A reader who typed "hik", or who is on page 2, has asked, and
 * replying with 620 pixels of preamble is answering a question with the
 * question. So `?q=` and `?page=` drop the band, drop the shelf and shorten the
 * lead, and they lose no pictures by it: every tile in the index carries one.
 * `?tri=` is not one of these states and keeps the whole front door, because it
 * is the same 101 names in another order.
 */

interface Params {
  searchParams: Promise<{
    q?: string | string[]
    tri?: string | string[]
    page?: string | string[]
  }>
}

/**
 * 36 tiles a page: 101 brands in three pages of 36, 36 and 29.
 *
 * Not the catalogue's 24. A brand index is scanned, not shopped, and 24 would
 * cut 101 names into five pages whose last one holds five tiles. 36 is also the
 * only round number that divides by 2, 3 and 4, which are the three column
 * counts this grid runs at, so no page but the last ever ends on a ragged row.
 */
const PER_PAGE = 36

/**
 * Twelve cards in the shelf, and the number is the grid's, not a round figure.
 *
 * The shelf is four columns at `md` and six at `lg`, so 12 is the only count
 * under twenty that fills both without a ragged row: three rows of four, two of
 * six. On the phone rail it is simply how far the reader may push, and twelve
 * cards at 205 pixels is 2 600 pixels of travel, which is four thumb flicks.
 */
const SHELF = 12

/**
 * The mark files that outweigh the set, and the measured rule that picks them.
 *
 * MEASURED, NOT JUDGED, AND RE-RUNNABLE. Every file in `public/brands` is a
 * 24x24 square painted with `mask-size: contain` inside a box of one size, so
 * the only thing deciding how much ink lands in a tile is the share of that
 * 24x24 box the artwork paints. Each of the 33 was rasterised at 200x200 in the
 * browser and every pixel over alpha 24 counted: the set runs from KASPERSKY at
 * 6.8 % to XIAOMI at 74.5 %, median INTEL 17.8 %.
 *
 * THE RULE IS TWO AND A HALF TIMES THE MEDIAN, 44.5 %, and it takes seven:
 * XIAOMI 74.5, MIKROTIK 56.8, HP 54.6, APPLE 52.3, LINKSYS 51.5, UBIQUITI 48.6,
 * TP-LINK 46.0. HUAWEI at 42.9 and FORTINET at 41.0 sit just under it and stay
 * where they are. A hand-picked four is what this replaces, and it was picked
 * wrong: it cut UBIQUITI while leaving APPLE and LINKSYS, both of which paint
 * more ink than UBIQUITI does.
 *
 * WHY 30 PIXELS AND NOT 40. Area falls with the square, so a 30-pixel box is
 * 900 square pixels against 1 600 and the ink drops to 56 % of what it was.
 * XIAOMI goes from 1 192 painted pixels to 671, and the heaviest mark left in
 * the grid becomes HUAWEI at 686, which is 2.4 times the median's 285 where it
 * used to be XIAOMI at 4.2 times. Nothing is ever enlarged: a mark can only be
 * too loud on this page, never too quiet, because the name set above it is what
 * identifies the brand and the mark is an ornament on a tile that already reads.
 *
 * LENOVO IS NOT IN THE LIST AND IT IS THE ONE THAT LOOKS LIKE IT SHOULD BE. Its
 * file is a filled bar with the word reversed out of it, so it reads darker than
 * anything near it, but it paints 28.8 % of the box, 460 square pixels, 1.6
 * times the median and well inside the range the rest of the set lives in.
 * Shrinking it would not make it less of a bar, only a smaller one. The rule is
 * ink, because ink is the thing that unbalances a grid.
 *
 * Keyed by file name, because what is corrected is a property of the artwork and
 * not of the manufacturer.
 */
const DENSE_MARKS: ReadonlySet<string> = new Set([
  'xiaomi',
  'mikrotik',
  'hp',
  'apple',
  'linksys',
  'ubiquiti',
  'tplink',
])

/**
 * The stamp box, in rem: 40 pixels, or 30 for a file that paints too much.
 *
 * It is published to the tile as `--stamp-base` rather than used directly,
 * because under 360 pixels the tile cannot afford it and the class on the tile
 * takes four fifths: 32, or 24 for a dense file.
 *
 * WHY FOUR FIFTHS AND WHY 360, AND IT IS THE DEPARTMENT LINE THAT DECIDED IT,
 * NOT THE COUNT. The count is handled a few lines below by switching its unit,
 * because at 320 no stamp size can save it: "544 références" needs 107.8 pixels
 * on one line and the whole tile is 124. The department under it is the line
 * this size protects. Measured at 320 across all three pages, the widest label
 * in the set is "Ordinateurs" at 70.3 pixels; a 40-pixel stamp and its 12-pixel
 * gap leave the column 72, which is 1.7 pixels of clearance and therefore an
 * ellipsis as soon as a fallback face is drawn instead of the measured one. 32
 * leaves 80, which is 9.7. It is also a matter of proportion: 40 pixels of mark
 * in a 124-pixel tile is a third of the tile's width given to the ornament, and
 * the name is what identifies the brand. At 360 the tile is 141, the column is
 * 89, and the full 40 costs nothing, which is where the break point goes.
 *
 * THE VARIANT IS WRITTEN `max-[360px]` AND IT MEANS UNDER 360, NOT UP TO IT.
 * Tailwind v4 compiles it to `@media not (min-width: 360px)`, so 360 itself
 * keeps the full stamp and 359 does not. Written `max-[359px]` it was checked
 * on a 359-pixel viewport and the stamp came back 40: the query excludes its
 * own bound, and one pixel of the range that needed the fix was outside it.
 */
function stampSize(file: string): string {
  return DENSE_MARKS.has(file) ? '1.875rem' : '2.5rem'
}

export const generateMetadata = metadonneesAvecPanne(async function generateMetadata(): Promise<Metadata> {
  // The page reads its search parameters, which is what renders it on request.
  // The metadata reads none, so without this the build ran it and called the
  // backend for an index it then threw away.
  await connection()
  const index = await lireMarques()
  const brands = entreesMarques(index)
  const branded = index.produitsMarques
  return {
    title: 'Les marques',
    description:
      `Les ${brands.length} marques présentes au catalogue NowTech Center, ` +
      `de ${brands[0]?.name ?? ''} à la référence unique. ` +
      `${formatAmount(branded)} références portent l’une d’elles, retrouvée dans les titres et les chemins de catégories.`,
  }
})

/** Accent and punctuation folded away, so « tp link » and « TP-LINK » meet. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function readOne(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

/**
 * Every control on this page is a link to another state of the same page.
 *
 * `page` is deliberately absent: changing the ordering or clearing the filter
 * returns to the first page, and a helper that could not express page 7 is a
 * helper that cannot forget to reset it.
 */
function href(query: string, order: 'nom' | null, hash = ''): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (order) params.set('tri', order)
  const search = params.toString()
  return `/marques${search ? `?${search}` : ''}${hash}`
}

/**
 * One card of the shelf: a photograph the size of a product card's.
 *
 * The picture is drawn by the same component every product grid on this site
 * uses, so it inherits the white well, the hairline, the shimmer that stands in
 * until the file lands, and the four per cent lean on hover. A brand card that
 * framed its photograph differently from a product card would be a second visual
 * language for the same object.
 *
 * THE PHOTOGRAPH IS `alt=""` ON PURPOSE. It is not the link: the link is the
 * brand name, its count and its department, all three of them real text
 * underneath. Read out, the alternative is a 90-character product title
 * announced before every one of twelve names, which is how a shelf becomes
 * unusable with a screen reader. The section's own line says what the pictures
 * are, once, for all twelve.
 */
function ShelfCard({
  brand,
  picture,
  index,
}: {
  brand: BrandEntry
  picture: string | null
  index: number
}) {
  return (
    <Link
      href={`/marque/${brand.slug}`}
      style={{ '--enter-index': index % 6 } as React.CSSProperties}
      className="group enter e-item flex h-full flex-col"
    >
      <span className="plate mb-3.5 block">
        <span className="sheen relative block overflow-hidden rounded-well">
          <ProductMedia
            src={picture}
            alt=""
            sizes="(max-width: 767px) 62vw, (max-width: 1023px) 24vw, 16vw"
            // The first two cards of the shelf are the first pictures on the
            // page and, at 390, the only ones above the fold. Everything after
            // them is lazy, including the whole index below.
            priority={index < 2}
          />
        </span>
      </span>

      <span className="text-body font-semibold leading-[1.2] tracking-[-0.02em] text-ink transition-colors duration-[var(--t-fast)] group-hover:text-secondary">
        {brand.name}
      </span>
      <span className="t-num mt-1 text-micro text-ink-2">
        {formatCount(brand.productCount, 'référence')}
      </span>
      {brand.departments[0] ? (
        <span className="clamp-1 text-micro text-ink-3">{brand.departments[0]}</span>
      ) : null}
    </Link>
  )
}

/**
 * One tile of the index.
 *
 * THE WHOLE TILE IS THE TARGET AND IT IS NEVER UNDER 44 PIXELS. Re-measured
 * after this page's last pass: at 390 the tile is 153.8 wide and 102.6 tall
 * with the name on one line, 124.2 with it on two, which in the whole set is
 * WESTERN DIGITAL alone; at 1440 the tile is 282 and every one of them is
 * 103.5. The foot row is held at 40 by `min-h-10` and pinned by `mt-auto`, so
 * in a row of four the counts sit on one line whatever the names above them
 * did, and the stamp sits on that same line. The photograph added above the
 * name does not touch any of that: it is a fixed 72-pixel square, 80 from `sm`,
 * so every tile in a row grows by exactly the same amount.
 *
 * THE PHOTOGRAPH IS A CHIP AND NOT A CARD, WHICH IS THE WHOLE POINT OF 72. This
 * is an index: the reader is looking for a NAME among 101, and the name is set
 * at 18px because it is the object being scanned. A full-width picture on a
 * 153.8-pixel tile is 153.8 tall, adds 2 700 pixels to the page and turns the
 * index into a second shelf. 72 pixels is enough to recognise a printer from a
 * camera from a rack switch, which is all the picture is asked to do here, and
 * it costs 1 300 pixels of page for 36 photographs.
 *
 * THE HAIRLINE ON TOP IS THE TILE. There is no box, no fill and no shadow: 36
 * bordered cards is a page of frames, and the rule alone states the column the
 * name starts at, which is all a grid of type needs. The only border inside the
 * tile is the photograph's own, because every packshot in this library was shot
 * on white and sits on a white page with no edge of its own.
 */
function BrandTile({
  brand,
  picture,
  index,
}: {
  brand: BrandEntry
  picture: string | null
  index: number
}) {
  // One department is worth naming; six is worth counting. Both are facts of
  // the ingest, and between them they replace a rule that showed neither.
  const place =
    brand.departments.length === 1
      ? brand.departments[0]
      : brand.departments.length > 1
        ? formatCount(brand.departments.length, 'rayon')
        : ''

  return (
    <Link
      href={`/marque/${brand.slug}`}
      style={
        {
          '--enter-index': index % 8,
          ...(brand.file
            ? {
                '--mark-ink': brand.paint ?? undefined,
                '--mark-src': `url(/brands/${brand.file}.svg)`,
                '--stamp-base': stampSize(brand.file),
              }
            : null),
        } as React.CSSProperties
      }
      /* `--stamp` is declared in a class and not in the style attribute above,
         because an inline declaration is the one thing a media query cannot
         override, and the narrow phones have to override it. */
      className="group enter e-item flex h-full flex-col border-t border-rule pt-4 transition-colors duration-[var(--t-fast)] [--stamp:var(--stamp-base)] hover:border-ink max-[360px]:[--stamp:calc(var(--stamp-base)*0.8)]"
    >
      {picture ? (
        <span className="relative mb-3.5 block size-18 shrink-0 overflow-hidden rounded-control border border-rule bg-surface transition-colors duration-[var(--t-fast)] group-hover:border-rule-2 sm:size-20">
          <Packshot
            src={picture}
            alt=""
            /* A fixed box, so the browser is told a fixed size. `80px` is the
               widest it is ever drawn at, and asking for one file at one size
               across 36 tiles is what keeps a page of thumbnails to one
               download each. */
            sizes="80px"
            className="e-media object-contain"
          />
        </span>
      ) : null}

      {/* A brand name is never broken on purpose, and `break-words` breaks a
          word only when it cannot fit its line at all. One name in the 101 can
          reach that state: GRANDSTREAM, eleven characters with nothing to break
          on, measured 29 pixels wider than its 124-pixel tile at 320 and 12
          wider at 360, running over the gutter and into the name in the next
          column. It fits from 390 up with under a pixel to spare, which is the
          second reason this is here: the fallback face shown while the web font
          loads is wider than the face those 153.8 pixels were measured with. */}
      <span className="text-sub font-semibold break-words leading-[1.2] tracking-[-0.02em] text-ink transition-colors duration-[var(--t-fast)] group-hover:text-secondary">
        {brand.name}
      </span>

      <span className="mt-auto flex min-h-10 items-end justify-between gap-3 pt-5">
        <span className="flex min-w-0 flex-col gap-1">
          {/* THE SAME COUNT, IN THE UNIT THE COLUMN CAN AFFORD, AND THE SWITCH
              IS MEASURED. "544 références" needs 107.8 pixels on one line at
              this size, and every count in the set is the same width because
              the figures are tabular, so 107.8 is the number the column has to
              beat rather than an average. In two columns it never does: the
              tile is 124 wide at 320, 141 at 360 and 153.8 at 390, the stamp
              and its gap take 52 of that, and the count came back on two lines
              on 11 tiles at 320, 9 at 360 and one at 390. A count that wraps
              beside a neighbour's that does not is a foot row whose line moves
              with the presence of a mark. "réf." needs 65 and clears every one
              of those widths. The switch is the layout's own: `sm` is where the
              grid goes from two columns to three and the tile passes 180, which
              is where the full word fits with the stamp beside it. Nothing is
              abbreviated on a screen that can hold the word, and no number is
              ever abbreviated. */}
          <span className="t-num text-micro text-ink-2">
            <span className="sm:hidden">
              {formatCount(brand.productCount, 'réf.', 'réf.')}
            </span>
            <span className="hidden sm:inline">
              {formatCount(brand.productCount, 'référence')}
            </span>
          </span>
          {place ? <span className="clamp-1 text-micro text-ink-3">{place}</span> : null}
        </span>

        {/* The stamp. A real square box the size of the mark, because `contain`
            on a 24x24 file centres the mark in whatever it is given and a wide
            box would float it away from the corner it belongs in. Height and
            width come from one number so the two can never drift apart. */}
        {brand.file ? (
          <span
            aria-hidden
            className="block shrink-0"
            style={{ width: 'var(--stamp)', height: 'var(--stamp)' }}
          >
            {/* The height stays an inline declaration: `.brand-mark` sets 2rem
                from an unlayered rule in globals.css, and an unlayered rule
                beats any utility class Tailwind would emit for it. */}
            <span className="brand-mark" style={{ height: 'var(--stamp)' }} />
          </span>
        ) : null}
      </span>
    </Link>
  )
}

export default avecPanneCatalogue(async function MarquesPage({ searchParams }: Params) {
  const params = await searchParams
  const query = readOne(params.q)
  const order = readOne(params.tri) === 'nom' ? 'nom' : 'profondeur'

  const [index, nav] = await Promise.all([lireMarques(), lireNavigation()])
  const brands = entreesMarques(index)
  const productCount = nav.nombreProduits

  const deepest = brands[0]
  const branded = index.produitsMarques
  const marked = brands.filter((brand) => brand.file !== null).length
  const singles = brands.filter((brand) => brand.productCount === 1).length
  const shallowest = brands[brands.length - 1]

  const needle = fold(query)
  const found = needle ? brands.filter((brand) => fold(brand.name).includes(needle)) : brands
  const sorted =
    order === 'nom' ? [...found].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : found

  // A page number out of range is clamped rather than 404ed: it arrives from a
  // stale link or a hand-edited address, and the reader wants the list.
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE))
  const raw = Number(readOne(params.page))
  const page = Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), pages) : 1
  const shown = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  /**
   * The running head, in the terms of whatever ordering is on.
   *
   * A dictionary prints the first and last word of the spread at the top of it,
   * and a paginated index needs the same thing for the same reason: the reader
   * has to know whether the name they want is on this page before they read 36
   * tiles. It is also what replaces the old letter grouping. That grouping does
   * not survive a tile grid: 25 initials carry the 101 names, an average of four
   * names each, so in a four-column grid a letter band would fall on every
   * single row and the page would be more band than index.
   */
  const edge = shown[shown.length - 1]
  const head =
    shown.length === 0 || !edge
      ? ''
      : order === 'nom'
        ? `de ${shown[0]?.name} à ${edge.name}`
        : `de ${formatAmount(shown[0]?.productCount ?? 0)} à ${formatAmount(edge.productCount)} références`

  const pagerQuery: Record<string, string> = {}
  if (query) pagerQuery.q = query
  if (order === 'nom') pagerQuery.tri = 'nom'

  /**
   * Has the reader asked this page anything yet?
   *
   * `/marques` is the front door and introduces itself at length. `?q=` and
   * `?page=` are answers, and an answer that reprints its own introduction
   * spends 620 pixels of a phone screen on something the reader has just read.
   * The ordering is deliberately NOT part of this test: `?tri=nom` is the same
   * 101 names in another order, so it is still the whole list and still the
   * front door, and it is reached by a click that stays on the page rather than
   * by a load that begins at the top.
   */
  const answering = query !== '' || page > 1

  /**
   * The shelf: the first twelve of THIS list, whichever ordering is on.
   *
   * It is not a second selection and it is not a ranking. `sorted` is the index
   * itself, so by depth the shelf is the twelve deepest brands and by name it is
   * A to B, and in both cases the shelf is exactly the first twelve tiles of the
   * grid below, enlarged and photographed. That is what lets it sit above the
   * index without being the second list this page spent a rebuild removing.
   */
  const shelf = answering ? [] : sorted.slice(0, SHELF)

  return (
    <>
      <PageHeader
        title={`Les ${brands.length} marques que tient le magasin`}
        lead={
          answering
            ? `Le nom du fabricant n’est pas un champ de l’export : ces ${brands.length} marques ont été retrouvées à l’ingestion, en lisant les chemins de catégories et les titres de produits.`
            : `Le nom du fabricant n’est pas un champ de l’export : il y est rempli sur 14 lignes sur 7 116. Ces ${brands.length} marques ont été retrouvées à l’ingestion, dans les titres et les chemins de catégories.`
        }
        /* On a filtered load the aside stops repeating the total and answers
           the only question the reader has when the new document lands: did the
           filter run, and on how many names. Measured at 390 it sits on the
           title's baseline at y=210, comfortably inside an 844-pixel screen,
           while the line that states it in full sits at 932, 88 pixels under
           the fold. The reader in a hurry gets "1 marque sur 101" without
           scrolling; the one who scrolls gets the sentence. */
        aside={
          query
            ? `${formatCount(sorted.length, 'marque')} sur ${brands.length}`
            : formatCount(brands.length, 'marque')
        }
      />

      {shelf.length > 0 ? (
        <section className="shell" aria-labelledby="shelf-title">
          <div className="enter mb-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-rule pt-5">
            <h2 id="shelf-title" className="e-text text-sub font-semibold tracking-[-0.02em]">
              {order === 'nom'
                ? `Les ${SHELF} premières, de A à Z`
                : `Les ${SHELF} marques les plus fournies`}
            </h2>
            {/* The one line that says what all 48 photographs on this page are.
                It is here rather than in an alt attribute because it is true of
                every picture on the page at once, and because a reader with a
                screen reader should hear it once and not 48 times. */}
            <p className="e-text max-w-[46ch] text-small text-ink-3">
              Chaque tuile porte une référence réelle de la marque, la dernière que nous ayons
              photographiée.
            </p>
          </div>

          {/* THE RAIL, AND EVERY CLASS ON IT IS LOAD-BEARING.
              `overflow-x-auto` makes it a scroller and `overscroll-x-contain`
              stops the gesture continuing into the page or the browser's back
              swipe once the last card is reached. `snap-x snap-mandatory` with
              `snap-start` on the cards parks a card against the gutter rather
              than mid-photograph, and `scroll-pl` is what makes that gutter the
              stop line instead of the screen edge.
              THE NEGATIVE MARGIN IS WRITTEN WITH `calc(... * -1)`. Tailwind's
              `-mx-[var(--gutter)]` compiles to nothing at all in this project,
              which is a silent failure: the rail simply stops bleeding and the
              last card ends flush with the text column, which reads as the end
              of the list. `py-2` is the room the plate needs when it turns four
              degrees under a pointer, since a horizontal scroller clips its own
              vertical overflow.
              FROM `md` NONE OF IT EXISTS. The grid takes over, the negative
              margins are cancelled, the snapping is switched off and the card
              stops being 62 % of anything. A rail on a screen that can hold a
              grid is a way of hiding merchandise from someone who has room for
              it. */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-pl-[var(--gutter)] px-[var(--gutter)] py-2 md:mx-0 md:grid md:snap-none md:grid-cols-4 md:gap-x-8 md:gap-y-10 md:overflow-visible md:px-0 md:py-0 lg:grid-cols-6">
            {shelf.map((brand, position) => (
              <li
                key={brand.slug}
                /* A HAIRLINE BETWEEN EACH, AND ONLY ON THE ROLLED ROW.
                   Side by side, a brand's photograph, its name and its count sit
                   directly against the next brand's photograph with nothing but
                   a gap of 16 pixels between them, and at a glance the eye pairs
                   a name with the picture on its right as readily as with the one
                   above it. Every other list on this site is separated by a rule
                   and this was the one that was not. `first:border-l-0` because
                   a rule before the first card is a rule against the edge of the
                   screen, and `pl-4` gives the line something to stand off from.
                   From md it is a grid, the rows align on their own, and the
                   rules come off. */
                className="w-[62%] max-w-[15rem] shrink-0 snap-start border-l border-rule pl-4 first:border-l-0 first:pl-0 md:w-auto md:max-w-none md:shrink md:border-l-0 md:pl-0"
              >
                <ShelfCard brand={brand} picture={brand.image} index={position} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* The three figures that say what kind of list this is: how much of the
          catalogue it covers, how far apart its two ends are, and how many of
          its tiles carry a drawn mark. The third one is not housekeeping. It is
          the sentence that stops an uneven grid from being read as a statement
          about the shop, and it has to be printed above the grid, not under it.

          This is the front door's band. A reader who has asked for something
          gets the one-line version above the grid instead, and both of the
          things this band may never stop saying, the claim it does not make and
          the share of tiles that carry a mark, are in that line. */}
      {answering ? null : (
        <section className="shell mt-band" aria-label="Ce que couvre cette liste">
          <dl className="grid gap-x-12 gap-y-8 sm:grid-cols-3">
            {[
              {
                figure: formatAmount(branded),
                body: `références sur ${formatAmount(productCount)} portent une marque retrouvée. Les ${formatAmount(productCount - branded)} autres n’en portent aucune.`,
              },
              {
                figure: formatAmount(deepest?.productCount ?? 0),
                body: `références derrière ${deepest?.name ?? ''}, la marque la plus fournie. ${formatCount(singles, 'marque')} n’en ${singles > 1 ? 'ont' : 'a'} qu’une seule : le bas de la liste est aussi vrai que le haut.`,
              },
              {
                figure: `${formatAmount(marked)} sur ${brands.length}`,
                body: `tuiles portent un logo, parce que nous n’avons le fichier que pour celles-là. Un coin vide ne dit rien du stock.`,
              },
            ].map((item, index) => (
              <div
                key={item.figure}
                className="enter e-item border-t border-rule pt-5"
                style={{ '--enter-index': index } as React.CSSProperties}
              >
                <dt className="t-num text-title font-bold tracking-[-0.03em]">{item.figure}</dt>
                <dd className="mt-2 max-w-[38ch] text-small leading-[1.6] text-ink-3">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>

          <p className="enter e-text mt-stack max-w-[74ch] text-small leading-[1.65] text-ink-2">
            Cette liste dit ce qui est en rayon, pas qui nous représentons : elle ne revendique ni
            distribution officielle, ni partenariat, ni certification. Chaque nom ouvre la même
            requête que vous pouvez refaire vous-même, et c’est elle qui permet de tenir un portable{' '}
            {deepest?.name ?? 'HP'} et un DELL dans une seule liste.
          </p>
        </section>
      )}

      {/* The ordering links land here, and so does the form on the browsers
          that honour the fragment. Measured at 360: the masthead pins at
          exactly 112 and `scroll-mt-28` is 112, which put the heading's box
          flush against the green bar with nothing between them. 128 leaves the
          16-pixel gutter the rest of the page is set on; the pointer keeps the
          112 it was measured with. */}
      {/* A band separates two bands, and in the answering state there is no
          band above this one: the section follows the page header directly, so
          it takes the smaller measure. `--s-band` is 96 pixels at 390 and 122
          at 1440 against `--s-stack`'s 40 and 58, which is another 56 and 64
          pixels off the distance to the first tile. */}
      <section
        id="index"
        className={`shell pb-band scroll-mt-32 lg:scroll-mt-28 ${answering ? 'mt-stack' : 'mt-band'}`}
      >
        <SectionHeader
          title="L’index des marques"
          context={
            answering
              ? `Les ${brands.length} noms, ${formatCount(PER_PAGE, 'tuile')} par page, chacune avec une photographie de la marque, son nombre de références et son rayon.`
              : `Les ${brands.length} noms au complet, par profondeur de catalogue ou par ordre alphabétique, ${formatCount(PER_PAGE, 'tuile')} par page. Les ${marked} dont nous avons le fichier portent aussi leur logo, dans le coin.`
          }
        />

        {/* The front door's two obligations, carried into the answering state
            in a single line and printed where its band was, above the grid: the
            page claims nothing, and an empty corner is a file we do not have
            rather than a shelf we do not stock. */}
        {answering ? (
          <p className="enter e-text mb-stack max-w-[74ch] text-small leading-[1.65] text-ink-2">
            Cette liste dit ce qui est en rayon, pas qui nous représentons : elle ne revendique ni
            distribution officielle, ni partenariat, ni certification. {formatAmount(marked)} des{' '}
            {brands.length} tuiles portent un logo, parce que nous n’avons le fichier que pour
            celles-là ; un coin vide ne dit rien du stock.
          </p>
        ) : null}

        {/* A plain GET form. The filter is a page, not a state: /marques?q=hik
            can be shared, bookmarked and reloaded, and it costs the customer
            nothing on a phone. No client component, no handler, no state.

            IT IS BUILT TO WORK WITH SCRIPTING OFF AND THE SITE CURRENTLY DOES
            NOT, WHICH IS NOT THIS FORM'S DOING. Measured with script execution
            disabled at 1440: this page renders its masthead and its footer with
            nothing between them, and so does `/`, so the body of every route is
            hidden. The markup is all there, 36 tiles in the DOM and the field
            among them, painted at opacity 0. The stylesheet is not the culprit:
            its entrance states are gated on `(scripting: enabled)` exactly as
            they claim to be. The server HTML is. `src/app/template.tsx` wraps
            every route in a `motion.div` and ships its initial state as an
            inline `style="opacity:0;transform:translateY(12px)"`, which is in
            the response for every page and needs JavaScript to be animated
            away. Nothing in this file can reach it. It is recorded here because
            this form's whole justification is that it does not need scripting,
            and the next reader has to know the promise is broken one layer up.

            THE FIELD IS 56 TALL AND SET AT 16 PIXELS ON A PHONE, 48 AND 13 FROM
            MD UP. Two measured reasons, one each. Set at 13, iOS Safari zooms
            the page the instant the field takes focus and leaves it zoomed,
            which on a 101-name index is a page the reader then has to pan
            sideways to read; 16 is the threshold that stops it. And at `h-13`
            the submit button inside, the field is `items-stretch` with `m-1`
            around it, came out 42 tall, four pixels under the floor, on the one
            control that makes the form do anything. 56 puts it at 46. */}
        <form
          action="/marques#index"
          method="get"
          className="enter e-item mb-stack flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          {order === 'nom' ? <input type="hidden" name="tri" value="nom" /> : null}
          <label htmlFor="brand-filter" className="t-label text-ink-3">
            Trouver une marque
          </label>
          <div className="field flex h-14 w-full max-w-[24rem] items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-12">
            <input
              id="brand-filter"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="hik, tp, ubi…"
              className="min-w-0 flex-1 bg-transparent px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small"
            />
            <button
              type="submit"
              className="press m-1 flex shrink-0 items-center rounded-[6px] bg-secondary px-5 text-small font-semibold text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary"
            >
              Filtrer
            </button>
          </div>
          {query ? (
            <Link
              href={href('', order === 'nom' ? 'nom' : null, '#index')}
              className="draw-under inline-flex min-h-11 items-center py-1 text-small text-ink-2 hover:text-secondary md:inline md:min-h-0"
            >
              Revoir les {brands.length}
            </Link>
          ) : null}
        </form>

        <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-b border-rule pb-5">
          <p className="e-text text-small text-ink-2">
            <span className="t-num">
              {query
                ? `${formatCount(sorted.length, 'marque')} sur ${brands.length} pour « ${query} »`
                : `${formatCount(brands.length, 'marque')}, de ${formatAmount(deepest?.productCount ?? 0)} références à ${formatAmount(shallowest?.productCount ?? 0)}`}
            </span>
            {pages > 1 && head ? (
              <span className="t-num block text-ink-3">{`Page ${page} sur ${pages}, ${head}`}</span>
            ) : null}
          </p>

          <div className="e-item flex flex-wrap items-center gap-x-2 gap-y-2">
            <span id="order-label" className="t-label mr-1 hidden text-ink-3 sm:inline">
              Classer
            </span>
            <ul aria-labelledby="order-label" className="flex flex-wrap gap-2">
              {(
                [
                  { key: 'profondeur', label: 'Par profondeur', param: null },
                  { key: 'nom', label: 'De A à Z', param: 'nom' },
                ] as const
              ).map((option) => {
                const active = option.key === order
                return (
                  <li key={option.key}>
                    <Link
                      href={href(query, option.param, '#index')}
                      scroll={false}
                      aria-current={active ? 'true' : undefined}
                      className={`press inline-flex min-h-11 items-center rounded-pill px-5 py-2 text-small whitespace-nowrap transition-colors duration-[var(--t-fast)] md:min-h-0 ${
                        active
                          ? 'bg-secondary font-semibold text-on-surface'
                          : 'border border-rule text-ink-2 hover:border-ink hover:text-secondary'
                      }`}
                    >
                      {option.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="enter max-w-[62ch]">
            <p className="text-body text-ink">Aucune marque ne contient « {query} ».</p>
            <p className="e-text mt-3 text-small leading-[1.65] text-ink-2">
              Le nom peut être partiel : « hik » trouve HIKVISION, « tp » trouve TP-LINK. Si vous
              cherchez un produit plutôt qu’un fabricant, il est dans le catalogue, qui se parcourt
              rayon par rayon.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Action href="/catalogue" variant="secondary">
                Ouvrir le catalogue
              </Action>
              <Link href="/marques" className="draw-under text-small text-ink-2 hover:text-secondary">
                Voir les {brands.length} marques
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* TWO ON A PHONE, THREE FROM SM, FOUR FROM LG, and the tile is 158
                wide at 390, which is what the longest name in the set, WESTERN
                DIGITAL, needs to break on two lines rather than three. The
                vertical gap is larger than the horizontal one on purpose: the
                top rule is the tile, and rules that sit too close to the foot of
                the tile above read as an underline for it. */}
            <ul className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4">
              {shown.map((brand, position) => (
                <li key={brand.slug}>
                  <BrandTile brand={brand} picture={brand.image} index={position} />
                </li>
              ))}
            </ul>

            {/* The pager writes `?page=`, keeps `q` and `tri`, and lands the
                reader at the top of the page rather than back on the grid: it
                builds its own hrefs and has no room for a fragment. On a
                three-page index that is a fair trade, and it puts the sentence
                that says what this list is back in front of a reader who is
                about to read 36 more manufacturer names. */}
            <Pager basePath="/marques" query={pagerQuery} page={page} pages={pages} />
          </>
        )}
      </section>
    </>
  )
})
