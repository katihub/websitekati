import Image from 'next/image'
import Link from 'next/link'

import { IconArrowRight, IconPhone } from '@/components/brand/Icons'
import { Price } from '@/components/product/Price'
import { Action } from '@/components/ui/Action'
import type { CounterPick } from '@/types/catalogue'
import { dialable } from '@/constants/site'

/**
 * The tour of the other six departments.
 *
 * Five departments hold three quarters of the stock, and every ranked section
 * on a homepage will therefore show the same five: computers, cameras, network,
 * printing, power. A customer who came for a desk phone, a NAS or a bill counter
 * leaves believing the shop does not stock one. This section exists to prevent
 * exactly that, and its rule is simple enough to state on the page: one thing in
 * stock, from each of the six departments the rest of the page never reaches.
 *
 * Each cell leads with its department rather than with the product, because the
 * department is the news here. The product is only the proof.
 */
export function CounterTour({
  picks,
  reconditioned,
  phone,
}: {
  picks: readonly CounterPick[]
  /** The reconditioned department's own photograph, for the first side tile. */
  reconditioned: string | null
  /** The first counter's main line, from the panel. `null` leaves the button alone. */
  phone: string | null
}) {
  return (
    // At lg the side column was a third of 930px, and a 180px measure is not a
    // column, it is a margin with words in it. The split waits for xl; below it
    // the two tiles sit side by side under the grid, where they have room.
    // The vertical gaps are cut below sm. Fourteen and twelve are desktop
    // measures: on a 360 screen they put 56 and 48 pixels of nothing between
    // rows that are already stacked one per screen, and the section measured
    // 1 911 pixels tall. From sm the desktop rhythm returns untouched.
    <div className="grid gap-x-8 gap-y-10 sm:gap-y-14 xl:grid-cols-[2fr_1fr] xl:gap-x-14">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-y-12 md:grid-cols-3">
        {picks.map((pick, index) => (
          <Link
            key={pick.product.id}
            href={`/produit/${pick.product.slug}`}
            style={{ '--enter-index': index } as React.CSSProperties}
            className="group enter flex flex-col"
          >
            <span className="t-label mb-4 text-secondary">{pick.departmentName}</span>

            <span className="plate mb-5 block">
              <span className="sheen relative block aspect-square overflow-hidden rounded-well border border-rule bg-surface transition-colors duration-[var(--t-base)] group-hover:border-rule-2">
                {pick.product.image ? (
                  <Image
                    src={pick.product.image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 39vw, (max-width: 1279px) 27vw, 17vw"
                    className="e-media object-contain"
                  />
                ) : null}
              </span>
            </span>

            <span className="clamp-2 mb-4 block h-[2.8em] text-small font-semibold leading-[1.4]">
              <span className="draw-under">{pick.product.nom}</span>
            </span>

            <span className="mt-auto flex items-end justify-between gap-3">
              <Price value={pick.product.prix} />
            </span>
          </Link>
        ))}
      </div>

      {/* `content-start` rather than the default stretch: beside a two-row grid
          the column is 700 pixels tall, and two tiles told to fill it end up
          with 120 pixels of nothing between their own paragraphs and their own
          buttons. Sized to their content they read as two objects; stretched
          they read as two containers. */}
      {/* Side by side only from md: at 640 the pair split a 544px measure into
          two 188px tiles, which is narrower than the sentence they carry. */}
      <div className="grid content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
        {/* p-9 is 36 pixels of padding on each side of a 306px screen, which
            leaves the sentence 234 to sit in. Below sm it is p-6, the same
            padding the promo banners already take on a phone; from sm the tile
            is the desktop's again. */}
        <Link
          href="/rayon/services-occasion"
          className="group enter flex flex-col gap-7 rounded-space bg-space p-6 transition-colors duration-[var(--t-base)] hover:bg-space-2 sm:p-9"
        >
          <div>
            <p className="text-sub font-semibold leading-[1.2] tracking-[-0.02em]">
              Reconditionné et atelier
            </p>
            <p className="mt-3.5 text-small leading-[1.6] text-pretty text-ink-2">
              Postes et écrans repris, testés et regarantis, à côté des prestations d’installation
              et de maintenance facturées à la ligne.
            </p>
          </div>

          {reconditioned ? (
            <span
              aria-hidden
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-well bg-surface"
            >
              <Image
                src={reconditioned}
                alt=""
                fill
                sizes="(max-width: 767px) 50vw, (max-width: 1279px) 27vw, 320px"
                className="lift object-contain p-4"
              />
            </span>
          ) : null}

          <span className="inline-flex items-center gap-2.5 text-small font-semibold text-secondary">
            <span className="measure">Voir le rayon</span>
            <IconArrowRight className="travel text-[1.125rem]" />
          </span>
        </Link>

        {/* The one dark block between the two rails. A proforma is a phone
            conversation in this market, not a form, so the tile hands over the
            number instead of a field. */}
        <div className="on-rail enter flex flex-col gap-8 rounded-space bg-rail p-6 text-rail-ink sm:p-9">
          <div>
            <p className="text-sub font-semibold leading-[1.2] tracking-[-0.02em]">
              Une liste à chiffrer ?
            </p>
            <p className="mt-3.5 text-small leading-[1.6] text-pretty text-rail-ink-2">
              Envoyez le besoin, recevez la proforma avec les délais et la TVA. Facturation
              entreprise, livraison sur site, installation en option.
            </p>
          </div>
          {/* The two controls in this tile measured 37 and 19.5 pixels tall.
              A proforma is a phone conversation in this market, so the number
              beside the button is not decoration and owes a thumb the same 44
              pixels the button does. Both take a 44px line box below sm and
              return to their own height from sm up. */}
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 sm:gap-y-4">
            <Action href="/devis" variant="on-rail" size="sm" className="min-h-11 sm:min-h-0">
              Demander un devis
            </Action>
            {phone ? (
              <a
                href={`tel:${dialable(phone)}`}
                className="t-num flex min-h-11 items-center gap-2.5 text-small text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary sm:min-h-0"
              >
                <IconPhone className="text-[1rem]" />
                {phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
