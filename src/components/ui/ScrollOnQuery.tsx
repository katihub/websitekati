'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Carries the reader back to the results when the results change under them.
 *
 * THE CASE THIS EXISTS FOR. A filter, a sort or a page number on this site is a
 * URL, which is what makes any of them shareable and survivable by the back
 * button. The cost of that decision is that changing one is a navigation with no
 * new page: the address changes, the server renders a different set, and the
 * reader is left exactly where they were, three thousand pixels down, looking at
 * merchandise that silently became different merchandise. Nothing moved, so
 * nothing told them anything happened.
 *
 * WHY IT IS NOT `scroll-behavior: smooth` ON THE DOCUMENT. That is what E-shop
 * does and it was tried here first. It works there because that shop filters in
 * place, client side, and passes `scroll: false` on every one of its own
 * navigations; its smooth scrolling only ever answers a real page change on a
 * short page. On this catalogue it broke: measured three times out of three,
 * leaving /catalogue from 4 000 pixels down landed the reader on the product
 * page at 169 pixels rather than at the top, because the incoming render
 * interrupts an animation the browser had already started. A declaration cannot
 * know when the page it is scrolling has been replaced. This can: it runs after
 * the new content has committed, so there is nothing left to interrupt it.
 *
 * WHY IT SCROLLS TO THE RESULTS AND NOT TO THE TOP. Going to the top of the
 * document would hide what the reader just did: the filter panel, the sort row
 * and the count they were reading are above the grid, and a reader who has just
 * ticked "En stock" wants to see the count change and then the products, not the
 * masthead. The anchor is the element carrying `data-results`, and the offset is
 * the sticky masthead's own height read at the moment of the scroll rather than
 * hard-coded, because that header is 116 pixels on a phone and 157 on a desktop
 * and it will change again.
 *
 * IT NEVER FIRES ON A FIRST PAINT. A reader arriving on a shared filtered URL
 * has not changed anything; scrolling them is answering a question they did not
 * ask. The first run only records where the reader came in.
 */
export function ScrollOnQuery() {
  const pathname = usePathname()
  const params = useSearchParams()
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const key = `${pathname}?${params.toString()}`

    // First paint on this route: remember it and do nothing.
    if (previous.current === null || previous.current.split('?')[0] !== pathname) {
      previous.current = key
      return
    }
    if (previous.current === key) return
    previous.current = key

    const anchor = document.querySelector<HTMLElement>('[data-results]')
    if (!anchor) return

    // Already looking at it, or above it: the results are on screen and moving
    // the page would be the only thing that jumped.
    const header = document.querySelector('header')
    const offset = header ? header.getBoundingClientRect().height + 12 : 12
    const target = anchor.getBoundingClientRect().top + window.scrollY - offset
    if (Math.abs(window.scrollY - target) < 8) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // After the frame that painted the new results, so the browser is not asked
    // to animate towards a position the layout is still deciding.
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, target), behavior: still ? 'auto' : 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, params])

  return null
}
