import Link from 'next/link'

import { IconChevronLeft, IconChevronRight } from '@/components/brand/Icons'

/**
 * Pages, not an infinite scroll.
 *
 * The whole catalogue is 178 pages of 24. Infinite scroll on a list that long
 * destroys the one thing a buyer needs on it: the ability to leave, come back
 * and be in the same place. It also puts the footer, where this shop keeps its
 * counter addresses and its telephone numbers, permanently out of reach.
 *
 * THE WINDOW. Two neighbours either side of the current page, plus the first and
 * the last, plus a gap where the run is broken. That is seven numbers at most,
 * which fits one line on a phone at the size the rest of the page is set in.
 * The first and the last are always there because they are the two a reader
 * actually jumps to; page 89 of 178 is a number nobody wants.
 *
 * Previous and next are icons at the ends rather than words, because the numbers
 * between them already say what they do, and "Précédent"/"Suivant" set beside
 * seven digits makes the row read as a sentence.
 *
 * THAT SENTENCE ONLY HOLDS WHERE THE ROW IS ONE ROW, AND ON A PHONE IT NEVER IS.
 * Measured at 360: the shell gives the nav 306 pixels, seven 44-pixel squares
 * and six 8-pixel gaps need 356, so the row wrapped — and what wrapped was the
 * pair of arrows. On page 40 of 178 the sequence came out as
 * "‹ 1 … 38 39 40" on the first line and "41 42 … 178 ›" on the second, which
 * puts the two controls a reader actually uses, previous and next, in opposite
 * diagonal corners, drawn as two more 44-pixel squares indistinguishable from
 * the nine digits between them. Eleven identical boxes, and the two that matter
 * are the hardest to find.
 *
 * SO UNDER `sm` THE ROW IS DELIBERATELY TWO ROWS, AND THE SECOND ONE IS THE
 * ARROWS. `order` moves the numbers first and the two arrows last, `basis`
 * makes each arrow half the width minus the gap — 149 pixels at 360 — and each
 * one takes the word it was denied at the top of this file, because a 149-pixel
 * box holding a 17-pixel chevron reads as an empty button. The jump targets
 * stay above, where a thumb reaching from the bottom of the screen passes the
 * two common gestures before it reaches the nine rare ones.
 *
 * FROM `sm` UP NONE OF THAT EXISTS: `sm:order-none`, `sm:basis-auto`,
 * `sm:w-11` and `sm:hidden` on the words put the row back to the 44-pixel
 * squares it has always been, measured unchanged at 1440 — nav 356 x 44 on
 * seven items, 564 x 44 on eleven, one line in both cases.
 */
function windowed(page: number, pages: number): (number | 'gap')[] {
  const wanted = new Set<number>([1, pages, page])
  for (let step = 1; step <= 2; step += 1) {
    if (page - step >= 1) wanted.add(page - step)
    if (page + step <= pages) wanted.add(page + step)
  }
  const sorted = [...wanted].sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push('gap')
    out.push(value)
    previous = value
  }
  return out
}

export function Pager({
  basePath,
  query,
  page,
  pages,
}: {
  basePath: string
  /** Everything except `page`, so an ordering survives a page change. */
  query: Record<string, string>
  page: number
  pages: number
}) {
  if (pages <= 1) return null

  const href = (target: number) => {
    const params = new URLSearchParams(query)
    if (target > 1) params.set('page', String(target))
    const search = params.toString()
    return search ? `${basePath}?${search}` : basePath
  }

  /* Full width and worded under `sm`, a 44-pixel square from `sm` up. The type
     size lives on the word and not here: set on the box it would also restyle
     the icon's inherited em, and the arrow measured 44 x 44 at a 16-pixel
     inherited size before any of this. */
  const step =
    'press flex h-11 w-full items-center justify-center gap-2 rounded-control border border-rule text-ink-2 transition-colors duration-[var(--t-fast)] sm:grid sm:w-11 sm:place-items-center hover:border-ink hover:text-secondary'

  /* The two arrows are the last flex items on a phone and their own line, and
     nothing at all from `sm` up. */
  const stepItem = 'order-2 basis-[calc(50%-0.25rem)] sm:order-none sm:basis-auto'

  /* Drawn only under `sm`, where the arrow is 149 pixels wide and a chevron
     alone in it reads as a button that failed to load. */
  const word = 'text-small font-semibold sm:hidden'

  return (
    <nav aria-label="Pages de résultats" className="mt-band flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li className={stepItem}>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label="Page précédente" className={step}>
              <IconChevronLeft className="text-[1.0625rem]" />
              <span className={word}>Précédent</span>
            </Link>
          ) : (
            // Present but inert, so the row never changes width between the
            // first page and the second and the numbers stay where the reader
            // last clicked them.
            <span aria-hidden className={`${step} opacity-30`}>
              <IconChevronLeft className="text-[1.0625rem]" />
              <span className={word}>Précédent</span>
            </span>
          )}
        </li>

        {windowed(page, pages).map((entry, position) =>
          entry === 'gap' ? (
            <li
              key={`gap-${position}`}
              aria-hidden
              className="order-1 grid size-11 place-items-center text-ink-3 sm:order-none"
            >
              …
            </li>
          ) : (
            <li key={entry} className="order-1 sm:order-none">
              <Link
                href={href(entry)}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
                className={`press t-num grid size-11 place-items-center rounded-control text-small transition-colors duration-[var(--t-fast)] ${
                  entry === page
                    ? 'bg-secondary font-bold text-on-surface'
                    : 'border border-rule text-ink-2 hover:border-ink hover:text-secondary'
                }`}
              >
                {entry}
              </Link>
            </li>
          ),
        )}

        {/* A hard line break, and there is no other way to ask for one from
            flex-wrap. `order` alone put the arrows AFTER the numbers but not
            BELOW them: measured on page 40 at 360, "Précédent" ended up sharing
            the second line with 42, … and 178, and "Suivant" was alone on a
            third. A zero-height item at `basis-full` closes the number rows and
            sends both arrows onto one line of their own. Gone from `sm` up,
            where there is only ever one line to close. */}
        <li aria-hidden className="order-1 h-0 basis-full sm:hidden" />

        <li className={stepItem}>
          {page < pages ? (
            <Link href={href(page + 1)} rel="next" aria-label="Page suivante" className={step}>
              <span className={word}>Suivant</span>
              <IconChevronRight className="text-[1.0625rem]" />
            </Link>
          ) : (
            <span aria-hidden className={`${step} opacity-30`}>
              <span className={word}>Suivant</span>
              <IconChevronRight className="text-[1.0625rem]" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
