import { servicePoints } from '@/constants/site'

/**
 * The four operating facts, stated once, across the full width of the page.
 *
 * No icons. A truck glyph next to "Livraison 24 à 48 h" adds nothing the words
 * do not already carry, and a row of decorative pictograms is one of the
 * clearest signals that a storefront was assembled from a template.
 *
 * It runs edge to edge on a tint because of where it sits: between the tabbed
 * grid and the arrivals columns, at exactly the point where a reader has seen
 * enough merchandise to start asking how any of it would actually reach them.
 * The tint is the pause in the page, and the answer is what fills it.
 */
export function ServiceStrip({ pickupLine }: { pickupLine: string | null }) {
  return (
    // The band is a pause, not a room. On a phone the four facts stack, so
    // py-16 and a 48px gap turned a 264px desktop strip into 477 pixels of
    // tinted page. Twelve and eight below sm; the desktop measures return at
    // sm and md.
    //
    // UN TIERS DE MOINS SUR LES TROIS, COMME LES JETONS DE RYTHME. 48/64/96
    // deviennent 32/44/64 : ce bloc ecrit son rembourrage a la main et n'aurait
    // pas suivi `--s-band`. La pause reste une pause, elle est simplement plus
    // courte.
    <section className="bg-space py-8 sm:py-11 md:py-16">
      <dl className="shell grid gap-x-12 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
        {servicePoints(pickupLine).map((point) => (
          <div key={point.title} className="enter e-item">
            <dt className="mb-2 text-body font-semibold tracking-[-0.01em]">{point.title}</dt>
            {point.detail ? <dd className="text-small leading-[1.6] text-ink-2">{point.detail}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
