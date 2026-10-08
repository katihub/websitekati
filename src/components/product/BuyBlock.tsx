'use client'

import { useEffect, useState } from 'react'

import { IconArrowRight, IconBasket } from '@/components/brand/Icons'
import { useCart } from '@/lib/cart'
import { useCheckoutGate } from '@/lib/checkout-gate'

/**
 * The one place on the site where the basket is a real button.
 *
 * IN THE GRID IT IS A WORD. Ten filled accent rectangles in a grid turn a page of
 * products into a page of buttons, so `AddToCart` there is a quiet control that
 * appears on hover. Here there is exactly one product and exactly one decision,
 * and the control that carries it should look like the most important thing on
 * the column. Same store, same action, different weight, because the context is
 * different: that is the rule, not an inconsistency.
 *
 * THE QUANTITY IS PART OF THE DECISION, NOT AN AFTERTHOUGHT IN THE DRAWER. This
 * shop sells switches, cables, cartridges and mounts: quantities above one are
 * the normal case, not the exception, and asking for eight of something in the
 * drawer means adding one, opening a panel, then correcting a number.
 *
 * OUT OF STOCK IS NOT A DISABLED BUTTON. 338 of 4 254 references are on order,
 * and a greyed-out control tells a customer the shop cannot help them, which is
 * false: the counter genuinely sources these. So the same corner becomes a
 * WhatsApp line, which is how a Cameroonian buyer actually asks whether a
 * reference is really available and receives the proforma.
 *
 * THE CONTROL COMES FIRST AND THE EXPLANATION AFTER IT, WHICH IS E-SHOP'S ORDER
 * AND WAS NOT OURS. The three-line paragraph about ordering the reference used
 * to sit above the WhatsApp button and pushed it 72 pixels down the column; at
 * 390 that put the only action on the page at y 982 on an 844-pixel screen.
 * E-shop prints its waitlist control first and its "this piece is between
 * production runs" underneath, and it is right: the reader has already been told
 * "Sur commande" on the price line four rules above, so the paragraph is not
 * introducing the situation, it is answering the question the button raises.
 * Below the button it answers it in the same place and costs the button nothing.
 *
 * WHAT WAS NOT TAKEN FROM E-SHOP: ITS CONFIRMATION ON THE CONTROL ITSELF. There
 * the label cross-fades to "In your bag" behind a check for 2.2 seconds, with
 * both states stacked in one box so nothing resizes — which is the clean answer
 * to the objection recorded below, and it was measured before being refused.
 * `add()` on both sites opens the basket drawer, and this drawer is 416 pixels
 * of opaque panel pinned right with a full-screen scrim and a 2px blur behind
 * it. At 1440 this button draws x 1058 to 1332, so every pixel of it is under
 * the panel or under the scrim the instant the state it would announce becomes
 * true. E-shop has the same drawer and the same overlap, so what is being copied
 * there is an animation nobody can see. The live region below is the real
 * confirmation for a reader who cannot see the drawer arrive, and the drawer is
 * the confirmation for everyone else.
 *
 * The confirmation is spoken where the click happened. The drawer opens on the
 * other side of a wide monitor, and a panel appearing 1 400 pixels away is not
 * feedback for the hand that just moved.
 *
 * BELOW `sm` THE TWO CONTROLS ARE TWO ROWS, BECAUSE ONE ROW DOES NOT FIT. The
 * buy column is 306px wide at 360. The stepper is 130 and the gap is 12, which
 * leaves 164 for the button, of which 56 is its own padding and 29 is the
 * basket: `Ajouter au panier` had 79px of line to sit on and broke in two, so
 * the button measured 66 tall against 50 at 1440 and the sentence that carries
 * the whole decision was set in two ragged lines. Given its own line it is 306
 * wide, the label sits on one line, and it lands 48px tall at the bottom of the
 * block, which is where a thumb holding the phone one-handed actually reaches.
 *
 * The stepper takes the full width on the same principle, and it is a real
 * improvement rather than a consequence: minus at the far left, plus at the far
 * right, 176px apart instead of 50, on the control most likely to be pressed
 * repeatedly and least likely to be looked at while it is.
 *
 * At 1440 both come back to exactly what they were: stepper 130 by 50 with the
 * count 32 wide, button 274 by 50.
 *
 * THE BASKET IS A HAND-ROLLED `button`. `Action` is the one button in the
 * system and it renders a `Link`, because every other button on this site
 * navigates. This one does not: it calls `add` and opens the drawer, and an
 * anchor that acts is a lie told to a keyboard.
 *
 * THERE IS NO "SUR COMMANDE" STATE ANY MORE. The backend hides every reference
 * that is out of stock, and its page answers 404, so the WhatsApp request that
 * stood in for the basket had no product left to be shown on.
 */
export function BuyBlock({
  product,
}: {
  product: {
    readonly slug: string
    readonly name: string
    readonly price: number
    readonly image: string | null
  }
}) {
  const { add, open } = useCart()
  const { go, ready } = useCheckoutGate()
  const [qty, setQty] = useState(1)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!confirmed) return
    const timer = window.setTimeout(() => setConfirmed(false), 2400)
    return () => window.clearTimeout(timer)
  }, [confirmed])

  return (
    <div>
      <div className="flex flex-wrap items-stretch gap-3">
        {/* A stepper, not a number input. On a phone a numeric field opens a
            keyboard over the price the customer is looking at, and the answer
            is almost always one, two or three. */}
        <div
          className="flex w-full items-center rounded-control border border-rule sm:w-auto"
          role="group"
          aria-label="Quantité"
        >
          <button
            type="button"
            onClick={() => setQty((current) => Math.max(1, current - 1))}
            disabled={qty === 1}
            aria-label="Retirer un article"
            className="press grid size-12 place-items-center rounded-l-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary disabled:pointer-events-none disabled:opacity-30"
          >
            <span aria-hidden className="text-body">
              −
            </span>
          </button>
          {/* `flex-1` below `sm` is what pushes minus and plus to the two ends
              of a full-width stepper; `sm:flex-none` hands the width back to
              `w-8` and the group back to its 130px. */}
          <span aria-live="polite" className="t-num w-8 flex-1 text-center text-body font-bold sm:flex-none">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((current) => Math.min(99, current + 1))}
            aria-label="Ajouter un article"
            className="press grid size-12 place-items-center rounded-r-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
          >
            <span aria-hidden className="text-body">
              +
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            add(
              {
                slug: product.slug,
                name: product.name,
                price: product.price,
                image: product.image,
              },
              qty,
            )
            setConfirmed(true)
            open()
          }}
          // `basis-full` inside the wrapping row is what sends the button to
          // its own line below `sm`. `sm:basis-0` with `grow` restores the
          // `flex: 1 1 0%` this button has always had on a wide column.
          className="press fill inline-flex min-h-12 grow basis-full items-center justify-center gap-2.5 rounded-control bg-secondary px-7 py-3 text-[0.875rem] font-bold text-on-surface transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--secondary)] sm:basis-0"
        >
          <IconBasket className="text-[1.1875rem]" />
          {/* The label does not change to "Ajouté". The drawer opening IS the
              confirmation here, and swapping the word would resize the button
              under the pointer that just pressed it. The live region below says
              it for a reader who cannot see the drawer arrive. */}
          Ajouter au panier
        </button>
      </div>

      {/* ORDER NOW, AND WHY IT IS THE SECOND BUTTON RATHER THAN THE FIRST.
          Both controls put the same line in the same basket; they differ only in
          where they leave the customer. "Ajouter au panier" keeps them on the
          product page with the drawer open, which is what someone assembling a
          list of eleven references wants. This one takes them straight to the
          quote, which is what someone who came for one thing wants.

          It is drawn as a bordered button and not a second filled one. Two
          saturated grounds side by side make the reader choose between two
          equally loud claims, and the one that has to win by default is the
          basket: this shop's average list is material for a job, not a single
          item. So the hierarchy is fill, then border, and the order button is
          full width because it is the wider promise of the two.

          It carries no basket icon. An arrow would say "onwards", which is
          exactly what it does, and the icon family already owns that mark. */}
      <button
        type="button"
        onClick={() => {
          add(
            { slug: product.slug, name: product.name, price: product.price, image: product.image },
            qty,
          )
          setConfirmed(true)
          // Deliberately NOT `open()`. The drawer would slide over the page for
          // the half second before the quote replaces it, which reads as two
          // things happening for one press.
          go()
        }}
        className="press mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control border border-ink px-7 py-3 text-[0.875rem] font-bold text-ink transition-colors duration-[var(--t-fast)] ease-brand hover:border-secondary hover:text-secondary"
      >
        Commander maintenant
        <IconArrowRight className="text-[1.0625rem]" />
      </button>

      {/* Said once, under the control it applies to, rather than in a dialog the
          customer meets after pressing. The quote needs a name, a number and a
          counter, so the card is a condition rather than a courtesy, and a
          condition announced late is a condition that feels like an obstacle. */}
      {ready ? null : (
        <p className="mt-3 text-micro leading-[1.6] text-ink-3">
          Une fiche client vous sera demandée : trois champs, gardés sur cet appareil, qui servent à
          adresser la proforma.
        </p>
      )}

      <span aria-live="polite" className="sr-only">
        {confirmed ? `${qty} × ${product.name} ajouté au panier` : ''}
      </span>
    </div>
  )
}
