'use client'

import { useEffect, useState } from 'react'

import { useCart } from '@/lib/cart'
import type { CarteProduit } from '@/types/catalogue'

/**
 * Add to basket, from inside a product card.
 *
 * WHY IT IS A QUIET CONTROL AND NOT A BUTTON. Ten of these in a grid, each one a
 * filled accent rectangle, and the grid stops being a page of products and
 * becomes a page of buttons. It is a word with the house rule under it, it
 * appears when the card is pointed at, and on a touch screen, where there is no
 * pointer to appear for, it is simply always there.
 *
 * WHY IT CONFIRMS ON ITSELF. The drawer opens on the other side of the screen,
 * which on a wide monitor is 1 400 pixels from the reader's attention. The
 * control says "Ajouté" where the click happened, and says it politely to a
 * screen reader too, which otherwise gets nothing at all from a panel appearing
 * elsewhere in the document.
 *
 * ON A PHONE IT IS A BOX, AND THAT IS NOT A CHANGE OF MIND. The argument above
 * is about a page of ten cards on a monitor. On a 360px screen the card is 141
 * wide and this control measured 44.44 by 22.19: it cleared 44px in one
 * direction only, and it cleared it in the other by borrowing 12px on every
 * side from a pseudo-element. That expander reaches into the 24px gutter that
 * separates two cards, so the hit areas of the left card's control and the
 * right card's link meet inside it, and a thumb aimed at a photograph puts
 * something in the basket. Below `sm` the control is therefore its own box,
 * 141 by 44, ending exactly where the card ends, with a hairline rather than a
 * fill so a grid of them is still a grid of products. The expander comes back
 * at `sm`, where the cell is 260px and it has somewhere to go.
 *
 * THE OPACITY RULE IS UNTOUCHED, ON PURPOSE. `sm:opacity-0` would sort AFTER
 * `group-hover:opacity-100` in the generated sheet and would kill the hover
 * reveal on every desktop. `[@media(hover:none)]` is what already pins this
 * control visible on a touch screen, and it is measured at 1 there and 0 at
 * 1440.
 */
export function AddToCart({ product }: { product: CarteProduit }) {
  const { add } = useCart()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!confirmed) return
    const timer = window.setTimeout(() => setConfirmed(false), 2000)
    return () => window.clearTimeout(timer)
  }, [confirmed])

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // The whole card is a link; this control is not a way into it.
          event.preventDefault()
          event.stopPropagation()
          add({
            slug: product.slug,
            name: product.nom,
            price: product.prix,
            image: product.image,
          })
          setConfirmed(true)
        }}
        // The word is small on purpose, so the grid stays a grid of products
        // rather than of buttons. The hit area is not: below `sm` the box IS
        // the hit area, 141 by 44 inside the card; from `sm` the box goes away
        // and the pseudo-element takes the bare word to 68 by 46 instead.
        className="press relative z-[1] flex min-h-11 w-full items-center justify-center rounded-control border border-rule text-micro font-semibold text-secondary opacity-0 transition-opacity duration-[var(--t-fast)] group-hover:opacity-100 focus-visible:opacity-100 sm:block sm:min-h-0 sm:w-auto sm:rounded-none sm:border-0 sm:after:absolute sm:after:-inset-3 sm:after:content-[''] [@media(hover:none)]:opacity-100"
      >
        <span className="measure">{confirmed ? 'Ajouté' : 'Ajouter'}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {confirmed ? `${product.nom} ajouté au panier` : ''}
      </span>
    </>
  )
}
