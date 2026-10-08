import Link from 'next/link'

import { AddToCart } from './AddToCart'
import { isAnchored, Price, PriceAnchor } from './Price'
import { ProductMedia } from './ProductMedia'
import type { CarteProduit } from '@/types/catalogue'

/**
 * The product card.
 *
 * THE PICTURE IS BORDERED, THE CARD IS NOT. Merchandise is the one thing on this
 * page a reader compares item against item, and comparison needs edges, but the
 * edge belongs to the photograph rather than to the cell: every packshot in this
 * library was shot on white and sits on a white page, so without a hairline the
 * product has no boundary at all. The name, the specs and the price beneath it
 * are type, and type is separated by space here as it is everywhere else.
 *
 * THE PLATE. Behind the photograph is a pale board that turns two degrees when
 * the card is pointed at, so the packshot reads as a print resting on it. It is
 * the whole hover of the card: no lift, no shadow, no colour change. See
 * `.plate` in globals.css for why two degrees and why it is a keyframe.
 *
 * The spec atoms under the name are the reason this catalog is shoppable at all.
 * Fifty black rack-mount boxes are indistinguishable as photographs, and
 * `24 ports`, `4 MP` or `850 VA` is what turns the grid back into a comparison.
 * They are parsed from the product name at ingest, so they cost nothing per card
 * and exist for 1 498 products.
 *
 * THE STAMP. It is rationed and it is a stamp, not a badge. 4 107 of 4 254
 * products carry an "on sale" flag, so a discount chip would appear on 96% of
 * every grid and mean nothing on any of it; 513 are marked down 40% or more, and
 * those are the only ones that get it.
 *
 * Being that rare is what earns it a form. A rectangle with a percentage in it
 * is the shape every marketplace uses because it is the shape a database field
 * suggests; this is a round sticker, pressed on slightly crooked, the way a
 * price is actually marked on a box at a counter. It straightens as the plate
 * behind the photograph turns, so the two movements read as one gesture rather
 * than as two effects on the same card.
 *
 * It is the brand's orange and it is the only orange on the site. Green is the
 * shop: links, labels, controls, and the plate behind every one of these
 * photographs. A green stamp on a green plate is furniture. The orange is the
 * one warm thing on the page, so a marked-down price is found without reading.
 *
 * There are no rating stars anywhere on this site: the catalog holds no reviews,
 * and drawing five of them would be the single dishonest pixel on the page.
 *
 * ON A PHONE THIS CELL IS 141 PIXELS WIDE, AND THAT NUMBER IS THE WHOLE REASON
 * FOR THE BREAKPOINTS BELOW. The grid is two columns from zero, the shell's
 * gutter at 360 is 7.5vw = 27px, and the column gap is 24, so a card measures
 * (360 - 54 - 24) / 2 = 141. Three things broke at that width and every one of
 * them was measured, not guessed:
 *
 *   The price and the basket control shared one line. `300 000 FCFA` is 108px
 *   of tabular mono at 15px and the control is 44 wide with a 12px gap, which
 *   needs 164 of the 141 there are, so the price wrapped: `300 000` on one line
 *   and `FCFA` on the next, on every card, at 360 AND at 390. Below `sm` the two
 *   are therefore stacked and the price gets the full column: the widest price
 *   this catalogue holds, `11 800 000 FCFA`, measures 135 and fits with 6 to
 *   spare. From `sm` up the row is the row it always was.
 *
 *   The basket control was a 12px word 44 by 22, made touchable only by a
 *   pseudo-element that reached 12px past it on every side. At this width that
 *   expander overhangs into the 24px gutter between two cards, so the two
 *   cards' invisible hit areas meet in the middle of it and a thumb aimed at
 *   the neighbour adds this one to the basket. Below `sm` the control is a real
 *   bordered box, 141 by 44, that ends where the card ends. The expander is
 *   restored from `sm`, where the cell is 260px and there is room for it.
 *
 *   The stamp was 50px on a 141px card: 35% of the width, sitting over the
 *   packshot it is supposed to be marking. 40px below `sm` is 28%.
 *
 * NONE OF THIS TOUCHES THE DESKTOP. Every phone value is a base class with an
 * `sm:` twin that puts the desktop value back, and the desktop card was
 * measured at 1440 before and after: 225.59 wide, price 100.81 by 22.5, control
 * 44.44 by 22.19 at opacity 0 with a -12px expander. Identical.
 *
 * THE TITLE AND THE PRICE ARE NEIGHBOURS, AND EVERYTHING OPTIONAL IS BELOW THEM.
 * They were not. Between the two sat the spec chips, and because a chip row that
 * is sometimes empty would have shifted the price up and down across a grid, the
 * empty case reserved its own height: `min-h-[22px]` plus a 20px margin, which
 * with the heading's own margin measured a fixed 56-pixel hole under every title
 * in the shop, occupied on the cards that have specs and blank on the ones that
 * do not. The old price had the same shape of problem from the other side. It is
 * printed by `Price` directly above the figure, so on the 513 marked-down
 * references the price itself sat 18 pixels higher than on its neighbours, and
 * the owner read a row of cards whose prices did not line up.
 *
 * Both are now drawn after the price, in the card's tail, and the reserve is
 * gone with them: the title is followed by the price on every card in the
 * catalogue, and the two optional pieces take exactly the height they need,
 * which on a card that carries neither is none. The anchor comes first in that
 * tail because it is a price and belongs near the price it discounts; the specs
 * close the card.
 *
 * WHAT HOLDS THE ROW TOGETHER IS NOW THE GRID AND NOT A MARGIN. The price row
 * used to be pushed to the bottom with `mt-auto`, which is what made a card of
 * mixed content still end on its price. With the optional pieces underneath,
 * there is nothing left to push: the cells are grid items and stretch to the
 * tallest of their row on their own, so every card in a row is still exactly as
 * tall as its neighbours and the slack falls where the card has nothing to say.
 * The heading keeps its fixed two-line height, which is the one reserve worth
 * paying for: it is what puts every price in a row on the same line.
 *
 * THE STAMP STAYS ON THE PHOTOGRAPH. It is the other half of the promotion and
 * it is not in the flow at all — it is positioned over the packshot and costs
 * the text column no height — so it was never part of the hole this fixes, and
 * a round sticker re-laid under the specs would be neither a stamp nor a badge.
 */
const DEAL_THRESHOLD = 40

export function ProductCard({
  product,
  index,
  priority = false,
  sizes = '(max-width: 767px) 45vw, (max-width: 1279px) 30vw, 23vw',
  affichage = 'flex',
}: {
  product: CarteProduit
  /** Position in the grid, used only to stagger the entrance. */
  index?: number
  priority?: boolean
  /**
   * La regle d'affichage de la carte, `flex` par defaut. Une grille qui ne
   * montre que des rangees completes y passe `hidden md:flex` et consorts :
   * une seule regle de display par palier, sans `hidden` qui se disputerait
   * avec `flex` selon l'ordre de la feuille de style.
   */
  affichage?: string
  /**
   * Must track the grid's own column breakpoints. They ran 640/1100 while the
   * grid changed at 768/1280, so between 1101 and 1279 the browser was told to
   * fetch a 30vw image for a 45vw cell and upscaled the packshot by half.
   */
  sizes?: string
}) {
  const deal =
    product.remisePct && product.remisePct >= DEAL_THRESHOLD ? product.remisePct : null
  const anchored = isAnchored(product.prixReference, product.remisePct)
  const specs = product.caracteristiques.slice(0, 2)

  return (
    <div
      className={`group enter relative flex-col ${affichage}`}
      style={index === undefined ? undefined : ({ '--enter-index': index } as React.CSSProperties)}
    >
      {/* One child, because `.plate > *` gives every direct child
          `position: relative` to lift it above the board: a second child that
          wanted to be absolute lost its own positioning and fell to the bottom
          of the well. The stamp is therefore positioned against this wrapper. */}
      <div className="plate mb-4">
        <div className="sheen relative overflow-hidden rounded-well">
          <ProductMedia
            src={product.image}
            second={product.imageSurvol}
            // The name is already the link's own text, three lines below. Read
            // out twice, every card in the grid announces itself twice.
            alt=""
            sizes={sizes}
            priority={priority}
          />
          {deal ? (
            <span
              className="absolute top-2.5 left-2.5 z-[2] grid size-10 -rotate-[9deg] place-items-center rounded-full bg-secondary text-on-surface transition-transform duration-[var(--t-base)] ease-brand group-hover:rotate-0 sm:size-[3.125rem]"
              aria-label={`Remise de ${deal} pour cent`}
            >
              {/* One line. Stacked, the per-cent sign had to drop to 9px to sit
                  under the number, and the type scale's floor is 12: a mark
                  nobody can read is not a mark. */}
              <span aria-hidden className="t-num text-[0.8125rem] font-bold tracking-[-0.03em]">
                -{deal}%
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ONE LINE, BECAUSE THE SECOND ONE MOVED THE PRICE AND NOTHING ELSE DID.
          This label is the brand when the ingest recovered one and the category
          name when it did not, and a category name is a sentence: « Batteries
          Onduleurs » wraps in a 150-pixel cell and takes the label from 18
          pixels to 36. Measured on /catalogue at 360, 2 cards of 24 pushed
          their title and their price 18 pixels below every neighbour in the
          same row, which is the misalignment this card was just rebuilt to get
          rid of. Clamped, the label is 18 pixels on all 4 254 references and
          the price of a row sits on one line. */}
      <span className="t-label clamp-1 mb-2.5 text-ink-3">{product.marque ?? product.categorieNom ?? 'Catalogue'}</span>

      <h3 className="mb-3 h-[2.8em] text-small font-semibold leading-[1.4]">
        {/* The link is stretched over the whole card rather than wrapped around
            it, so the basket control beside the price can be a button without
            nesting one interactive element inside another.
            THE STACK ORDER IS THE LINK'S WHOLE HIT AREA, AND IT IS NOT
            COSMETIC. `.plate > *` gives the block holding the photograph
            `position: relative; z-index: 1` so it sits above the board that
            turns behind it. This sheet is `z-index: auto`, which is to say 0,
            so for months the photograph was painted OVER the stretched sheet
            and the one thing a reader actually points at on a product card was
            the one place the card did not navigate from. Three layers, and they
            are the whole model: 1 the photograph and everything printed on it,
            2 this sheet, 3 the basket control below, which is the only thing
            that must stay clickable in its own right. */}
        <Link href={`/produit/${product.slug}`} className="after:absolute after:inset-0 after:z-[2]">
          <span className="clamp-2 draw-under">{product.nom}</span>
        </Link>
      </h3>

      {/* Stacked below `sm`, one row from `sm`. See the head note: at 141px the
          price and the control cannot share a line without the price breaking
          in two, and a price that reads `300 000` above `FCFA` is a column a
          customer cannot scan.

          The basket keeps the place it has always had, beside the price and on
          the card's trailing edge; what moved is what used to be above it. */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Price value={product.prix} anchor={false} />
        {/* The basket, and nothing else: an out-of-stock reference is never
            published, so this corner has no "Sur commande" to say.
            It is the one hole punched in the sheet above, so it rides one layer
            higher than the link. The wrapper is a flex box rather than a plain
            block so the button keeps the row's baseline exactly: an
            inline-level button inside a block would sit on a line box and gain
            a descender's worth of height under it. */}
        <div className="relative z-[3] flex">
          <AddToCart product={product} />
        </div>
      </div>

      {/* The tail: what the product happens to carry, in the height it happens
          to need. Nothing here is reserved and nothing here is required, which
          is the whole point of it being last. */}
      {anchored && product.prixReference ? (
        <div className="mt-2">
          <PriceAnchor listPrice={product.prixReference} />
        </div>
      ) : null}

      {specs.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {specs.map((spec) => (
            <span
              key={spec}
              className="t-num rounded-[5px] bg-space px-2 py-0.5 text-micro text-ink-2"
            >
              {spec}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
