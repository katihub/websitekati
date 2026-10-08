import Link from 'next/link'
import type { ReactNode } from 'react'

import { MaskBlock } from './MaskLine'

/**
 * The head of a page section: a title, an optional line of context, and an
 * optional escape to the full listing.
 *
 * The rule under it is structural, not decorative. With the merchandise below
 * carrying no borders of its own, the hairline is the only thing in the section
 * that states a column width, and every grid beneath it aligns to that
 * statement. Remove it and the section loses its left and right edges: the
 * heading floats, the grid floats, and nothing tells the eye they are the same
 * object. It is also the finest mark on the page, which is the register the
 * whole layout is set in.
 *
 * The escape link is not decoration. Baymard measured 31% of users struggling
 * to reach a product list on sites whose category pages are pure signposts, so
 * every section that shows a subset owes the customer a way past it.
 *
 * The title and the context are siblings rather than nested: a paragraph inside
 * a heading is invalid, and assistive technology reads the whole block as one
 * long heading.
 */
export function SectionHeader({
  title,
  context,
  action,
  aside,
  as: Heading = 'h2',
}: {
  title: ReactNode
  context?: ReactNode
  action?: { href: string; label: string }
  /** Controls belonging to the section, e.g. a set of filter tabs. */
  aside?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div className="enter relative mb-stack flex flex-wrap items-end justify-between gap-x-12 gap-y-5 pb-5">
      <div className="min-w-0">
        {/* The type sits on the heading, not inside the mask: MaskBlock reserves
            0.14em for descenders, and with the size declared on the inner span
            that reserve was computed against the parent's 15px rather than the
            heading's 32. */}
        <Heading className="text-title font-semibold leading-[1.1] tracking-[-0.025em] text-balance">
          <MaskBlock className="block">{title}</MaskBlock>
        </Heading>
        {context ? (
          <p className="e-text mt-3 max-w-[62ch] text-small leading-[1.6] text-pretty text-ink-2">
            {context}
          </p>
        ) : null}
      </div>

      {aside ?? null}

      {action ? (
        <Link
          href={action.href}
          className="draw-under shrink-0 pb-1 whitespace-nowrap text-small font-semibold text-secondary hover:text-secondary"
        >
          {action.label}
        </Link>
      ) : null}

      <span aria-hidden className="e-rule absolute inset-x-0 bottom-0 block h-px bg-rule" />
    </div>
  )
}
