'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'

import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { Selection } from '@/types/catalogue'

/**
 * Four lists behind four tabs.
 *
 * The tabs are filters a buyer would actually apply, and each one names the rule
 * it follows in a line under the grid. That line is the whole point of the
 * component: a storefront that labels a shelf "populaire" or "tendance" is
 * asking to be believed, and this catalog carries no order history to be
 * believed with. Naming the rule turns a merchandising claim into a statement a
 * customer can check against the prices in front of them.
 *
 * All four lists are rendered on the server and shipped together, so switching
 * tabs is instant and works the same on a stalled connection as on a fast one.
 * Only the active one is in the DOM: forty cards mounted at once would cost more
 * than the switch saves.
 *
 * KEYBOARD. A `tablist` promises arrow-key navigation, and a tablist that does
 * not deliver it is worse than four ordinary buttons: it tells a screen-reader
 * user to press a key that does nothing. So the roving tabindex below is not a
 * refinement, it is the price of using the role at all. One stop enters the set,
 * arrows move within it, Home and End jump to the ends.
 */
export function Selections({ selections }: { selections: readonly Selection[] }) {
  const [activeId, setActiveId] = useState(selections[0]?.id)
  const active = selections.find((selection) => selection.id === activeId) ?? selections[0]
  const panelId = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  if (!active) return null

  const activeIndex = selections.indexOf(active)

  const move = (to: number) => {
    const next = (to + selections.length) % selections.length
    setActiveId(selections[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div>
      {/* The head is the shared one. This component used to carry its own copy
          of SectionHeader's container, rule and mask, which is how two headings
          that must line up start drifting a pixel at a time. `aside` is the slot
          it was given for exactly this. */}
      <SectionHeader
        title="Ce qui vaut le détour"
        aside={
          <div
            role="tablist"
            aria-label="Sélections"
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') move(activeIndex + 1)
              else if (event.key === 'ArrowLeft') move(activeIndex - 1)
              else if (event.key === 'Home') move(0)
              else if (event.key === 'End') move(selections.length - 1)
              else return
              event.preventDefault()
            }}
            /* ONE ROW THAT ROLLS, NOT FOUR PILLS THAT WRAP. At 390 the four
                labels need 452 pixels and the shell gives 332, so they broke on
                to a second line and the set stopped reading as a set of
                alternatives: two above, two below, and the eye has to be told
                they are the same control. Rolled sideways they are one row, the
                fourth is cut at the edge to say there is more, and the tab that
                is on stays where it was. From sm they fit and nothing rolls. */
            className="no-scrollbar e-item mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-1 sm:mx-0 sm:flex-wrap sm:snap-none sm:overflow-visible sm:px-0 sm:pb-0"
          >
            {selections.map((selection, position) => {
              const isActive = selection.id === active.id
              return (
                <button
                  key={selection.id}
                  ref={(node) => {
                    tabs.current[position] = node
                  }}
                  type="button"
                  role="tab"
                  id={`${panelId}-${selection.id}`}
                  aria-selected={isActive}
                  aria-controls={panelId}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveId(selection.id)}
                  // 44px on a phone, where a thumb is aiming; the desktop pill
                // keeps its own proportions.
                //
                // THE HORIZONTAL PADDING DROPS BY FOUR PIXELS BELOW sm, AND
                // FOUR PIXELS IS THE WHOLE STORY. On a 360 screen the measure
                // is 306 and the last two pills came to 156.2 + 8 + 145.8 =
                // 310: over by four, so they broke onto a third line and the
                // set stood 148px tall above the grid. At px-4 the same two
                // come to 294 and the four tabs sit on two rows, 96px. The
                // desktop pill is untouched from sm up.
                /* `shrink-0` AND `whitespace-nowrap` ARE LOAD-BEARING IN A
                     SCROLLER, AND THEY WERE LOST IN A MERGE. The row rolls
                     sideways now, so a flex child that is allowed to shrink is
                     squeezed to the width of the rail instead of taking the
                     width of its own label: "Sous 50 000 FCFA" came out as four
                     stacked words inside a pill, and a pill whose content is
                     taller than it is wide is drawn by `rounded-pill` as an
                     ellipse. Nothing shrinks, nothing wraps, and the row scrolls
                     instead. Both are released at sm, where the four fit. */
                  className={`press min-h-11 shrink-0 snap-start whitespace-nowrap rounded-pill px-4 py-2 text-small transition-colors duration-[var(--t-fast)] sm:shrink sm:snap-align-none sm:whitespace-normal sm:px-5 md:min-h-0 ${
                    isActive
                      ? 'bg-secondary font-semibold text-on-surface'
                      : 'border border-rule text-ink-2 hover:border-ink hover:text-secondary'
                  }`}
                >
                  {selection.label}
                </button>
              )
            })}
          </div>
        }
      />

      <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${active.id}`}>
        {/* CINQ COLONNES, DEMANDE DU PROPRIETAIRE. Douze produits par selection
            se rangeaient par quatre : trois rangees pleines. A cinq, la
            selection tient sur deux rangees et une entamee, et la rangee montre
            un cinquieme choix sans que le lecteur ait a descendre. Les paliers
            de la grille (deux, puis trois, puis cinq) restent ceux du
            catalogue, et la carte recoit les memes largeurs a annoncer. */}
        <ProductGrid products={active.products} columns={5} rangeesCompletes />
      </div>

      <div className="mt-stack flex flex-wrap items-baseline justify-between gap-x-12 gap-y-1 border-t border-rule pt-6 sm:gap-y-3">
        <p className="text-small text-ink-3">{active.rule}</p>
        {/* Standing on its own under the rule, this is a control and not a word
            inside a sentence: 185 by 20 pixels is not a thumb's target. The
            phone gives it a 44px line box; the desktop link is unchanged. */}
        <Link
          href="/catalogue"
          className="draw-under inline-flex min-h-11 items-center text-small font-semibold text-secondary hover:text-secondary sm:min-h-0"
        >
          Ouvrir le catalogue complet
        </Link>
      </div>
    </div>
  )
}
