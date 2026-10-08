import Image from 'next/image'
import Link from 'next/link'

import { Price } from './Price'
import type { CarteProduit } from '@/types/catalogue'

/**
 * A product on one line: picture at the left, name and price at the right.
 *
 * The card grid is the right shape when a customer is comparing objects and the
 * photograph is the thing being compared. It is the wrong shape for a column of
 * recent arrivals, where the question is "anything new here" and forty percent
 * of the height of a card is spent on a packshot the reader is only glancing at.
 *
 * So the same product gets a second, quieter form. The picture drops to a
 * 76-pixel square, the specs go, and three of these occupy the height of one
 * card, which is what lets three families of arrivals sit side by side instead
 * of one.
 */
export function ProductRow({ product }: { product: CarteProduit }) {
  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
    >
      <span className="relative block size-[76px] shrink-0 overflow-hidden rounded-[6px] bg-surface">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="76px"
            className="lift object-contain p-1"
          />
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span className="clamp-2 block text-small font-semibold leading-[1.35]">
          <span className="draw-under">{product.nom}</span>
        </span>
        <span className="mt-1.5 flex items-end justify-between gap-3">
          <Price
            value={product.prix}
            listPrice={product.prixReference}
            discountPct={product.remisePct}
          />
        </span>
      </span>
    </Link>
  )
}
