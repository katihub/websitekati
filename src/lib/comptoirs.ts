import { dialable } from '@/constants/site'
import type { PointDeVente } from '@/types/catalogue'

/**
 * Naming a counter, for the server and the browser alike.
 *
 * Kept out of `account.tsx` on purpose: that module is `'use client'`, and a
 * function exported from it reaches a server component as a client reference
 * that cannot be called. The footer is a server component and needs the same
 * rule as the account menu.
 */

export function findCounter(
  counter: string,
  pointsVente: readonly PointDeVente[],
): PointDeVente | null {
  return pointsVente.find((point) => point.key === counter) ?? null
}

/**
 * What tells a counter apart from another one in the same district.
 *
 * The district alone was the whole label while every district held one
 * counter. Akwa now holds two, and a choice between "Akwa" and "Akwa" is not a
 * choice. The landmark's first clause is what a customer would say on the
 * phone: "celui du carrefour Paris Dancing".
 */
export function counterLandmark(
  point: PointDeVente,
  pointsVente: readonly PointDeVente[],
): string | null {
  const shared = pointsVente.some(
    (other) => other.key !== point.key && other.district === point.district && other.city === point.city,
  )
  if (!shared) return null
  return point.directions.split(',')[0]?.trim() || null
}

/**
 * `Akwa` -> `Douala, Akwa`.
 *
 * `null` WHEN THE PANEL NO LONGER PUBLISHES THE COUNTER. A card saved while
 * Bonapriso was open printed "Retrait à Bonapriso" in the masthead and sent
 * "Retrait : Bonapriso" in the WhatsApp quote, on a site whose own list of
 * counters no longer held it: the shop was promising a counter it had closed.
 * Each caller now says "à choisir" in its own sentence.
 *
 * When the list could not be read at all, nothing can be checked, and the
 * stored value is printed as it is rather than declared closed.
 */
export function counterLabel(counter: string, pointsVente: readonly PointDeVente[]): string | null {
  if (pointsVente.length === 0) return counter
  const point = findCounter(counter, pointsVente)
  if (!point) return null
  const landmark = counterLandmark(point, pointsVente)
  return `${point.city}, ${point.district}${landmark ? ` (${landmark})` : ''}`
}

/**
 * Where to collect, the way it is said: `Akwa, Bonapriso, Yaoundé`.
 *
 * IT WAS TYPED, AND IT OUTLIVED THE COUNTER IT NAMED. The sentence sat in
 * `constants/site.ts` and still said Bonapriso in the utility strip, the mobile
 * menu, `/services` and `/contact` after the panel had closed it, printed right
 * beside the list of counters the panel does publish. It is now read off that
 * list, with the rule the typed sentence followed: a city with one counter is
 * named by the city, a city with several by their districts. Over the old list
 * the rule gives back the old sentence word for word.
 *
 * One function for every place that prints it: the utility strip and the
 * service band once formatted their own versions and drifted apart, "Akwa,
 * Bonapriso, Centre-ville" eighty pixels above "Akwa, Bonapriso, Yaoundé".
 */
export function pickupPlaces(pointsVente: readonly PointDeVente[]): string[] {
  const districtsByCity = new Map<string, string[]>()
  for (const point of pointsVente) {
    districtsByCity.set(point.city, [...(districtsByCity.get(point.city) ?? []), point.district])
  }
  return [...districtsByCity].flatMap(([city, districts]) =>
    districts.length > 1 ? [...new Set(districts)] : [city],
  )
}

/** The same places on one line, or `null` when there is no counter to name. */
export function pickupLine(pointsVente: readonly PointDeVente[]): string | null {
  const places = pickupPlaces(pointsVente)
  return places.length > 0 ? places.join(', ') : null
}

/**
 * The shop's numbers: each counter's first line, in the panel's order.
 *
 * THEY WERE TYPED, AND ONE OF THEM BELONGED TO NO COUNTER. `constants/site.ts`
 * held two numbers that the utility strip, the footer, the quote, the basket
 * and the assistant all printed, and the panel could correct neither. The
 * counters now publish their own lines, so the shop's list is read off them: a
 * line changed in the panel is the one the whole site dials. The first line of
 * each counter is its main one; the others are printed on the counter itself,
 * where a customer choosing where to go looks for them.
 */
export function shopPhones(pointsVente: readonly PointDeVente[]): string[] {
  return [...new Set(pointsVente.flatMap((point) => point.phones.slice(0, 1).map((line) => line.number)))]
}

/** The one number to print where there is room for one. `null` without a counter. */
export function shopPhone(pointsVente: readonly PointDeVente[]): string | null {
  return shopPhones(pointsVente)[0] ?? null
}

/**
 * The first line the panel marks as WhatsApp, in its order. `null` when none is.
 *
 * WhatsApp is not a nice-to-have here. It is how a Cameroonian buyer sends a
 * photograph of the broken part, asks whether the reference is really in stock,
 * and receives the proforma.
 */
export function shopWhatsapp(pointsVente: readonly PointDeVente[]): string | null {
  for (const point of pointsVente) {
    const line = point.phones.find((candidate) => candidate.whatsapp)
    if (line) return line.number
  }
  return null
}

/** `https://wa.me/237…`, with the message already typed when there is one. */
export function whatsappHref(number: string, text?: string): string {
  return `https://wa.me/${dialable(number)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** `Douala`, `Yaoundé`: each city once, in the panel's order. */
export function counterCities(pointsVente: readonly PointDeVente[]): string[] {
  return [...new Set(pointsVente.map((point) => point.city))]
}

