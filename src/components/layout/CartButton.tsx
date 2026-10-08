'use client'

import { IconBasket } from '@/components/brand/Icons'
import { useCart } from '@/lib/cart'

/**
 * The basket counter in the masthead.
 *
 * A button and not a link, because the basket is a drawer: sending a reader to
 * a page to check what they just added, on a catalogue this long, is how they
 * lose their place. The count comes from the store on the first client render,
 * so it never flashes from zero to full.
 *
 * The zero is drawn like every other state rather than hidden. A basket that
 * shows nothing until it has something gives the reader no way to learn that
 * the number is where the count will appear.
 */
export function CartButton() {
  const { count, open } = useCart()

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        count === 0
          ? 'Ouvrir le panier, vide'
          : `Ouvrir le panier, ${count} article${count > 1 ? 's' : ''}`
      }
      className="press flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2 text-small font-semibold transition-colors duration-[var(--t-fast)] hover:text-secondary md:min-h-0"
    >
      <span className="relative">
        <IconBasket className="text-[1.3125rem]" />
        <span
          aria-hidden
          className="t-num absolute -top-1.5 -right-2 min-w-[1.25rem] rounded-pill bg-secondary px-1 text-center text-micro leading-[1.25rem] text-on-surface transition-transform duration-[var(--t-base)] ease-brand"
          style={{ transform: count > 0 ? 'scale(1)' : 'scale(0.92)' }}
        >
          {count}
        </span>
      </span>
      <span className="hidden sm:inline">Panier</span>
    </button>
  )
}
