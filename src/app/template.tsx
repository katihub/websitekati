'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * What the reader sees while a page is being fetched.
 *
 * WHY A TEMPLATE AND NOT A PROGRESS BAR. Next re-mounts a `template.tsx` on
 * every navigation, which is the one hook that fires for every route change
 * without a router listener, a spinner library or a piece of global state. The
 * page arrives rather than appearing, and that arrival IS the feedback: a bar
 * crawling across the top of the screen is a second thing to watch, and it
 * describes a duration nobody measured.
 *
 * THIS IS NVC'S GESTURE, ADAPTED. That site uses the same file with a spring at
 * stiffness 260 and damping 20, and a 20px rise. Two things are changed here.
 * The rise is 12px, because this masthead is 204 pixels tall on a phone and a
 * 20px jump under a fixed header reads as the header moving. And it is an eased
 * curve rather than a spring: everything on this site decelerates into place and
 * nothing overshoots, which is written into the token file as `--ease-draw`, and
 * a page that bounces would be the only thing here that does.
 *
 * 260ms, which is the one number that mattered. Long enough to be seen on a slow
 * connection, short enough that a reader who knows where they are going does not
 * wait for it. Below that the movement is a flicker; above 320 it starts to feel
 * like the site is thinking.
 *
 * IT DOES NOT REPLACE THE SCROLL-REVEAL. `.enter` still stages the bands inside
 * a page as they are scrolled to. This is the page as a whole answering the
 * click; that is its contents answering the scroll. The two run at different
 * moments and neither waits for the other.
 *
 * `useReducedMotion` removes the transform entirely rather than shortening it.
 * A reader who asked for no motion is not asking for less of it.
 */
const EASE_DRAW = [0.22, 1, 0.28, 1] as const

export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  return (
    <>
      {/* THE BAR IS NOT HERE ANY MORE. A template only exists once the new page
          has ARRIVED, so a bar drawn from it ran after the wait it was meant to
          describe: a confirmation, not a progress indicator. It lives in
          NavigationProgress now, which starts on the click and ends when the
          route commits. This file keeps the one thing a template is right for,
          which is the arrival itself. */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.16 } : { duration: 0.26, ease: EASE_DRAW }}
      >
        {children}
      </motion.div>
    </>
  )
}
