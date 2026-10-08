import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { FamilyChips } from '@/components/catalog/FamilyChips'
import { FilteredListing, lireListeFiltree } from '@/components/catalog/FilteredListing'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductMedia } from '@/components/product/ProductMedia'
import { BRAND_MARK_BY_NAME } from '@/constants/brand-marks'
import { lireNavigation } from '@/lib/catalogue-en-direct'
import { marqueParSlug, rayonParId } from '@/lib/catalogue-vues'
import { formatAmount, formatCount } from '@/lib/format'
import { countFilters, readListing, scopedPlace, type ListingParams } from '@/lib/params'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'
import type { EnfantListe } from '@/types/catalogue'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingParams>
}

export const generateMetadata = metadonneesAvecPanne(async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const nav = await lireNavigation()
  const marque = marqueParSlug(nav, slug)
  if (!marque) return {}
  const { filters } = readListing(query, nav, scopedPlace('marque', marque.slug, marque.nom))
  return {
    // A filtered brand is a subset of a page already indexed; see /catalogue.
    ...(countFilters(filters) > 0 ? { robots: { index: false, follow: true } } : {}),
    title: marque.nom,
    description:
      `${formatCount(marque.compte, 'référence')} ${marque.nom} au catalogue NowTech Center, ` +
      `tous rayons confondus, avec les prix du comptoir de Douala et Yaoundé.`,
  }
})

/**
 * One brand.
 *
 * THE PAGE EXISTS BECAUSE THE CURRENT SITE CANNOT DRAW IT. The export has no
 * brand taxonomy, the column is filled on 14 rows out of 7 116, so a customer
 * who wants to see every HP in the shop has to walk six departments. The name
 * was recovered at ingest from category paths and product titles, and this page
 * is the whole point of that recovery: 544 HP references in one list, ordered
 * four ways, with the families they fall into across the top.
 *
 * IT CLAIMS NOTHING. No official distribution, no partnership, no certification,
 * no "revendeur agréé". The line under the title says exactly where the name
 * came from, because a page titled with a manufacturer's name and set in that
 * manufacturer's mark is read as a claim unless it says otherwise.
 *
 * ==========================================================================
 * WHAT THIS PASS CHANGED, AND THE NUMBERS THAT FORCED IT
 * ==========================================================================
 *
 * MEASURED AT 390x844 BEFORE: 722 words, and the first photograph at y=1 723 —
 * later brought to y=1 126 by the family rail and the sort rail inside
 * `Listing`, which are not this route's to claim. The remaining 1 126 pixels
 * WERE this route's: a breadcrumb, a title, a two-line lead, a provenance band
 * 260 pixels tall built around a 56-pixel mark, and then a `SectionHeader`
 * whose title said "Toutes les références HP" under an h1 that already said HP
 * and whose context paragraph explained the sort order. Two screens of a
 * 844-pixel phone spent before the shop showed a single thing it sells. The
 * client's words: "on a l'impression de ne pas tomber sur l'essentiel".
 *
 * THREE MOVES, IN THE ORDER THEY PAY.
 *
 * 1. THE MARK MOVED ONTO THE TITLE LINE AND THE BAND UNDER IT COLLAPSED TO ONE
 *    PARAGRAPH. The mark was the left column of a two-column band, which cost
 *    the band its own row and squeezed the sentence beside it into a 246-pixel
 *    measure — 60 words became eleven lines. On the h1's own baseline it costs
 *    nothing at all: the title row is 32 pixels tall on a phone either way,
 *    because `--t-title` is 24px there and the mark is set to the same 2rem it
 *    is drawn at everywhere else. The sentence then runs the full 331-pixel
 *    shell and lands in four lines. 68 of the 101 brands hold no mark and the
 *    title row is simply the name for them, which is the common case and the
 *    reason the mark can never be the thing the layout is built around.
 *
 * 2. THE `SectionHeader` IS GONE, AND SO IS EVERY WORD IT CARRIED. Neither
 *    /categorie nor /rayon has one: both go breadcrumb, header, listing, and
 *    this page was the outlier. Its title repeated the h1, its count repeated
 *    the aside, its escape link repeated the breadcrumb's own "Marques" step —
 *    which is the ONE step a phone still draws, since `Breadcrumb` keeps the
 *    last parent below `sm` — and its closing sentence explained an ordering
 *    that the sort bar now names in its own range line. About 40 words and 140
 *    pixels, none of which was a fact this page owned.
 *
 * 3. THE FAMILY CHIPS BECAME PHOTOGRAPHS. This is the pass's actual answer to
 *    "visuellement c'est fade", and it is the one the shop already owned.
 *
 * ==========================================================================
 * THE FAMILY SHELF
 * ==========================================================================
 *
 * `FamilyChips` draws the brand's families as text chips, and on a brand page
 * those chips are the single most useful control on the screen: HP is 544
 * references and nobody wants all of them, they want the 177 laptops or the 95
 * ink cartridges. They were also the last thing on the page still made of pure
 * type. So this route takes them over — it draws no chips when the shelf
 * exists and draws the same links itself, each one carrying a real
 * photograph of a real product of THIS brand in THAT family.
 *
 * NOTHING IS DUPLICATED AND NOTHING IS INVENTED. It is not a second product
 * grid: the twelve cards are twelve DIFFERENT families, where the grid below is
 * one page of one ordering. It is not a selection, a ranking or a "best seller":
 * this export has no such field and none is fabricated here. Each picture is
 * simply the newest photographed product of the brand filed PRIMARILY in that
 * family, and the backend hands it over with the family itself (`enfants[].image`).
 * It used to be recovered here by walking up to 24 pages of the brand's listing;
 * against a backend that walk would be 24 calls a render. Run it twice, get the
 * same picture.
 *
 * 400 OF THE 401 (BRAND, FAMILY) PAIRS HAVE A PHOTOGRAPH. Checked across the
 * whole catalogue on the 72 brands that draw a shelf: exactly one pair is
 * without a shot product, LENOVO / Tablettes, one reference. It draws
 * `ProductMedia`'s "Photo à venir" frame, which is a labelled well and not a
 * broken card, and it is the same frame the product grid below would draw for
 * the same reference.
 *
 * THE SHELF EXISTS FROM TWO FAMILIES UP. 29 of the 101 brands sit in a single
 * family, and a shelf of one card is not navigation, it is an ornament: those
 * brands keep the plain chip `FamilyChips` draws on every listing, and their first
 * photograph is the first product of the grid, measured at y=592 on a 390 phone.
 *
 * IT IS A RAIL BELOW `md` AND A GRID ABOVE IT, and the breakpoint is not a
 * guess: it is the one `FamilyChips` switches its chips at, so the rails on
 * this page start and stop together. Twelve photographed cards stacked
 * vertically would be 2 900 pixels of page, which is the disease and not the
 * cure. The rail snaps (`snap-x
 * snap-mandatory` on the rail, `snap-start` on the cards), contains its own
 * overscroll so reaching the end never pulls the page or fires the browser's
 * back gesture, bleeds into the gutter so the third card is visibly cut by the
 * screen edge, and overflows on ONE axis, so a thumb moving down the page moves
 * the page. From `md` there is no scroller, no snapping and no negative margin:
 * a rail on a screen that can hold a grid hides merchandise from a reader who
 * has room for it.
 *
 * THE CARD IS 44 PER CENT OF THE SCREEN AND NOT 62. /marques sets its brand
 * cards at 62 % because a brand card is the merchandise on that page. Here the
 * card is a filter: it has to be recognisable, not admired, and at 44 % two and
 * a half of them are in view at 390 against one and a half, which is what makes
 * the rail readable by sampling instead of by scrolling. The photograph is
 * still drawn by `ProductMedia`, so it inherits the white well, the hairline,
 * the shimmer and the four per cent lean every product picture on this site
 * has: a family card that framed its picture differently would be a second
 * visual language for the same object.
 *
 * AND THE GRID IS SIX COLUMNS AT EVERY WIDTH FROM `md`, WHICH IS MEASURED TOO.
 * Four columns is what a card of this size wants at 820, and it is also three
 * rows for the sixteen brands that list nine families or more: the shelf came
 * out 747 pixels tall at 820, taller than it is on the phone it was written for.
 * Six columns caps it at two rows everywhere — 543 pixels at 1440 with 184-pixel
 * cards, about 330 at 820 with 96-pixel ones — and 96 pixels is still a printer
 * told apart from a camera, which is the whole job of the picture here. Below
 * six families, which is 76 of the 101 brands, it is one row at every width.
 *
 * THE PHOTOGRAPHS ARE `alt=""`. They are not the link — the family name and its
 * count are, in real text underneath. Read out, the alternative is a
 * ninety-character product title announced before each of twelve family names.
 * The caption above the shelf says what all twelve pictures are, once.
 *
 * ==========================================================================
 * MEASURED AFTER, ON /marque/hp
 * ==========================================================================
 *
 *              1re image   mots devant elle   images   hauteur
 *   390 avant    1 723 *          170            37     8 185
 *   390 apres      661             93            49     8 159
 *  1440 avant    1 174 *          173            37     4 814
 *  1440 apres      721             94            49     5 145
 *
 *   * the 1 723 is the figure the mission was written from; by the time this
 *     pass started, the rails inside `Listing` and `SortBar` had already
 *     brought it to 1 126 at 390 and 1 174 at 1440, and those are not this
 *     route's to claim. What this route removed is the 465 pixels between
 *     1 126 and 661.
 *
 * The first photograph is now the first card of the shelf, and the 93 words in
 * front of it are the breadcrumb, the title, the count, the one-line lead, the
 * provenance sentence and the shelf's own caption — nothing else. On a 844
 * screen the reader lands on two whole product photographs. /marque/zkteco,
 * which holds no mark at all, comes out at 606 and 88. The 320-pixel phone,
 * where the shell is 280 wide, holds at 728. The page got 12 pictures longer
 * and 13 words shorter.
 *
 * A BRAND IN ONE FAMILY DRAWS NO SHELF AND STILL OPENS ON A PHOTOGRAPH:
 * /marque/garmin, 28 references in "GPS Garmin", puts the first product card at
 * y=798 at 390 and y=915 at 1440, both inside the opening screen, because
 * the chip and sort rails of the time were 160 pixels instead of 480 of stacked
 * pills. There is nothing to add above them that would not be an ornament.
 * (Measured before the sort rail gave way to the shared filter panel, whose
 * phone form is one pinned 73-pixel "Filtrer et trier" bar.)
 * ==========================================================================
 *
 * THE MARK IS DRAWN ONLY IF WE HOLD ONE, and 68 of the 101 brands have none.
 * Nothing is drawn in their place: an initial in a circle or a grey rectangle is
 * a fabricated logo standing exactly where a real one is missing.
 *
 * AND IT IS DRAWN AT ITS OWN SIZE HERE WHILE /marques STAMPS IT AT 40, OR 30, OR
 * less on a narrow phone. That page holds thirty-three marks in one grid and
 * seven of the files paint so much of their 24x24 box that they outweigh every
 * wordmark beside them: XIAOMI at 74.5 % of the box, MIKROTIK 56.8, HP 54.6,
 * APPLE 52.3, LINKSYS 51.5, UBIQUITI 48.6 and TP-LINK 46.0, against a set median
 * of 17.8. Weight is a comparison, and there is nothing here to compare against:
 * one brand, one mark, its own title. Even XIAOMI, which is a filled squircle,
 * reads as a logo beside a word rather than as the black slab it becomes in a
 * grid of thirty-three.
 *
 * ITS PANEL HAS NO BRAND GROUP. The brand is the page: a second brand ticked
 * beside it would be unioned in and widen the grid past the name in the title.
 * The panel still narrows HP by department, family, price and availability, and
 * the family shelf above it is a door to each family's own filtered address.
 *
 * THE DEPARTMENTS ARE STATED, NOT LINKED. HP spans six of the twelve, which is
 * the fact worth printing, and it is printed once, in the shelf's caption, next
 * to the families it explains. They are not links because /rayon/impression
 * would silently drop the brand the reader came for, and a control that returns
 * more than you asked for is worse than a sentence. The families are the real
 * narrowing, which is why they are the thing that got the photographs.
 */

/**
 * One card of the family shelf.
 *
 * The three layers are a product card's own: `.plate` is the green board that
 * turns four degrees under a pointer, `.sheen` is the light that wipes across
 * the well, and the well itself is `ProductMedia`. `.plate > *` needs exactly
 * one child, which is why the sheen is wrapped rather than merged into it.
 *
 * THE NAME IS CLAMPED TO TWO LINES AND THE COUNT IS NOT. Family names in this
 * export run long — "HP Laser Monochrome (N/B)" and "Câblage/Testeurs/
 * Accessoires Réseaux" are 25 and 37 characters — and on a 171-pixel card at
 * 15px they need three and four lines. Two lines is where the cards in a rail
 * still line their counts up with each other, and the third line is never the
 * one that identifies the family.
 *
 * AND IT IS SET AT 13px UNTIL `lg`, WHICH IS THE CARD'S WIDTH TALKING. At 15px
 * "Lecteurs/pointeuses" is about 150 pixels of unbreakable string — Chromium
 * does not break a line at a slash — on a card that is 140 wide at 320, so
 * `break-words` fired and the shelf read "Lecteurs/pointe / uses ZKTeco". At
 * 13px the same string is 130 and fits the line whole. `min-w-[9.5rem]` is the
 * other half of the fix: it floors the card at 152 pixels on the narrowest
 * phone instead of letting 44 % take it down to 140. From `lg`, where a card is
 * 184 wide, the name goes back to the 15px every other card on this site uses.
 */
/**
 * THE TILE OPENS THE PAGE ITS NUMBER COUNTS, AND IT DID NOT.
 *
 * The count printed under each family is the count FOR THIS BRAND: on HP,
 * "177 références" is 177 HP laptops. The tile used to link to
 * `/categorie/<famille>`, which is that family for EVERY brand, so the reader
 * was promised 177 and handed 307. A number beside a door has to be the number
 * of things behind the door; anything else is the one kind of mistake this
 * catalogue is built to avoid, and it is worse than no number at all because it
 * looks like a fact.
 *
 * `/catalogue?famille=X&marque=Y` is the page that renders exactly this count.
 * Both facets already exist, the URL is shareable, and the filter panel opens
 * with the two values shown as removable tokens, so the reader can see what they
 * are looking at and widen it in one tap.
 */
function FamilyCard({
  family,
  brand,
  picture,
  index,
}: {
  family: EnfantListe
  /** The brand slug, so the destination is narrowed the way the count was. */
  brand: string
  picture: string | null
  index: number
}) {
  return (
    <Link
      href={`/catalogue?famille=${family.slug}&marque=${brand}`}
      style={{ '--enter-index': index % 6 } as React.CSSProperties}
      className="group enter e-item flex h-full flex-col"
    >
      <span className="plate mb-3 block">
        <span className="sheen relative block overflow-hidden rounded-well">
          <ProductMedia
            src={picture}
            alt=""
            sizes="(max-width: 767px) 44vw, (max-width: 1023px) 22vw, 15vw"
            /* The first two cards are the only pictures above the fold at 390.
               Everything after them, the whole product grid included, is lazy. */
            priority={index < 2}
          />
        </span>
      </span>

      <span className="clamp-2 text-small font-semibold leading-[1.3] tracking-[-0.01em] break-words text-ink transition-colors duration-[var(--t-fast)] group-hover:text-secondary lg:text-body">
        {family.nom}
      </span>
      <span className="t-num mt-1 text-micro text-ink-2">
        {formatCount(family.compte, 'référence')}
      </span>
    </Link>
  )
}

export default avecPanneCatalogue(async function MarquePage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])

  const nav = await lireNavigation()
  const marque = marqueParSlug(nav, slug)
  if (!marque) notFound()

  const lecture = await lireListeFiltree({
    nav,
    params: query,
    place: scopedPlace('marque', marque.slug, marque.nom),
  })
  if (!lecture) notFound()
  const { liste, identite } = lecture

  const mark = BRAND_MARK_BY_NAME.get(marque.nom)

  // The departments come back as short labels ("Impression", "TV & Audio") and
  // that is not a cosmetic choice: the full names carry commas of their own,
  // "Impression, Copie & Scan", and a comma-joined sentence built from them
  // reads as nine departments where there are six.
  const departments = marque.rayons
    .map((id) => rayonParId(nav, id)?.nomCourt ?? null)
    .filter((name): name is string => name !== null)

  // THE HIDDEN BUCKET IS NOT A FAMILY AND MUST NOT BE PHOTOGRAPHED. `Non
  // classé` is the one category marked hidden. The backend already leaves it
  // out of a brand's families; the filter stays so that a change on that side
  // can never put a card with a photograph on a bucket the shop does not offer.
  const families = identite.enfants.filter((family) => family.slug !== 'non-classe')

  // A single family is a fact about the brand, not a shelf. See the head.
  const shelf = families.length >= 2 ? families : []

  const top = families[0]

  return (
    <>
      <Breadcrumb path={identite.fil} current={identite.titre} />

      <PageHeader
        title={
          mark ? (
            <span className="flex items-center gap-3 sm:gap-4">
              {/* Every file in the set is a 24x24 square, so the mark is bound
                  by its height and the box must be square too: given a wide box
                  the mask centres the mark in it and the logo floats away from
                  the word it belongs to. `h-full` on the mask overrides the
                  2rem the class sets, so one declaration drives both axes.
                  36 / 44 / 56 AND NOT THE TITLE'S OWN 24, BECAUSE HALF THE SET
                  IS A WORDMARK. `contain` binds the drawing to the square, so a
                  wordmark like GARMIN or PANASONIC — 24 units wide and about 4
                  tall in its own viewBox — paints a sixth of the height it is
                  given: at a 32-pixel box that is 5 pixels of type and it read
                  as a smudge beside the name. At 36 it is legible on a phone,
                  and `lg` is where `--t-title` finally leaves 24px behind and
                  the 56 the old provenance band used comes back. */}
              <span
                aria-hidden
                className="block size-9 shrink-0 sm:size-11 lg:size-14"
                /* `--mark-ink` EST NOUVEAU ICI, ET SANS LUI CETTE PAGE SERAIT
                   LA DERNIERE A DESSINER UN LOGO EN GRIS. Le mur et l'index
                   des marques peignent desormais chaque marque de sa couleur ;
                   ce titre-ci tirait la sienne du seul defaut de `.brand-mark`,
                   donc il serait reste a l'encre de la page pendant que les
                   deux autres passaient en couleur. C'est la meme marque a
                   trois endroits, elle doit avoir la meme couleur aux trois. */
                style={
                  {
                    '--mark-ink': mark.paint,
                    '--mark-src': `url(/brands/${mark.file}.svg)`,
                  } as React.CSSProperties
                }
              >
                <span className="brand-mark" style={{ height: '100%' }} />
              </span>
              {identite.titre}
            </span>
          ) : (
            identite.titre
          )
        }
        lead={
          !top
            ? 'Tout ce que le magasin tient sous ce nom.'
            : families.length === 1
              ? `Tout ce que le magasin tient sous ce nom, rangé dans une seule famille : « ${top.nom} ».`
              : `Tout ce que le magasin tient sous ce nom, réparti en ${formatCount(families.length, 'famille')}.`
        }
        aside={
          liste.active > 0
            ? `${formatAmount(liste.total)} / ${formatAmount(identite.total)}`
            : formatCount(liste.total, 'référence')
        }
      />

      {/* THE SENTENCE THAT KEEPS THE PAGE HONEST, AND IT IS THE WHOLE BAND NOW.
          A page titled with a manufacturer's name, set in that manufacturer's
          mark, is read as a claim of distribution unless it says otherwise, so
          this cannot move below the shelf or the grid however much of the fold
          it costs. What it could do was stop being a two-column band: at full
          measure it is four lines at 390 where the column beside a mark made it
          eleven. */}
      <section className="shell" aria-label="D’où vient cette liste">
        {/* The rule is on the wrapper and the measure is on the paragraph. Put
            both on one element and the hairline stops at 74 characters, which
            at 1440 is 604 pixels of a 1 224-pixel column: a rule that ends in
            the middle of the page reads as a rule that failed to draw. */}
        <div className="enter border-t border-rule pt-4">
          <p className="e-text max-w-[74ch] text-small leading-[1.6] text-ink-3">
            Ce nom n’est pas un champ de notre export : il a été retrouvé à l’ingestion, dans les
            titres de produits et les chemins de catégories, ce qui permet de réunir ici ce qui est
            rangé ailleurs. Nous ne revendiquons ni distribution officielle, ni partenariat, ni
            certification.
          </p>
        </div>
      </section>

      {shelf.length > 0 ? (
        <section className="shell mt-8 sm:mt-stack" aria-labelledby="familles">
          <div className="enter mb-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 sm:mb-6">
            <h2 id="familles" className="e-text text-sub font-semibold tracking-[-0.02em]">
              {formatCount(shelf.length, 'famille')}
            </h2>
            {/* The one line that says what all twelve photographs are, and the
                only place the departments are named. It is here rather than in
                twelve alt attributes because it is true of every picture at
                once, and because a reader on a screen reader should hear it
                once and not twelve times. */}
            <p className="e-text max-w-[52ch] text-small text-ink-3">
              {departments.length > 0
                ? `${formatCount(departments.length, 'rayon')} : ${departments.join(', ')}. `
                : ''}
              Chaque tuile porte une référence réelle de la marque, la dernière que nous ayons
              photographiée dans cette famille.
            </p>
          </div>

          {/* THE RAIL, AND EVERY CLASS ON IT IS LOAD-BEARING. `overflow-x-auto`
              makes it a scroller and `overscroll-x-contain` stops the gesture
              continuing into the page or into the browser's back swipe once the
              last card is reached. `snap-x snap-mandatory` with `snap-start` on
              the cards parks a card against the gutter rather than mid
              photograph, and `scroll-pl` is what makes that gutter the stop line
              instead of the screen edge.
              THE NEGATIVE MARGIN IS WRITTEN WITH `calc(... * -1)`. Tailwind's
              `-mx-[var(--gutter)]` compiles to nothing at all in this project,
              which is a silent failure: the rail simply stops bleeding and the
              last card ends flush with the text column, which reads as the end
              of the list. `py-2` is the room the plate needs when it turns four
              degrees under a pointer, since a horizontal scroller clips its own
              vertical overflow, and it is also what keeps the focus ring — drawn
              3 pixels outside the element and 2 thick — from being sliced off a
              card during a keyboard pass. */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-pl-[var(--gutter)] px-[var(--gutter)] py-2 md:mx-0 md:grid md:snap-none md:grid-cols-6 md:gap-x-6 md:gap-y-8 md:overflow-visible md:px-0 md:py-0">
            {shelf.map((family, index) => (
              <li
                key={family.slug}
                className="w-[44%] min-w-[9.5rem] max-w-[11rem] shrink-0 snap-start md:w-auto md:min-w-0 md:max-w-none md:shrink"
              >
                <FamilyCard
                  family={family}
                  brand={slug}
                  picture={family.image ?? null}
                  index={index}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section data-results className="shell mt-band pb-band">
        {/* The families are handed over to the shelf above, so no chips are
            drawn under it: two rows of the same twelve links, one photographed
            and one not, is one row too many. When there are fewer than two the
            shelf does not exist and the chip is drawn exactly as on every other
            listing page — from the filtered list either way, so the hidden
            bucket never reappears as a chip. */}
        <FamilyChips familles={shelf.length > 0 ? [] : families} />
        <FilteredListing liste={liste} nav={nav} priorityCount={shelf.length > 0 ? 0 : 3} />
      </section>
    </>
  )
})
