import Link from 'next/link'

import { IconChevronDown } from '@/components/brand/Icons'
import type { IndexDepartment } from '@/types/catalogue'
import { formatAmount } from '@/lib/format'

/**
 * The index: every family the shop has, under the department it belongs to.
 *
 * IT IS SET LIKE AN INDEX BECAUSE THAT IS WHAT IT IS. Not tiles, not cards, not
 * twelve photographs of departments. 218 entries drawn as cards is fourteen
 * screens of scrolling to answer "do they carry onduleurs"; the same 218 set as
 * a multi-column list is two screens, and the eye reads a column of names far
 * faster than a field of boxes. This is the one surface on the site where the
 * whole shape of the business is visible at once, and density is the feature.
 *
 * AND DENSITY IS EXACTLY WHAT A PHONE CANNOT BUY. Measured at 390 before this
 * file was touched: the index alone was 11 743 pixels of the catalogue's 18 607,
 * which is fourteen screens of link, and it was the second half of a page a
 * reader had already spent eight screens getting down. Two columns are one
 * column there, so the whole economy that makes this shape work at 1440 —
 * 218 names read three abreast in two screens — is gone, and what is left is a
 * scroll with no landmarks in it.
 *
 * SO ON A PHONE THE INDEX IS FOLDED BY RAYON, AND THE FOLD IS A FRAGMENT LINK.
 * Twelve headings, each with the count of the families under it, and a link that
 * opens exactly one of them. The list is hidden with `display: none` and shown
 * again by `:target`, which is CSS every browser has had since 2001, needs no
 * JavaScript at all, and gives the state a URL: `/catalogue#familles-security`
 * opens the security families for whoever the address is sent to. Only one
 * element in a document can be `:target`, so opening a rayon closes the last
 * one, which is the behaviour an accordion has to be written to get.
 *
 * NOTHING OF THE FOLD REACHES A POINTER. Every rule of it is behind `sm:`, and
 * the index measured unchanged at 1440: three columns, 33.5-pixel rows, all 218
 * names on screen at once. The `:target` rule survives up there and is simply
 * never the thing that decides, because `sm:block` already showed the list.
 *
 * THE COUNT IS THE SECOND COLUMN, IN MONO. It is what makes the index worth
 * reading rather than just navigable: 845 against 3 is the difference between a
 * department and a shelf, and tabular figures are what let a reader compare them
 * down the column instead of item by item.
 *
 * Ordered by count, not alphabetically. A reader scanning for what this shop is
 * actually deep in gets the answer in the first three lines of each block; a
 * reader hunting one name uses the browser's own find, which does not care what
 * order the list is in.
 *
 * CSS columns rather than a grid, because the blocks are lists of wildly
 * different lengths and a grid would leave one column of a twelve-entry
 * department stranded beside three empty ones. `break-inside: avoid` on the row
 * is what stops a name from being cut across the column boundary.
 *
 * THREE COLUMNS AT THE TOP END, NOT FOUR. Four gave each name 276 pixels, and
 * this taxonomy is full of names like "Lecteurs/pointeuses biométriques" that
 * truncate at that width: three of them appeared in the same block, ellipsed at
 * the same character, telling the reader nothing about which was which. Three
 * columns give 388, which carries all but a handful whole.
 *
 * THE OUTER BOX IS A FLEX COLUMN AND NOT A GRID. A grid's implicit `1fr` track
 * is `minmax(auto, 1fr)`, whose floor is the item's min-content width; with a
 * multi-column list inside, that floor exceeded the shell and the track grew
 * past it, so the fourth column and every count in it were painted outside the
 * page and clipped. A flex column stretches its items to the container instead
 * of being sized by them, which is the behaviour this needs.
 *
 * AND THE LEADER LINE IS DELETED ON A PHONE, BECAUSE THERE IT WAS EATING THE
 * NAMES IT WAS DRAWN TO SERVE. Measured at 360: the column is 306 pixels, the
 * rule takes `flex-1` exactly as the name does, so the two split what the count
 * leaves and the name was handed 130 pixels. 62 of the 218 families truncated
 * at that width — "Système d'Exploitat…", "Claviers Externes O…", "Accessoires
 * serveu…" — which is a directory that has stopped naming its own entries. The
 * rule is a device for carrying the eye ACROSS a gap; at one column there is no
 * gap to cross, only a name that no longer fits. `hidden sm:block` gives the
 * name the whole row back, 269 pixels, and truncation falls from 62 to 4.
 *
 * 44 PIXELS TALL ON A PHONE, 33.5 FROM `sm` UP. 218 entries at desktop density
 * is what makes the index readable under a pointer and a column of misses under
 * a thumb; the taller row costs 2 300 pixels down a page nobody reads in one
 * pass, and buys every one of the 218 an honest target.
 */
export function FamilyIndex({ departments }: { departments: readonly IndexDepartment[] }) {
  return (
    /* `band` is 96 pixels at 360 — the silence this site puts between two
       SECTIONS — and there are eleven of them between the twelve departments,
       so a phone paid 1 056 pixels of empty page to separate blocks that are
       already separated by a rule and a heading. 40 under `sm` keeps the
       separation and gives back 616 pixels of a list that was 11 743 tall. */
    <div className="flex flex-col gap-10 sm:gap-band">
      {departments.map((department) => (
        <section
          key={department.id}
          /* WHEN A RAYON IS OPEN, ITS OWN "OUVRIR" ROW IS A LIE, SO IT GOES.
             `:has` is what lets a parent answer for a child's state; where it is
             not supported the row simply stays, sitting above the list it has
             already opened, which is a redundancy and not a fault. */
          className="enter min-w-0 [&:has(ul:target)_.fold]:hidden"
          aria-labelledby={`index-${department.id}`}
        >
          {/* The count is on its own baseline at the right edge, exactly where
              the shelf at the top of this page puts it, and not at the end of
              the tagline: set there it read as the last word of the sentence,
              "interphonie. 747". */}
          <div className="mb-3 border-b border-rule pb-3 sm:mb-7 sm:pb-4">
            <div className="flex items-baseline justify-between gap-x-8">
              <h3
                id={`index-${department.id}`}
                className="min-w-0 text-sub font-bold tracking-[-0.02em]"
              >
                <Link href={`/rayon/${department.slug}`} className="draw-under hover:text-secondary">
                  {department.name}
                </Link>
              </h3>
              <span className="t-num shrink-0 text-small text-ink-3">
                {formatAmount(department.totalCount)}
              </span>
            </div>
            {/* THE TAGLINE IS A DESKTOP LINE. Two lines under each of twelve
                headings is 480 pixels of a phone page, and it repeats what the
                rayon's own page says at the top of it. Under a pointer the block
                has the room and the sentence tells the reader what the rayon
                covers before they open 27 family names. */}
            <p className="e-text mt-1.5 hidden max-w-[62ch] text-small text-ink-3 sm:block">
              {department.tagline}
            </p>
          </div>

          {department.families.length === 0 ? (
            <p className="text-small text-ink-3">
              Ce rayon n’est pas encore découpé en familles. Tout y est sur une seule page.
            </p>
          ) : (
            <>
              {/* The fold, and it is a link rather than a button because it does
                  what a link does: it moves the reader to a place in this
                  document, and it works with the JavaScript turned off. */}
              <a
                href={`#familles-${department.id}`}
                className="fold press group -mt-1 flex min-h-11 items-center justify-between gap-4 text-small font-semibold text-secondary sm:hidden"
              >
                {/* The rayon is named in the heading directly above, so the row
                    does not name it again: twelve rows saying "de ce rayon" is
                    the same three words twelve times under twelve different
                    titles. The count is the whole content. */}
                <span className="draw-under">
                  {department.families.length === 1
                    ? 'La seule famille'
                    : `Les ${department.families.length} familles`}
                </span>
                <IconChevronDown className="shrink-0 text-[1.25rem] text-ink-3" />
              </a>

              <ul
                id={`familles-${department.id}`}
                /* WHERE THE FOLD LANDS. The masthead pins at 56 on a phone and
                   the heading of the rayon being opened is 52 above this list;
                   9.5rem is 152, which puts the list under a heading that is
                   itself clear of the bar, so the reader sees WHICH rayon they
                   just opened instead of a column of names with no title. */
                className="hidden scroll-mt-[9.5rem] columns-1 gap-x-10 target:block sm:block sm:columns-2 lg:columns-3"
              >
                {department.families.map((family) => (
                  <li key={family.slug} className="break-inside-avoid">
                    <Link
                      href={`/categorie/${family.slug}`}
                      className="group flex min-h-11 items-center gap-3 py-1 text-small transition-colors duration-[var(--t-fast)] hover:text-secondary sm:min-h-0 sm:items-baseline sm:py-[0.4375rem]"
                    >
                      <span className="min-w-0 flex-1 truncate">{family.name}</span>
                      {/* The rule between the name and its count is what makes a
                          ragged list read as a table. It is the leader line of a
                          printed index, drawn with a border rather than dots, and
                          it is not drawn at all at one column: see the head of
                          this file for the 130-pixel name it was costing. */}
                      <span
                        aria-hidden
                        className="hidden h-px min-w-4 flex-1 translate-y-[-0.2em] bg-rule transition-colors duration-[var(--t-fast)] group-hover:bg-secondary sm:block"
                      />
                      <span className="t-num text-micro text-ink-3">
                        {formatAmount(family.count)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </div>
  )
}
