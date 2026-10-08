import { formatPrice } from '@/lib/format'

/**
 * Price is the only number allowed to be loud.
 *
 * Set in tabular mono so a column running from 1 000 to 11 800 000 FCFA stays
 * a column. The pre-discount price appears only when the reduction is deep
 * enough to mean something: 4,107 of 4,256 products carry an "on sale" flag, so
 * a strike-through on every card would be noise, but 513 are genuinely marked
 * down 40% or more and those are worth anchoring.
 */
const ANCHOR_THRESHOLD = 40

/**
 * Whether a product's reduction is deep enough for its old price to be printed.
 *
 * Exported because the product card now draws that line itself, below the price
 * rather than above it, and has to know whether there is one before it decides
 * what its tail contains. The threshold stays in this file: it is the same 40%
 * the stamp on the photograph is rationed by, and two copies of it would drift.
 */
export function isAnchored(listPrice?: number | null, discountPct?: number | null): boolean {
  return Boolean(listPrice && discountPct && discountPct >= ANCHOR_THRESHOLD)
}

/**
 * The struck price on its own, for a caller that places it itself.
 *
 * It is the same mark in both positions — smaller than the price, grey, struck
 * through — because what identifies the anchor is that it is crossed out, not
 * where it sits.
 */
export function PriceAnchor({ listPrice }: { listPrice: number }) {
  return (
    <span className="t-num block text-micro text-ink-3 line-through">{formatPrice(listPrice)}</span>
  )
}

export function Price({
  value,
  listPrice,
  discountPct,
  anchor = true,
}: {
  value: number
  listPrice?: number | null
  discountPct?: number | null
  /**
   * Set false by a caller that prints the old price itself, somewhere other
   * than directly above this one. The product card does; the compact row and
   * the counter tour do not.
   */
  anchor?: boolean
}) {
  const anchored = anchor && isAnchored(listPrice, discountPct)

  return (
    // Stacked, not inline. Side by side, "200 000 FCFA 105 000 FCFA" is 24
    // characters of tabular mono in a cell 200 pixels wide, and it wraps into a
    // shape where the eye cannot tell which of the two numbers is the price.
    // Above and below, the anchor is unmistakably the smaller, struck one.
    <span className="block">
      {anchored && listPrice ? <PriceAnchor listPrice={listPrice} /> : null}
      {/* THE SHOP'S SECONDARY COLOUR, AND ONLY THAT ONE. The owner asked for the
          price in the secondary orange (#EA771F) and a step larger; see the
          secondary block in globals.css for what that costs in contrast.

          AND A SECOND STEP, TO `sub`, BECAUSE THE OWNER STILL READ IT AS SMALL.
          `lead` is 17px flat and it sat one pixel above the 16px of an ordinary
          paragraph, so the one number a customer came for was the same size as
          the sentence explaining the section it sits in. `sub` is the next rung
          of the scale and the last one below a heading: 18px up to 1384 and 20
          from 1538, which on a 1440 desktop card is 18.7 against a 13px brand
          label and a 13px name. Nothing else on the card moves, so the step is
          spent entirely on making the price the first thing the eye lands on.

          IT IS THE TIGHTEST FIT ON THE SITE, AND IT IS MEASURED. Below `sm` the
          price has the card's whole column, which at a 360 screen is 150 pixels
          once the gutter came down. At 18px in tabular mono the longest price
          this catalogue actually holds sets on one line inside that column with
          room to spare; the theoretical eight-figure price would want 158 and
          would break in two, which is why the column had to grow before the
          type could. Check both together if either one is touched again. */}
      <span className="t-num block text-sub font-bold tracking-[-0.015em] text-secondary">
        {formatPrice(value)}
      </span>
    </span>
  )
}
