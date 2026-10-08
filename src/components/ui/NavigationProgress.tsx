'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * The bar that runs while the next page is actually being fetched.
 *
 * THREE ATTEMPTS, AND WHY THE FIRST TWO WERE WRONG.
 *
 * A `loading.tsx` was first, because it is the framework's own hook for exactly
 * this. It wraps its segment in a Suspense boundary, and that cost two measured
 * faults: the fallback is streamed the moment the request arrives, which commits
 * the HTTP status, so every wrong address on the site answered 200 instead of
 * 404; and the three pages carrying it were the only three reporting a hydration
 * mismatch, which survived removing the live region and reducing the fallback to
 * one decorative span.
 *
 * The bar then moved into `template.tsx`, which re-mounts on every navigation
 * and creates no boundary. It is honest about the page having changed and
 * useless as a progress indicator, because a template only exists once the new
 * page has ARRIVED: the bar ran after the wait it was supposed to describe. The
 * client said so in one sentence and was right.
 *
 * SO THE START IS THE CLICK, AND THE END IS THE ROUTE. A navigation begins when
 * a reader presses a link, which is an event this can hear, and it ends when the
 * pathname or the query changes, which is a value this can read. Between those
 * two the reader is waiting, and that is precisely the interval nothing was
 * covering. Next 16 exposes `useLinkStatus`, which is the same fact per link,
 * but it only answers inside a `Link` and there are several hundred of them
 * here; one listener on the document is the same information for one component.
 *
 * NO STATE IS SET FROM AN EFFECT. `pending` is derived: the click records the
 * route it was fired from, and the bar shows while that recorded route is still
 * the current one. When the new route commits the two stop matching and the bar
 * is gone, with no effect to write it and no render with the wrong value first.
 *
 * IT COULD NOT BE SEEN AT ALL, TWICE, FOR TWO DIFFERENT REASONS. The first was
 * that it was not where it said it was: `.route-bar` declared `position:
 * relative` in the stylesheet, plain CSS beat the `fixed` utility below, and the
 * bar drew itself as an ordinary strip at the FOOT of the document, measured at
 * top 1700px in a 900px window. The second was duration. Frame by frame on a
 * real click it lasted THREE FRAMES, seven milliseconds, because every `Link`
 * here is prefetched on hover, so by the time the button goes down the next page
 * is already in the client and seven milliseconds is the honest length of that
 * navigation.
 *
 * AND THEN IT ENDED WITHOUT ARRIVING, WHICH READ AS FAILING. A first attempt
 * simply held the bar up for half a second whatever happened. The shop saw
 * through it immediately: the bar appeared and vanished mid-stride, "alors que
 * la navigation n'est pas finie". They were right, and the fault was in the
 * shape rather than the timing. A segment sliding back and forth on a loop never
 * gets anywhere, so removing it looks like abandonment however long it ran.
 *
 * SO IT IS NPROGRESS'S SHAPE, WHICH IS THE REFERENCE'S TOO. NVC reaches this
 * with `nextjs-toploader`, configured at three pixels with `crawl: true` and a
 * glow; that package is NProgress. The behaviour, not the package, is what
 * matters and it is thirty lines: open at 8 per cent so a press is answered
 * before anything is known, creep with a shrinking step while the wait lasts,
 * never past `CEILING` on its own, and when the route really commits take the
 * whole remaining track in one move and fade. A bar that reaches the end says
 * the page got here. A bar that disappears says something went wrong. Only one
 * of those is true, and it is now the only one the reader is shown.
 *
 * IT STILL CLAIMS NO PERCENTAGE. Nobody measured one, and `creep` is not a
 * measurement: it is a curve chosen so that a short wait moves the bar a long
 * way and a long wait leaves it inching. The only honest instant in the whole
 * animation is the last one, and that one is real.
 */
/** Where the bar starts, so a press is answered before anything is known. */
const START = 0.08
/** The creep never reaches the end on its own; only arriving does that. */
const CEILING = 0.94
const CRAWL_MS = 180
/** The close: fill to the end, hold it a moment, then go. */
const CLOSE_MS = 320

/**
 * NProgress's curve, which is the whole reason this reads as progress.
 *
 * The step shrinks as the bar advances, so it covers ground quickly at first and
 * then slows to a crawl near the end. That shape is what lets an indicator that
 * measures NOTHING still feel like it is describing something: a wait that ends
 * quickly gets a bar that moved a lot, and a wait that drags gets one that is
 * still inching forward rather than one that has stopped.
 */
function creep(at: number): number {
  const step = at < 0.3 ? 0.09 : at < 0.6 ? 0.045 : at < 0.85 ? 0.018 : 0.005
  return Math.min(CEILING, at + step)
}

export function NavigationProgress() {
  const pathname = usePathname()
  const params = useSearchParams()
  const here = `${pathname}?${params.toString()}`
  const [startedAt, setStartedAt] = useState<string | null>(null)
  // Raised by the click and lowered by the closing timer, so the bar's last
  // moments belong to the animation rather than to the router.
  const [running, setRunning] = useState(false)
  const fill = useRef<HTMLSpanElement>(null)
  const at = useRef(0)

  const waiting = startedAt !== null && startedAt === here
  const paint = (value: number) => {
    at.current = value
    if (fill.current) fill.current.style.transform = `scaleX(${value})`
  }

  // WHILE THE PAGE IS COMING. The bar is written straight to the node, not
  // through state: this ticks five times a second and a re-render of the whole
  // tree to move three pixels of green is a cost the reader pays for in the
  // page they are actually waiting for.
  useEffect(() => {
    if (!running || !waiting) return
    paint(START)
    const timer = window.setInterval(() => paint(creep(at.current)), CRAWL_MS)
    return () => window.clearInterval(timer)
  }, [running, waiting])

  // AND WHEN IT HAS. The route has changed under us, so the wait is genuinely
  // over: take the rest of the track in one move and leave. `setRunning` runs
  // from the timer rather than from the effect body, so no state is written
  // during an effect.
  useEffect(() => {
    if (!running || waiting) return
    paint(1)
    const timer = window.setTimeout(() => setRunning(false), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [running, waiting])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Anything the browser handles itself: a new tab, a download, a modified
      // click. None of them replace this page, so none of them are a wait.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const link = (event.target as HTMLElement | null)?.closest('a')
      if (!link) return
      if (link.target && link.target !== '_self') return
      if (link.hasAttribute('download')) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('#')) return

      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // The same address is not a navigation, and an in-page anchor is the
      // browser scrolling, not the server answering.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return

      setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)
      setRunning(true)
    }

    // Back and forward are navigations the reader also waits through.
    const onPop = () => {
      setStartedAt(`${window.location.pathname}?${window.location.search.replace(/^\?/, '')}`)
      setRunning(true)
    }

    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  if (!running) return null

  return (
    <span
      aria-hidden
      // `z-50` clears the masthead's 40 and stays under the basket drawer's 70,
      // so it draws over the green band and never over a panel the reader opened
      // on purpose. `route-bar` is in globals.css: a travelling segment, not a
      // filling one, and it holds still under prefers-reduced-motion.
      className="route-bar fixed inset-x-0 top-0 z-50 block h-[3px]"
    >
      <span ref={fill} />
    </span>
  )
}
