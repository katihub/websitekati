import type { ElementType, ReactNode } from 'react'

/**
 * Type that rises from behind its own baseline.
 *
 * Each line gets its own overflow mask, which is why this reads as a shutter
 * lifting rather than as text sliding up the page. Where a headline breaks is a
 * design decision, so lines are written out rather than left to the browser to
 * discover.
 *
 * `pb-[0.14em]` with a matching negative margin reserves room inside the mask
 * for descenders. Without it the mask edge clips the tail of every g, p and q
 * on the line, which is the single most common way this effect is shipped
 * broken.
 *
 * No client JavaScript: the motion is CSS, armed by the document-level
 * `Reveal` observer through the `.reveal` class on an ancestor.
 */
/**
 * A single masked line, for a heading whose break the content decides.
 *
 * Use when the string is dynamic, such as a department or family name: it masks
 * the block as one unit rather than per visual line, which is the honest thing
 * to do when the number of lines is not known at author time.
 */
export function MaskBlock({
  children,
  as: Wrapper = 'span',
  className = '',
}: {
  children: ReactNode
  as?: ElementType
  className?: string
}) {
  return (
    <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
      <Wrapper className={`e-line ${className}`}>{children}</Wrapper>
    </span>
  )
}
