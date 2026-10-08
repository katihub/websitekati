'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { IconArrowRight } from '@/components/brand/Icons'
import type { PromoPanel } from '@/types/catalogue'

/**
 * The banner band under the deck, two at a time.
 *
 * WHY IT TRAVELS. Two panels standing still were a pair of shortcuts to the two
 * departments a customer already knew they wanted. Six that walk are the shop
 * saying it has six counters, in the space the two took.
 *
 * WHY PAGES OF TWO AND NOT A FREE SCROLL. A strip that slides by one panel makes
 * the reader track a moving target, and it always leaves a half-panel at the
 * edge, which reads as a layout that ran out of room. Whole pages arrive
 * composed: two banners land together, sit still long enough to be read, and
 * leave together.
 *
 * WHY IT OVERSHOOTS. This is the one bounce on the site, and it is three per
 * cent. Everything else decelerates and stops exactly, which is right for a rack
 * rail and wrong for a poster: a banner that lands dead reads as a slide, one
 * that lands with a little weight reads as a thing that was thrown.
 *
 * WHY IT WALKS BACK. Three pages that loop have to rewind two widths at the end.
 * It goes 1, 2, 3, 2, 1 instead, so every move is one page in one direction and
 * no frame is spent rewinding.
 *
 * ON A PHONE THE BAND TAKES A FINGER, AND THE ARITHMETIC IS WHY. A page is two
 * panels side by side on a desktop and two panels STACKED on a phone: measured
 * at 360, 394.5 + 415.3 plus the gap makes the band 830 pixels tall. The three
 * bars are underneath all of it, so the only way to reach the last four
 * departments was to scroll 830 pixels past the thing being controlled, tap,
 * and then scroll back up to find that the panels above had changed. A control
 * that far from its subject is not a control. The panels themselves now answer
 * a swipe, exactly as the banners above them do and with the same numbers: 44
 * pixels of horizontal travel is a page, `touch-action: pan-y` leaves the page
 * scrolling underneath, and the drag suppresses the click so a swipe never
 * lands on a department. The bars stay, as the readout they always were.
 */
const ADVANCE_MS = 5600
const PER_PAGE = 2
/** A drag shorter than this is a tap, not a swipe. */
const SWIPE_MIN = 44
/** How far the strip follows a finger before it stops giving ground. */
const DRAG_MAX = 110
const REDUCED = '(prefers-reduced-motion: reduce)'
const POINTER = '(hover: hover) and (pointer: fine)'

/**
 * Whether the band is allowed to walk on its own.
 *
 * TOUCH IS EXCLUDED, AND IT IS THE SAME RULE THE DECK ALREADY FOLLOWS. The band
 * halts while a pointer rests on it, which is the reader's brake — and a
 * touchscreen has no pointer to rest. On a phone the two banners stand 830
 * pixels tall, so a reader who is halfway down the second one when the clock
 * fires at 5 600ms has the page replaced under their thumb with no way to stop
 * it and no way to get it back. Standing still, the pages below are the control.
 */
function useTourAllowed(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const queries = [window.matchMedia(REDUCED), window.matchMedia(POINTER)]
    for (const query of queries) query.addEventListener('change', onChange)
    return () => {
      for (const query of queries) query.removeEventListener('change', onChange)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches && window.matchMedia(POINTER).matches,
    () => false,
  )
}

export function PromoBand({ panels }: { panels: readonly PromoPanel[] }) {
  const pages = Math.ceil(panels.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)
  const [heading, setHeading] = useState(1)
  const travels = useTourAllowed() && pages > 1
  const layer = useRef<HTMLDivElement>(null)
  const from = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  /**
   * The finger is on its own layer, and on purpose: the paged movement is a
   * transition on the track, the drag is a plain translate written straight to
   * this node rather than through state. Twelve renders a second on a 360px
   * Android to move a banner sideways is paid for in dropped frames, and the
   * two transforms compose for free.
   */
  const settle = () => {
    const node = layer.current
    if (!node) return
    node.style.transition = ''
    node.style.transform = ''
  }

  // A mouse is left alone: the pointer already pauses the band and its click
  // must stay a click.
  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    from.current = { x: event.clientX, y: event.clientY }
    swiped.current = false
  }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = from.current
    if (!start) return
    const moved = event.clientX - start.x
    const fell = event.clientY - start.y
    // Below eight pixels the gesture has not declared itself; past that, a
    // steeper travel than it is wide belongs to the page, not to the band.
    if (!swiped.current) {
      if (Math.abs(moved) < 8) return
      if (Math.abs(fell) > Math.abs(moved)) {
        from.current = null
        settle()
        return
      }
      swiped.current = true
    }
    const node = layer.current
    if (!node) return
    node.style.transition = 'none'
    node.style.transform = `translate3d(${Math.max(-DRAG_MAX, Math.min(DRAG_MAX, moved))}px,0,0)`
  }

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = from.current
    from.current = null
    settle()
    if (!start) return
    const moved = event.clientX - start.x
    if (Math.abs(moved) < SWIPE_MIN) return
    const next = moved < 0 ? page + 1 : page - 1
    if (next < 0 || next >= pages) return
    setHeading(moved < 0 ? 1 : -1)
    setPage(next)
  }

  useEffect(() => {
    if (!travels || paused) return
    const timer = window.setTimeout(() => {
      setPage((current) => {
        const next = current + heading
        if (next >= pages || next < 0) {
          setHeading(-heading)
          return current - heading
        }
        return next
      })
    }, ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [travels, paused, page, pages, heading])

  if (panels.length === 0) return null

  return (
    <div
      // A finger cannot lift a brake it puts on: `pointerleave` never follows a
      // touch, so a thumb set down here to scroll the page used to stop the
      // band for good. The brake is a mouse's.
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setPaused(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setPaused(false)
      }}
      onFocusCapture={() => setPaused(true)}
    >
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label="Rayons en avant"
        className="w-full touch-pan-y overflow-hidden"
        onPointerDown={grab}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={() => {
          from.current = null
          settle()
        }}
        // The panels are links, so a swipe would otherwise end on a department
        // page. The capture phase is where that click is stopped.
        onClickCapture={(event) => {
          if (!swiped.current) return
          swiped.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <div ref={layer} className="transition-transform duration-[var(--t-base)] ease-brand">
          <div
            className="flex transition-transform duration-[var(--e-bounce)] ease-[var(--ease-bounce)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: pages }, (_, group) => (
              <div
                key={group}
                inert={group !== page}
                aria-hidden={group !== page}
                /* ONE COLUMN ON A PHONE, AND THE CARD LIES DOWN.
                   Two columns were tried and measured 160 by 259, which is a
                   thumbnail with a caption: too narrow for the headline to set
                   in fewer than four lines. One column stacked was worse, 332 by
                   420, so two panels cost 840 pixels of scrolling to say two
                   sentences. A card that is WIDE and SHORT is neither: the
                   photograph takes a square on the left, the type takes the rest,
                   and the whole thing is 332 by about 150. Full width to read,
                   a third of the height to scroll past. */
                className="grid w-full shrink-0 gap-3 sm:grid-cols-2 sm:gap-6"
              >
                {panels.slice(group * PER_PAGE, group * PER_PAGE + PER_PAGE).map((panel) => (
                  <Link
                    key={panel.id}
                    href={panel.href}
                    /* LE REMBOURRAGE DESCEND D'UN TIERS AVEC LE RESTE DE LA
                       PAGE : 16/24/32/40 deviennent 12/16/24/28. Ce sont les
                       plus gros blocs de l'accueil et donc la ou le grief du
                       proprietaire se voyait le plus, quarante pixels de vide
                       autour d'une phrase de six mots. Les ecarts internes
                       suivent dans la meme proportion, sinon le bloc se
                       resserre par les bords et pas par le milieu. */
                    className="group flex flex-row-reverse items-center gap-4 rounded-space bg-space p-3 transition-colors duration-[var(--t-base)] hover:bg-space-2 sm:flex-col sm:items-start sm:gap-4 sm:p-4 md:flex-row md:items-center md:gap-6 md:p-6 xl:gap-7 xl:p-7"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-small leading-[1.25] font-semibold tracking-[-0.015em] text-balance sm:text-sub sm:leading-[1.2] sm:tracking-[-0.02em]">
                        {panel.headline}
                      </p>
                      {/* THE SENTENCE IS A CASUALTY OF THE SECOND COLUMN, AND IT
                          IS THE RIGHT ONE TO LOSE. In 160 pixels it sets four
                          words a line and runs to seven lines, which is longer
                          than the headline it was explaining. The headline and
                          the count carry the panel on a phone; the sentence
                          returns the moment there is room for it. */}
                      <p className="mt-3.5 hidden text-small leading-[1.6] text-pretty text-ink-2 sm:block">
                        {panel.body}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-micro font-semibold text-secondary sm:mt-7 sm:gap-2.5 sm:text-small">
                        <span className="measure">Voir le rayon</span>
                        <IconArrowRight className="travel text-[1.0625rem]" />
                      </span>
                    </div>

                    {panel.image ? (
                      <span
                        aria-hidden
                        className="relative block aspect-square w-[7.5rem] shrink-0 overflow-hidden rounded-well bg-surface sm:aspect-[16/10] sm:w-full md:aspect-square md:w-[30%] md:max-w-[15rem] xl:w-[34%]"
                      >
                        <Image
                          src={panel.image}
                          alt=""
                          fill
                          sizes="(max-width: 639px) 120px, (max-width: 1279px) 26vw, 240px"
                          className="lift object-contain p-4"
                        />
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The pages are the control. There is no stop button beside them: the band
          halts while a pointer is on it, and a dot is a way to say which page
          rather than a way to say later.

          THEY ARE DRAWN WHENEVER THERE IS MORE THAN ONE PAGE, NOT WHENEVER THE
          BAND WALKS. Tying them to `travels` meant that the moment the band
          stopped walking on a touchscreen the last four of the six departments
          became unreachable, which is a worse band than a moving one.

          THE BAR AND THE TARGET ARE TWO ELEMENTS. A 36 by 3 bar with
          `-inset-5` reached 76 by 43: under the hand's 44 in one direction, and
          46 pixels apart, so the three hit areas overlapped one another by 30.
          Below sm the button is a 44px cell and the span inside keeps the
          3px bar; from sm the button is the bar again, at its own size. */}
      {pages > 1 ? (
        <div className="mt-7 flex items-center gap-2.5">
          {Array.from({ length: pages }, (_, group) => (
            <button
              key={group}
              type="button"
              onClick={() => {
                setHeading(group >= page ? 1 : -1)
                setPage(group)
              }}
              aria-label={`Page ${group + 1} sur ${pages}`}
              aria-current={group === page}
              className="press relative grid size-11 place-items-center after:absolute after:inset-0 after:content-[''] sm:h-[3px] sm:w-9 sm:after:-inset-5"
            >
              <span
                className="block h-[3px] w-9 rounded-pill transition-colors duration-[var(--t-base)]"
                style={{ background: group === page ? 'var(--primary)' : 'var(--rule-2)' }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
