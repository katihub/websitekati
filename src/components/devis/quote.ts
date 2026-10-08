import { VAT_RATE } from '@/constants/site'
import type { Account } from '@/lib/account'
import { counterLabel, shopWhatsapp, whatsappHref } from '@/lib/comptoirs'
import type { PointDeVente } from '@/types/catalogue'
import type { CartLine } from '@/lib/cart'
import { formatPrice } from '@/lib/format'

/**
 * The arithmetic and the wording of a quote, kept out of the view.
 *
 * THIS FILE IS THE ONLY PLACE THE QUOTE'S NUMBERS AND ITS MESSAGE ARE PRODUCED,
 * because both are claims made to a customer about money and both have to be
 * reproducible by hand. A total assembled inline in JSX is a total nobody can
 * check.
 *
 * WHAT A QUOTE IS ON THIS SITE. There is no payment gateway and there will not
 * be one: the shop is settled in cash at the counter, on delivery, or by Mobile
 * Money against a proforma. So the end of the journey is not a checkout, it is a
 * list of material that leaves for the counter and comes back priced. Nothing
 * below sends anything. It writes a message and hands the customer a link; the
 * customer presses send inside WhatsApp, on their own account.
 */

/* -------------------------------------------------------------------------- */
/* Tax                                                                        */
/* -------------------------------------------------------------------------- */

/** `19,25 %`, written once. The footer and the contact page print the same. */
export const VAT_LABEL = `${(VAT_RATE * 100).toFixed(2).replace('.', ',')} %`

export interface Totals {
  /** What the customer pays, and what every price in the catalogue already is. */
  readonly ttc: number
  readonly ht: number
  readonly vat: number
}

/**
 * THE CATALOGUE PRICES ARE TTC, SO THE TAX IS EXTRACTED, NEVER ADDED. A quote
 * that computed `ttc = subtotal * 1.1925` would tax the customer twice and
 * overstate a 500 000 FCFA basket by 96 250 francs.
 *
 * The rounding is deliberate and it goes one way only: the HT base is rounded to
 * the franc (the XAF has no minor unit, so a decimal here would be a number that
 * cannot exist), and the VAT is then the REMAINDER rather than its own rounded
 * product. That guarantees `ht + vat === ttc` exactly, on every basket, which is
 * the one property a reader will actually check by adding up the three lines.
 * Rounding both independently drifts by a franc on roughly half of all baskets,
 * and a proforma whose column does not add up is a proforma that gets queried.
 */
function splitVat(ttc: number): Totals {
  const ht = Math.round(ttc / (1 + VAT_RATE))
  return { ttc, ht, vat: ttc - ht }
}

export function totalsOf(lines: readonly CartLine[]): Totals {
  return splitVat(lines.reduce((sum, line) => sum + line.price * line.qty, 0))
}

/* -------------------------------------------------------------------------- */
/* The message                                                                */
/* -------------------------------------------------------------------------- */

/**
 * THE LIMIT IS REAL AND IT IS THE URL, NOT WHATSAPP'S OWN 65 536 CHARACTERS.
 * A `wa.me` link carries the whole message in its query string, and the weakest
 * link in the chain is the Android intent that hands it to the app, which is
 * unreliable past roughly two thousand characters of raw text. Past that the
 * message does not arrive shortened with a warning, it arrives cut mid-word, and
 * a basket whose last four references silently vanished is worse than a basket
 * that says out loud which references it is not carrying.
 *
 * So the detail block is budgeted at 900 characters and 15 rows, whichever bites
 * first. With the greeting, the totals and the identity block the whole message
 * lands under 1 300 characters, which encodes to roughly 2 200 of URL: inside
 * every limit in the chain with room to spare.
 *
 * WHAT OVERFLOWS IS THE DETAIL, NEVER THE TOTAL. The totals line is always
 * computed from the entire basket, and the count of rows left out is stated in
 * the message and again on the page. A message that quietly quoted the total of
 * the first twelve lines would be the one dishonest thing on this site.
 */
const MAX_ROWS = 15
const DETAIL_BUDGET = 900
/** Product names in this export run to 90 characters. Past this they are cut. */
const MAX_NAME = 58

export interface QuoteMessage {
  readonly text: string
  /** `https://wa.me/...`, message already encoded. `null` when the panel publishes no WhatsApp line. */
  readonly href: string | null
  /** Rows written out in full. */
  readonly detailed: number
  /** Rows the budget left out, announced in the message as a count. */
  readonly omitted: number
}

/**
 * `formatPrice` groups with a narrow no-break space, which is correct on the
 * page and a liability in a message: it survives the URL, but it is a glyph
 * plenty of keyboards and older Android builds render as a box in the middle of
 * a price. The message gets ordinary spaces.
 */
function plain(value: number): string {
  return formatPrice(value).replace(/[\u202f\u00a0\u2009]/g, ' ')
}

/** `1 référence` / `4 références`. No grouping: a basket never reaches 1 000 rows. */
function count(value: number, singular: string): string {
  return `${value} ${singular}${value < 2 ? '' : 's'}`
}

export function buildQuoteMessage(
  lines: readonly CartLine[],
  account: Account | null,
  pointsVente: readonly PointDeVente[],
): QuoteMessage {
  const whatsapp = shopWhatsapp(pointsVente)
  const totals = totalsOf(lines)
  const items = lines.reduce((sum, line) => sum + line.qty, 0)

  const rows: string[] = []
  let spent = 0
  for (const line of lines) {
    if (rows.length >= MAX_ROWS) break
    const name =
      line.name.length > MAX_NAME ? `${line.name.slice(0, MAX_NAME).trimEnd()}...` : line.name
    // The slug is the only stable identifier a basket line carries, and it is
    // exactly what the counter types back into the shop's own search.
    const row = `${line.qty} x ${name} (${line.slug}) : ${plain(line.price * line.qty)}`
    if (spent + row.length > DETAIL_BUDGET && rows.length > 0) break
    rows.push(row)
    spent += row.length + 1
  }

  const omitted = lines.length - rows.length

  const text = [
    'Bonjour NowTech Center. Voici ma liste de matériel, pour une facture proforma.',
    '',
    ...rows,
    ...(omitted > 0
      ? [`+ ${count(omitted, 'référence')} que ce message ne détaille pas.`]
      : []),
    '',
    `Total : ${plain(totals.ttc)} TTC, ${count(lines.length, 'référence')}, ${count(items, 'article')}.`,
    `Dont TVA ${VAT_LABEL} : ${plain(totals.vat)}. Base HT : ${plain(totals.ht)}.`,
    ...(account
      ? [
          '',
          `Nom : ${account.name}`,
          `Téléphone : ${account.phone}`,
          ...(account.counter
            ? [`Retrait : ${counterLabel(account.counter, pointsVente) ?? 'comptoir à choisir'}`]
            : []),
        ]
      : []),
    '',
    'Merci de me confirmer la disponibilité, le délai et le prix final.',
  ].join('\n')

  return {
    text,
    href: whatsapp ? whatsappHref(whatsapp, text) : null,
    detailed: rows.length,
    omitted,
  }
}
