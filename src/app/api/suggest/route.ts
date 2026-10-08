import { NextResponse } from 'next/server'

import { CatalogueIndisponible, lireSuggestions } from '@/lib/catalogue-en-direct'
import type { CarteProduit, Destination } from '@/types/catalogue'

/**
 * What the masthead field asks while it is being typed in.
 *
 * WHY A ROUTE AND NOT A DIRECT CALL FROM THE BROWSER. The field is a client
 * component by necessity — it listens to keystrokes — and the catalogue is read
 * from the backend with the storefront's service header, which must never reach
 * a browser. So the question crosses to this route, which asks the backend and
 * hands ten rows back. This is the same arrangement `/api/assistant` already
 * uses, on purpose: two different shapes for the same problem would be two
 * things to maintain.
 *
 * The reply echoes the query it answered. `AbortController` on the client
 * already cancels superseded requests, but an abort that lands a millisecond
 * too late still resolves, and a suggestion list showing the answer to three
 * letters ago is worse than an empty one. The echo lets the field assert that
 * what it received is what it last asked.
 *
 * THE DEPARTMENT IS PART OF THE QUESTION. The field carries a department
 * selector, and the last row of the panel it feeds reads "Tous les résultats
 * dans Réseaux". The rows above it have to answer the same question, or every
 * one of them is a reference the customer will not find on the page that row
 * points at. The backend does that scoping: with a department, its five
 * products are the first five of that department's results page, its families
 * are the department's own, and its brands are those present in it.
 *
 * AN UNKNOWN DEPARTMENT IS RESOLVED, NOT SENT. The backend answers a slug it
 * does not know with nothing at all, while the results page answers it for the
 * whole catalogue and says so. `lireSuggestions` checks the slug against the
 * navigation first and drops it when it matches no department, and
 * `scope: null` tells the field which question was actually answered.
 *
 * THE QUESTION IS THE READER'S, AND SO IS THE QUOTA. Every letter is a new
 * address the cache has never seen; `lireSuggestions` reads it in the reader's
 * name, so a script cycling `?q=` meets the backend's per-visitor limit and
 * gets this route's 503, where it used to get every answer it asked for.
 */
export interface SuggestReply {
  /** The query this reply answers, folded back so the caller can check it. */
  readonly query: string
  /**
   * The department this reply is scoped to, resolved, or null for the whole
   * catalogue. Echoed for the same reason the query is: the reader can change
   * the department while a request is in flight, and an answer for "all
   * departments" applied to a panel that now promises Réseaux is the exact bug
   * this field is here to stop.
   */
  readonly scope: string | null
  readonly produits: readonly CarteProduit[]
  readonly familles: readonly Destination[]
  readonly marques: readonly Destination[]
}

/**
 * THE REPLY THE PREVIOUS DEPLOYMENT'S FIELD READS, SENT ALONGSIDE THE NEW ONE.
 *
 * The field in a tab opened before this deployment still runs its own
 * JavaScript, asks this same address, and reads `reply.products.length`: on the
 * new keys alone `products` is undefined and the masthead throws on the first
 * letter typed. A client navigation reloads such a tab, but a reader who types
 * into the page they already have never navigates. So the old keys ride along,
 * in the old shape, for as long as a tab from before can still be open.
 *
 * REMOVE THIS ONCE THE DEPLOYMENT THAT INTRODUCED `produits` HAS BEEN LIVE FOR A
 * WEEK: no field left reads `products`, and every reply carries ten rows twice.
 */
interface AncienneReponse {
  readonly products: readonly {
    readonly slug: string
    readonly name: string
    readonly price: number
    readonly inStock: boolean
    readonly image: string | null
    readonly categoryName: string
  }[]
  readonly families: readonly { readonly name: string; readonly slug: string; readonly count: number }[]
  readonly brands: readonly { readonly name: string; readonly slug: string; readonly count: number }[]
}

function ancienneReponse(reponse: Pick<SuggestReply, 'produits' | 'familles' | 'marques'>): AncienneReponse {
  const destination = ({ nom, slug, compte }: Destination) => ({ name: nom, slug, count: compte })
  return {
    products: reponse.produits.map((carte) => ({
      slug: carte.slug,
      name: carte.nom,
      price: carte.prix,
      inStock: carte.enStock,
      image: carte.image,
      categoryName: carte.categorieNom ?? '',
    })),
    families: reponse.familles.map(destination),
    brands: reponse.marques.map(destination),
  }
}

/**
 * NO HTTP CACHE, BECAUSE THE ANSWER CARRIES PRICES.
 *
 * This used to say `public, max-age=60, s-maxage=86400`. A price corrected in
 * the admin panel then reached the product page on the next reload while the
 * search bar kept the old one — for a minute from the browser's own cache, and
 * for up to a DAY from Vercel's edge, which `revalidateTag` does not purge.
 * Reported by the client, reproduced locally. The backend reply is itself held
 * thirty seconds on the server under the `catalogue` tag, which the panel
 * expires on every write, so retyping a letter costs one round trip to this
 * route, not one to the database.
 */
const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  /**
   * 100 characters. The longest product name in the catalogue is 96, and the
   * backend keeps at most six words anyway, so anything past this cannot change
   * the answer — it can only make the query longer for whoever sent it.
   */
  const query = params.get('q')?.slice(0, 100).trim() ?? ''
  const asked = params.get('rayon')?.slice(0, 60).trim() ?? ''

  try {
    /* One read of the navigation when a department is named, then the
       suggestions, under a single deadline; below two characters only the
       department is resolved. */
    const { rayon: scope, produits, familles, marques } = await lireSuggestions(query, asked || null)
    const reply: SuggestReply = { query, scope, produits, familles, marques }
    return NextResponse.json<SuggestReply & AncienneReponse>(
      { ...reply, ...ancienneReponse(reply) },
      { headers: NO_STORE },
    )
  } catch (erreur) {
    if (!(erreur instanceof CatalogueIndisponible)) throw erreur
    /* 503 AND NOT AN EMPTY LIST. An empty 200 would draw "Aucune référence"
       under a word the shop sells hundreds of; the field has its own sentence
       for a service that did not answer, and it points at the full search. */
    return NextResponse.json({ erreur: 'catalogue injoignable' }, { status: 503, headers: NO_STORE })
  }
}
