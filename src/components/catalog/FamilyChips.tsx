import Link from 'next/link'

import { formatAmount } from '@/lib/format'
import type { EnfantListe } from '@/types/catalogue'

/**
 * The families above a listing: a department's largest, a family's children, a
 * brand's only one.
 *
 * TAKEN OUT OF THE OLD `Listing`, WHICH IS GONE. That component drew these chips,
 * a bar of four orderings and a grid; the orderings now live in the filter panel
 * every listing shares, and the chips are the one part of it that is the page's
 * own rather than the panel's.
 *
 * THE FAMILIES COME BEFORE THE PRODUCTS. On a department holding 845 references
 * across 22 families, the grid is not the answer to the reader's question, it is
 * what they have to get past. The row of families is the answer, and putting it
 * above the grid is worth the vertical space it costs: it is the difference
 * between narrowing in one click and paging through thirty-five screens.
 *
 * They carry their counts. A family with 3 products behind it and one with 212
 * are the same shape without them, and a reader who clicks the first has been
 * sent to a dead end by a control that looked identical to a live one.
 *
 * A ROW OF PILLS IS NOT A ROW ON A PHONE, IT IS A TOWER, SO UNDER MD IT IS A
 * SHELF THAT SCROLLS SIDEWAYS. Measured on /rayon/reseaux-switchs-routeurs at
 * 360: the 18 families landed on 18 separate lines — names like "Routeurs/AP
 * D-LINK" and "Switchs administrables" are 200 to 290 pixels wide once the
 * pill's 40 pixels of horizontal padding and the count are added, and two of
 * them never fit across 306 — for 975 pixels of chips standing between the
 * reader and the first product. Setting them as a full-bleed index of 44-pixel
 * rows brought that to 811 measured at 390, which is better reading and still
 * an entire screen of names: on that page the first photograph was at y=1440,
 * and 811 of those pixels were this nav.
 *
 * A LIST THAT IS ONLY EVER SAMPLED DOES NOT NEED ITS OWN SCREEN. Nobody reads
 * 18 family names top to bottom; they look for one, and if it is not in view
 * they look further. Down the page that costs the reader the product grid.
 * Across the page it costs nothing, because the grid stays exactly where it is.
 * So below `md` the same links are laid on one horizontal rail: 68 pixels
 * instead of 811 on the department, 68 instead of 271 on the family. It is a
 * shelf and it behaves like one — `snap-x snap-mandatory` on the rail with
 * `snap-start` on each chip so a flick lands on a name rather than between two,
 * `overscroll-x-contain` so reaching the end does not pull the page or trigger
 * the browser's back gesture, and the rail bled out to both screen edges by the
 * gutter so the third chip is visibly cut off at 390 and says there is more.
 * Vertical scrolling is untouched: the rail overflows on one axis only, so a
 * thumb moving down the page moves the page.
 *
 * THE NAME IS ON ITS OWN LINE ABOVE THE COUNT, WHICH IS WHY A CHIP IS 56 TALL
 * AND NOT 44. Side by side, as the desktop pill sets them, a chip carrying
 * "Câblage/Testeurs/ Accessoires Réseaux" is 290 pixels wide and one and a half
 * of them fill a 390 screen; stacked, the same names sit between 128 and 240,
 * so two and a bit are in view and the rail can be read by sampling instead of
 * by scrolling. The 12 pixels of vertical padding on the rail are not decoration
 * either: the document's focus ring is drawn 3 pixels outside the element and is
 * 2 thick, and a scroll container clips on both axes, so without them a keyboard
 * pass along the shelf would have its ring sliced off top and bottom.
 *
 * Same markup, same links, same counts, and nothing is dropped or shortened:
 * `md:` puts the pills back, measured unchanged at 1440 (first pill 291.7 x
 * 37.5 at x 108, nav 1224 x 180, 4 rows).
 *
 * They are links to the family's own page and carry the family's own count,
 * not the count under the reader's current filters: they are navigation, and a
 * door has to say what is behind it whatever was ticked on the way in.
 */
export function FamilyChips({ familles }: { familles: readonly EnfantListe[] }) {
  if (familles.length === 0) return null
  return (
    <nav aria-label="Familles de ce rayon" className="enter mb-6 md:mb-stack">
      {/* The negative inline margin is written as a calc and not as
          `-mx-[var(--gutter)]`, which compiles to nothing. It cancels the
          shell's gutter so the rail runs edge to edge, and the matching
          `px` puts the first chip back on the shell's own left edge. The
          scroll padding repeats it, otherwise a snapped chip parks under
          the screen edge instead of under the text above it. */}
      <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)] py-1.5 scroll-pl-[var(--gutter)] md:mx-0 md:flex-wrap md:gap-2.5 md:snap-none md:overflow-visible md:px-0 md:py-0">
        {familles.map((child) => (
          <li key={child.slug} className="snap-start shrink-0 md:shrink md:snap-align-none">
            <Link
              href={`/categorie/${child.slug}`}
              className="press flex min-h-14 w-max min-w-32 max-w-60 flex-col justify-center rounded-control border border-rule px-4 py-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:border-ink hover:text-secondary md:inline-flex md:min-h-0 md:w-auto md:max-w-none md:min-w-0 md:flex-row md:items-center md:gap-2.5 md:rounded-pill md:px-5 md:py-2 md:hover:border-ink"
            >
              <span className="w-full truncate md:w-auto md:flex-none md:overflow-visible">
                {child.nom}
              </span>
              <span className="t-num shrink-0 text-micro text-ink-3">
                {formatAmount(child.compte)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
