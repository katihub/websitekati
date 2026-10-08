import Link from 'next/link'

import { IconPhone, IconPin } from '@/components/brand/Icons'
import { Action } from '@/components/ui/Action'
import { dialable } from '@/constants/site'
import { counterCities, shopWhatsapp, whatsappHref } from '@/lib/comptoirs'
import { capitalise, formatWords } from '@/lib/format'
import type { PointDeVente } from '@/types/catalogue'

/**
 * Where the shop physically is.
 *
 * This is the slot a storefront template gives to a newsletter sign-up, and the
 * swap is deliberate. Nobody in this market is deciding whether to buy a 900 000
 * FCFA NVR on the strength of a monthly email; they are deciding whether the
 * seller exists. Three streets you can drive to, with the landmarks addresses
 * actually use here, answer that question. An email field does not.
 *
 * WhatsApp sits beside the counters rather than behind a form for the same
 * reason: it is how a buyer sends a photograph of the broken part and receives
 * the proforma back.
 *
 * EACH COUNTER CARRIES ITS OWN LINES AND ITS OWN MAP. Two typed numbers used to
 * sit under the heading for the whole shop, and one of them answered at no
 * counter. The lines are now the panel's, printed under the address they
 * belong to, the way the assistant gives them: a customer who has chosen where
 * to go calls that counter, not the shop in general.
 *
 * THE COUNTERS ARE THE PANEL'S, AND SO IS THE HEADING'S ARITHMETIC. The list
 * used to be typed into `constants/site.ts` and the heading beside it said
 * "Trois comptoirs, deux villes" in words; both now follow what the panel
 * publishes, so opening a fourth counter cannot leave the heading a number
 * behind the list it introduces.
 *
 * NO LIST, NO BAND. The list is read tolerantly, and an unreadable one arrives
 * empty: the heading then said "Zéro comptoir, zéro ville." over nothing, which
 * tells a reader the shop has no premises at all.
 */
export function ShowroomBand({ pointsVente }: { pointsVente: readonly PointDeVente[] }) {
  if (pointsVente.length === 0) return null
  const cities = counterCities(pointsVente).length
  const heading = `${capitalise(formatWords(pointsVente.length))} ${
    pointsVente.length > 1 ? 'comptoirs' : 'comptoir'
  }, ${formatWords(cities, { feminine: true })} ${cities > 1 ? 'villes' : 'ville'}.`
  const whatsapp = shopWhatsapp(pointsVente)

  return (
    // UN TIERS DE MOINS, COMME LES JETONS DE RYTHME. 56/80/112 deviennent
    // 36/52/76. C'est la derniere bande de l'accueil et elle touche le pied de
    // page : c'est aussi la ou l'air en trop se voyait le plus, parce que deux
    // surfaces teintees se suivaient avec cent pixels de vide entre les deux.
    <section className="bg-space py-9 sm:py-13 md:py-19">
      <div className="shell grid gap-x-16 gap-y-10 sm:gap-y-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="enter text-title font-semibold leading-[1.1] tracking-[-0.025em] text-balance">
            <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
              <span className="e-line">{heading}</span>
            </span>
          </h2>
          <p className="enter e-text mt-4 max-w-[48ch] text-small leading-[1.65] text-pretty text-ink-2">
            Le stock est visible en magasin et se retire le jour même. Pour tout le reste,
            écrivez sur WhatsApp : une photo de la référence suffit.
          </p>
          {whatsapp ? (
            <div className="mt-9">
              <Action href={whatsappHref(whatsapp)}>Écrire sur WhatsApp</Action>
            </div>
          ) : null}
        </div>

        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
          {pointsVente.map((showroom, index) => (
            <li
              key={showroom.key}
              style={{ '--enter-index': index } as React.CSSProperties}
              className="enter e-item"
            >
              <p className="flex items-baseline gap-2.5 text-body font-semibold tracking-[-0.01em]">
                <IconPin className="translate-y-0.5 text-[1rem] text-secondary" />
                {showroom.label}
              </p>
              <p className="mt-1 text-small text-ink-3">{showroom.city}</p>
              <p className="mt-3 text-small leading-[1.6] text-pretty text-ink-2">{showroom.directions}</p>
              {/* On a phone a telephone number is the shortest path to this
                  shop: each line takes 44 pixels below sm, its own height from
                  sm up. */}
              {showroom.phones.length > 0 ? (
                <ul className="mt-3">
                  {showroom.phones.map((line) => (
                    <li key={line.number}>
                      <a
                        href={`tel:${dialable(line.number)}`}
                        className="t-num flex min-h-11 items-center gap-2 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary sm:min-h-0 sm:py-0.5"
                      >
                        <IconPhone className="text-[1rem] text-ink-3" />
                        {line.number}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {showroom.mapUrl ? (
                <a
                  href={showroom.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center text-small font-semibold text-secondary underline underline-offset-4 sm:min-h-0"
                >
                  Itinéraire
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="shell mt-10 border-t border-rule pt-4 sm:mt-14 sm:pt-6">
        <Link
          href="/contact"
          className="draw-under inline-flex min-h-11 items-center text-small font-semibold text-secondary hover:text-secondary sm:min-h-0"
        >
          Horaires, plan d’accès et formulaire
        </Link>
      </div>
    </section>
  )
}
