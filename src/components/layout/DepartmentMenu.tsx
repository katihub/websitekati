'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { DEPARTMENT_ICON, IconChevronDown, IconClose, IconMenu } from '@/components/brand/Icons'
import type { DepartmentNav } from '@/types/catalogue'

/**
 * The catalog map.
 *
 * Twelve department names in a row is a list, not a map: it says nothing about
 * the families underneath them, which is the level a buyer actually shops at. One trigger replaces the row, and opening it shows the whole structure at
 * once, every department with its deepest families and a count on each.
 *
 * The trigger is the block at the head of the department bar rather than a
 * button floating in the masthead. That position is doing real work: it is the
 * first thing on the one saturated band of the page, it is the same width and
 * weight on every route, and on a phone it is the only navigation that reaches
 * the whole catalog.
 *
 * The panel is rendered inside the sticky header, so `top-full` puts it under
 * the entire masthead rather than under the trigger, which is what lets it run
 * the full width of the page.
 *
 * ON A PHONE IT IS NOT THE SAME PANEL, AND THE MEASUREMENT IS WHY. The grid is
 * three columns at `lg`, two at `md` and one below that, so at 360 the twelve
 * departments and their sixty families stacked into 2 900 pixels of content
 * inside a 474 pixel window. Twelve screens of scrolling, inside a dropdown,
 * over rows 20 pixels tall set 11 pixels apart: every target under half of the
 * 44 the finger needs, and the way out at the foot, "Voir l'index complet",
 * 2 900 pixels down where nobody was ever going to meet it.
 *
 * So below `md` the same data is drawn as an accordion: twelve rows of 56
 * pixels, one open at a time, each opening onto its own families at 44 pixels a
 * row with the whole department as the first entry. Twelve rows is 672 pixels,
 * which is a flick and a half rather than twelve screens, and the index link is
 * pinned to the foot of the panel where it is on screen at every scroll
 * position. The desktop subtree is untouched and still renders its grid; the
 * two are siblings under one `md:` switch rather than one layout bent to cover
 * both, because a grid of sixty destinations and a list of twelve are not the
 * same object.
 *
 * The panel's own height is `100dvh` minus the masthead rather than `74vh`,
 * again below `md` only: at 360 x 640 the old cap put the panel's bottom edge
 * at 642, two pixels past the screen, and `vh` is the unit that ignores the
 * address bar.
 */
export function DepartmentMenu({
  departments,
  familyCount,
}: {
  departments: readonly DepartmentNav[]
  /** `null` quand la navigation n'a pas repondu : la phrase se passe du nombre. */
  familyCount: number | null
}) {
  const [open, setOpen] = useState(false)
  /** Which department is unfolded on a phone. One at a time, and none to start:
      a list that opens with a section already down hides the eleven others. */
  const [unfolded, setUnfolded] = useState<string | null>(null)
  const panelId = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  /* Closing folds the accordion back up. A panel reopened on the department
     the reader left is a panel answering a question they already asked, and
     doing it here rather than in an effect on `open` keeps it to one render. */
  const shut = useCallback(() => {
    setOpen(false)
    setUnfolded(null)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      shut()
      // Escape used to drop the focus on <body>, which on a page with 130 tab
      // stops means the next Tab starts again from the masthead. The reader
      // gets put back where they were: on the control they just closed.
      trigger.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) shut()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, shut])

  return (
    // A CLICK OPENS IT, AND ONLY A CLICK.
    //
    // It used to open on hover, on the argument that the map costs nothing to
    // look at and that asking for a click is a toll on the one navigation a
    // stranger needs most. That argument loses to what the panel actually is:
    // 660 pixels of opaque paper across the page. Opening it by accident, while
    // travelling to "Catalogue" two centimetres to the right, covers the page
    // the reader was aiming at. The bigger the panel, the more a hover trigger
    // behaves like a trap, and this is the biggest panel on the site.
    //
    // Hover is now only a hint: the trigger answers the pointer with the same
    // colour every other link on the bar answers with, and nothing moves until
    // the reader asks for it.
    //
    // The panel is a DOM child of this container even though it is painted
    // across the page, so the pointer never leaves while it is inside it.
    //
    // Closing on focus leaving keeps a keyboard pass honest: with the panel open
    // and 660px of opaque paper over the page, 38 of the tab stops underneath
    // were still reachable and invisible. `next &&` matters, because clicking a
    // non-focusable part of the panel reports a null relatedTarget in Chrome.
    <div
      ref={container}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && !event.currentTarget.contains(next)) shut()
      }}
      className="flex shrink-0"
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? shut() : setOpen(true))}
        // IT IS THE SAME GREEN AS THE BAR IT SITS ON, AND THAT IS BOTH A
        // DESIGN FIX AND A CONTRAST FIX.
        //
        // It used to be painted --rail-hover, the mark's own #009d17, to mark it
        // as the catalogue key rather than a fifth nav link. Two things were
        // wrong with that. It read as a foreign block dropped into the bar,
        // which is what a reader noticed first about it. And white 13px
        // semibold on #009d17 measures 3.60:1, under the 4.5:1 small text owes:
        // the one control on the bar drawn to stand out was the only one nobody
        // could read. On --rail #007a12 the same white is 5.54:1.
        //
        // It still is not an ordinary link, and it still says so: it keeps its
        // icon, its weight and the paper-and-accent inversion while the panel is
        // open, which is the only state where standing apart means something.
        className={`press rail-link flex items-center gap-2.5 px-4 text-small font-semibold whitespace-nowrap transition-colors duration-[var(--t-fast)] md:px-5 ${
          open ? 'bg-paper text-secondary' : 'text-rail-ink hover:text-secondary'
        }`}
      >
        {open ? <IconClose className="text-[1.125rem]" /> : <IconMenu className="text-[1.125rem]" />}
        Tous les rayons
      </button>

      {open ? (
        <div
          id={panelId}
          // The panel paints its own ink. It is a DOM descendant of the department
          // bar, which sets white on the green, so a label that did not name a colour
          // inherited white and landed on white paper: the twelve department names
          // were rendered, sized and laid out, and invisible.
          className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-10.5rem)] flex-col overflow-hidden border-b border-rule-panel bg-paper text-ink shadow-[var(--shadow-panel)] md:block md:max-h-[min(74vh,660px)] md:overflow-y-auto"
        >
          {/* -- The phone accordion ------------------------------------- */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:hidden">
            <ul className="shell divide-y divide-rule">
              {departments.map((department) => {
                const Icon = DEPARTMENT_ICON[department.id]
                const down = unfolded === department.id

                return (
                  <li key={department.id}>
                    {/* ONE TARGET PER ROW, AND IT IS THE FOLD. A row split
                        between a link to the department and a chevron beside it
                        puts two different outcomes under one thumb; the
                        department itself is the first entry of what opens
                        instead, named in full, so nothing is lost and nothing
                        is ambiguous. */}
                    <button
                      type="button"
                      aria-expanded={down}
                      onClick={() => setUnfolded(down ? null : department.id)}
                      className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                    >
                      <Icon className="shrink-0 text-[1.125rem] text-secondary" />
                      <span className="min-w-0 flex-1 text-small font-semibold tracking-[-0.015em]">
                        {department.name}
                      </span>
                      <span className="t-num shrink-0 text-micro text-ink-3">
                        {department.totalCount}
                      </span>
                      <IconChevronDown
                        className={`shrink-0 text-[1rem] text-ink-3 transition-transform duration-[var(--t-base)] ease-brand ${
                          down ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {down ? (
                      <ul className="pb-2">
                        <li>
                          <Link
                            href={`/rayon/${department.slug}`}
                            onClick={shut}
                            className="flex min-h-11 items-center justify-between gap-4 border-t border-rule pl-7 text-small font-semibold text-secondary"
                          >
                            Tout le rayon
                            <span className="t-num shrink-0 text-micro text-ink-3">
                              {department.totalCount}
                            </span>
                          </Link>
                        </li>
                        {department.families.map((family) => (
                          <li key={family.slug}>
                            <Link
                              href={`/categorie/${family.slug}`}
                              onClick={shut}
                              className="flex min-h-11 items-center justify-between gap-4 border-t border-rule pl-7 text-small text-ink-2"
                            >
                              <span className="min-w-0">{family.name}</span>
                              <span className="t-num shrink-0 text-micro text-ink-3">
                                {family.count}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* The way out of the whole map, pinned rather than trailing 2 900
              pixels of list. Phone only: on a pointer the foot is the last
              child of a panel the reader can see the end of. */}
          <div className="shell shrink-0 border-t border-rule py-2 md:hidden">
            <Link
              href="/catalogue"
              onClick={shut}
              className="flex min-h-11 items-center text-small font-semibold text-secondary"
            >
              {familyCount === null ? 'Voir l’index complet des familles' : `Voir l’index complet des ${familyCount} familles`}
            </Link>
          </div>

          <div className="shell hidden gap-x-10 gap-y-9 py-10 md:grid md:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => {
              const Icon = DEPARTMENT_ICON[department.id]
              return (
                <div key={department.id}>
                  <Link
                    href={`/rayon/${department.slug}`}
                    onClick={shut}
                    className="group flex items-baseline gap-3 border-b border-rule pb-3.5"
                  >
                    <Icon className="translate-y-0.5 text-[1.125rem] text-secondary" />
                    <span className="flex-1 text-body font-semibold tracking-[-0.015em] group-hover:text-secondary">
                      {department.name}
                    </span>
                    <span className="t-num shrink-0 text-micro text-ink-3">
                      {department.totalCount}
                    </span>
                  </Link>
                  <ul className="mt-5 space-y-3">
                    {department.families.map((family) => (
                      <li key={family.slug}>
                        <Link
                          href={`/categorie/${family.slug}`}
                          onClick={shut}
                          className="flex items-baseline justify-between gap-4 text-small text-ink-2 hover:text-secondary"
                        >
                          <span>{family.name}</span>
                          <span className="t-num shrink-0 text-micro text-ink-3">
                            {family.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="shell hidden border-t border-rule py-6 md:block">
            <Link
              href="/catalogue"
              onClick={shut}
              className="draw-under text-small font-semibold text-secondary hover:text-secondary"
            >
              {familyCount === null ? 'Voir l’index complet des familles' : `Voir l’index complet des ${familyCount} familles`}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
