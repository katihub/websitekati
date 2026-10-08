/**
 * The page lock, for the surfaces that cover the page.
 *
 * WHY THIS EXISTS AT ALL, AND WHY `document.body.style.overflow` IS NOT IT.
 * Setting `overflow: hidden` on the body only stops the viewport scrolling
 * because of a propagation rule: the browser takes its scrolling behaviour from
 * the root element, and it falls back to the body ONLY when the root's own
 * overflow computes to `visible` on both axes. This site's stylesheet sets
 * `html, body { overflow-x: clip }`, which is what keeps a wide rail from
 * inventing a horizontal scrollbar. The root therefore no longer computes to
 * `visible`, the propagation never happens, and every `document.body.style
 * .overflow = 'hidden'` on this codebase is inert: measured at 390 and at 1440,
 * the page went on scrolling behind an open modal. The lock has to be written on
 * `document.documentElement`, which is what this module does.
 *
 * IT COUNTS ITS HOLDERS, WHICH IS THE OTHER HALF OF THE BUG. Two overlays can be
 * open at once here: the basket drawer, and the account dialog that is allowed
 * to cover it. If each one wrote the style directly, closing them in the wrong
 * order would leave the page either locked with nothing on screen or scrolling
 * under something that is still open. So a lock is a lease: `lockScroll()` hands
 * back the release, the first lease writes the style and remembers exactly what
 * was there before, and only the last release puts it back. Releases are
 * idempotent, so a React effect cleanup that runs twice under Strict Mode cannot
 * decrement a counter it does not own.
 *
 * THE GUTTER IS COMPENSATED BECAUSE REMOVING A SCROLLBAR MOVES THE PAGE. On a
 * desktop with classic scrollbars, hiding the root's overflow returns 15 or so
 * pixels to the layout and the whole page, sticky masthead included, jumps
 * sideways the instant the dialog arrives. The difference between `innerWidth`
 * and the root's `clientWidth` is that gutter; it is added back as padding while
 * the lock is held. On overlay scrollbars, phones included, it measures 0 and
 * nothing is written.
 */

let holders = 0
let restore: (() => void) | null = null

/**
 * Locks the page and returns the release for THIS holder. Call the release once;
 * calling it again does nothing.
 */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {}

  holders += 1

  if (holders === 1) {
    const root = document.documentElement
    const overflow = root.style.overflow
    const paddingRight = root.style.paddingRight
    const gutter = window.innerWidth - root.clientWidth

    root.style.overflow = 'hidden'
    if (gutter > 0) root.style.paddingRight = `${gutter}px`

    restore = () => {
      // Written back as the empty string when it was empty, so the stylesheet's
      // own `overflow-x: clip` takes over again rather than being shadowed by an
      // inline value this module invented.
      root.style.overflow = overflow
      root.style.paddingRight = paddingRight
    }
  }

  let released = false
  return () => {
    if (released) return
    released = true
    holders = Math.max(0, holders - 1)
    if (holders === 0) {
      restore?.()
      restore = null
    }
  }
}
