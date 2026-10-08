import Link from 'next/link'

import { ProductRow } from '@/components/product/ProductRow'
import { formatCount, formatMonth } from '@/lib/format'
import type { RecentColumn } from '@/types/catalogue'

/**
 * The newest arrivals, three families side by side.
 *
 * The backend picks them (`colonnes` of `GET /v1/vitrine/accueil`), and nothing
 * here is hand-picked: the families shown are the ones whose newest product is
 * genuinely the newest, capped at one family per department so the whole
 * section does not fill with networking simply because that is where the new
 * stock lands.
 *
 * Columns of lines rather than a grid of cards, and that is the section's whole
 * argument. Twelve cards would be twelve photographs of black boxes and one
 * question answered; twelve lines in three labelled columns answer a different
 * and better one, which is where in the shop things are moving this month.
 */
export function RecentColumns({ columns }: { columns: readonly RecentColumn[] }) {
  return (
    // Below md the three columns are three stacked blocks, each already carrying
    // its own rule and its own label, so the 56px gap that separates them side
    // by side is 56px of nothing between two headed lists. Forty on the phone;
    // the desktop gap returns at md, where the columns sit next to each other
    // again and it is doing real work.
    <div className="grid gap-x-14 gap-y-10 md:grid-cols-2 md:gap-y-14 lg:grid-cols-3">
      {columns.map((column, index) => (
        <section key={column.categorySlug} className="enter" style={{ '--enter-index': index } as React.CSSProperties}>
          <div className="relative flex items-baseline justify-between gap-4 pb-3.5">
            <h3 className="min-w-0">
              {/* THE FAMILY'S NAME IS THE WAY INTO THE FAMILY, AND ON A PHONE IT
                  WAS A 21 PIXEL TARGET. Measured at 360: 186.7 x 21, 171 x 21
                  and 57.3 x 21 for the three columns, against a hand's 44. Below
                  md it takes 12 pixels of padding above and below, which brings
                  the line box to 45; `bg-origin-content` keeps `.draw-under`'s
                  rule against the words rather than 12 pixels under them. From
                  md the head is the inline heading it always was, 21 tall. */}
              <Link
                href={`/categorie/${column.categorySlug}`}
                className="draw-under inline-block bg-origin-content py-3 text-body font-semibold tracking-[-0.015em] md:inline md:py-0"
              >
                {column.categoryName}
              </Link>
            </h3>
            <span className="t-num shrink-0 text-micro text-ink-3">
              {formatCount(column.totalCount, 'réf.', 'réf.')}
            </span>
            <span aria-hidden className="e-rule absolute inset-x-0 bottom-0 block h-px bg-rule" />
          </div>

          <p className="e-text mt-3.5 mb-1 text-micro text-ink-3">
            {column.departmentName}
            {column.newestAt ? ` · arrivage ${formatMonth(column.newestAt)}` : ''}
          </p>

          <div className="divide-y divide-rule">
            {column.products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
