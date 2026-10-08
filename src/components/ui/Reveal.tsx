'use client'

import { useEffect } from 'react'

/**
 * Arms the entrance transition, then reveals elements as they arrive.
 *
 * Three failure modes decided the shape of this:
 *
 * 1. Content must never be gated behind JavaScript. The hidden state lives
 *    behind a `@media (scripting: enabled)` query in the stylesheet, so with
 *    scripting off nothing is ever hidden and every element simply renders.
 *    Next 16 does not execute a <script> rendered inside a React component, so
 *    the head script this used to arm with is gone and the media query replaces
 *    it exactly.
 * 2. An IntersectionObserver only fires when intersection *changes*. A reader
 *    who jumps down the page with a scrollbar drag, an anchor, or a find-in-page
 *    skips whole bands, which then stay invisible forever. The scroll-end sweep
 *    below reconciles anything the observer missed.
 * 3. One observer for the document, not one per card. A category page holds 300
 *    cards, and a motion runtime per card would spend the customer's data and
 *    their phone's main thread on decoration.
 *
 * Elements already on screen at load are marked shown without animating:
 * animating the first viewport delays perceived load and makes the new
 * storefront feel slower than the one it replaces.
 */
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const show = (element: Element) => element.setAttribute('data-enter', 'in')
    const pending = new Set<HTMLElement>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          show(entry.target)
          pending.delete(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )

    const arm = () => {
      for (const node of document.querySelectorAll<HTMLElement>('.enter:not([data-enter])')) {
        if (pending.has(node)) continue
        if (node.getBoundingClientRect().top < window.innerHeight) show(node)
        else {
          pending.add(node)
          observer.observe(node)
        }
      }
    }

    arm()

    // Reconciles bands the observer never saw a change for. `scrollend` fires
    // once per gesture rather than per frame, so this costs nothing while the
    // reader is actually scrolling.
    const sweep = () => {
      const fold = window.innerHeight
      for (const node of pending) {
        if (node.getBoundingClientRect().top < fold) {
          show(node)
          pending.delete(node)
          observer.unobserve(node)
        }
      }
    }

    const supportsScrollEnd = 'onscrollend' in window
    if (supportsScrollEnd) window.addEventListener('scrollend', sweep, { passive: true })

    // Safari has no scrollend. A slow interval is a cheaper fallback than a
    // scroll listener, and it only runs while something is still waiting.
    const timer = supportsScrollEnd ? null : window.setInterval(sweep, 400)

    // New cards arriving from a filter change or a "load more" need arming too.
    const mutations = new MutationObserver(arm)
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutations.disconnect()
      if (supportsScrollEnd) window.removeEventListener('scrollend', sweep)
      if (timer) window.clearInterval(timer)
    }
  }, [])

  return null
}
