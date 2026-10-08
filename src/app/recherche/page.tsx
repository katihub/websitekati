import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { Pager } from '@/components/catalog/Pager'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Action } from '@/components/ui/Action'
import { IconArrowRight } from '@/components/brand/Icons'
import { lireNavigation, lirePointsVenteOuVide, lireRecherche } from '@/lib/catalogue-en-direct'
import { shopWhatsapp, whatsappHref } from '@/lib/comptoirs'
import { rayonParSlug, rayonsOrdonnes } from '@/lib/catalogue-vues'
import { formatAmount } from '@/lib/format'
import { avecPanneCatalogue } from '@/lib/panne-catalogue'
import { PER_PAGE, SORTS, parsePage, parseSort, type SortKey } from '@/lib/params'
import type { Destination, RayonNav } from '@/types/catalogue'

/**
 * The results page behind the masthead field.
 *
 * WHAT THE PAGE PROMISES. Every list on this site has to be a query a customer
 * could run again, and this one states its own in the lead: every reference
 * whose name, brand or family carries ALL the words typed. That last word is
 * why "onduleur 1500" returns eleven references and not four hundred, and it is
 * also why a misspelling returns nothing, so the empty state below says it
 * plainly instead of shrugging.
 *
 * WHAT "ALL THESE WORDS" ACTUALLY MEANS, AND WHY THE LEAD SAYS IT. The match is
 * on WORD STARTS, not on substrings: "ondul" finds "onduleur" because the word
 * begins that way, and "hp" does NOT find a Hikvision switch because "hp" starts
 * no word in it. The consequence the copy has to own is arithmetic: "hp"
 * returns 597 references while `/marque/hp` counts 544, because the prefix also
 * catches the 43 HPE. Both figures are right — a text search and a brand facet
 * are two different questions — so this page states the rule and NEVER claims to
 * be showing "toutes les références HP". The lead is the place that says it,
 * because the lead is what a reader compares against the count in the corner.
 *
 * THE DEPARTMENT FILTER IS COUNTED, NOT LISTED. A row of twelve departments
 * where nine lead to an empty page is a row of nine traps: they look identical
 * to the three that work. So only the departments actually holding something
 * appear, each carrying its own figure. The backend counts them in the same
 * query as the results (`parRayon`); this page used to run the search fourteen
 * more times to get the same numbers.
 *
 * WHAT HAPPENS WHEN THE DEPARTMENT IS THE PROBLEM. The backend returns
 * `totalTousRayons` alongside `total` precisely so this page can tell the
 * difference between "the shop does not have it" and "the shop does not have it
 * HERE". A scoped search that lands on zero while the catalogue holds
 * thirty-four is not an empty page, it is a page with one link on it, and that
 * link widens the search rather than starting it again.
 *
 * WHAT HAPPENS WHEN THE DEPARTMENT DOES NOT EXIST. `?rayon=` is a piece of URL,
 * and URLs are edited, shared, bookmarked and outlived by the taxonomy they name.
 * The backend answers an unknown slug with zero results, which is the wrong
 * answer; searching the whole catalogue instead is the right one, and silently
 * doing so would be the wrong silence: the reader
 * asked one question and got another one back with no notice, and every count on
 * the page then reads as the count for a department that was never applied. So
 * the slug is resolved HERE first, and a slug that resolves to nothing is stated
 * above the results in the reader's own words before anything else is drawn.
 *
 * IT IS NOT INDEXED. A search page is an infinite URL space over content that
 * already has its own pages: every family, every brand and every product is
 * indexable in its own right, and letting a crawler in here would put thousands
 * of thin permutations of them into the index competing with the originals.
 */
interface Query {
  q?: string | string[]
  rayon?: string | string[]
  tri?: string | string[]
  page?: string | string[]
}

/**
 * Next hands every search parameter through as `string | string[] | undefined`,
 * because a URL is a thing people edit, share and mistype, and `?q=a&q=b` is a
 * legal URL. One reader, one query: the first value wins and the rest is
 * dropped.
 */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

/** Same cap as `/api/suggest`, for the same reason: past this nothing changes. */
function readQuery(params: Query): string {
  return first(params.q).slice(0, 100).trim()
}

function searchHref({
  q,
  rayon,
  tri,
  page,
}: {
  q: string
  rayon?: string | null
  tri?: SortKey
  page?: number
}): string {
  const params = new URLSearchParams({ q })
  if (rayon) params.set('rayon', rayon)
  if (tri && tri !== 'recent') params.set('tri', tri)
  if (page && page > 1) params.set('page', String(page))
  return `/recherche?${params}`
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Query>
}): Promise<Metadata> {
  const query = readQuery(await searchParams)
  return {
    title: query ? `Recherche : ${query}` : 'Rechercher dans le catalogue',
    robots: { index: false, follow: true },
  }
}

export default avecPanneCatalogue(async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const params = await searchParams
  const query = readQuery(params)
  const sort = parseSort(params.tri)
  const page = parsePage(params.page)

  /* Same 60-character cap as `/api/suggest` uses on the same parameter: the
     longest real slug is 24 and nothing past that can resolve, so the rest is
     only length to carry around and to print back at somebody. */
  const asked = first(params.rayon).slice(0, 60).trim()
  const [nav, pointsVente] = await Promise.all([lireNavigation(), lirePointsVenteOuVide()])
  const whatsapp = shopWhatsapp(pointsVente)
  const rayons = rayonsOrdonnes(nav)
  const universe = asked ? rayonParSlug(nav, asked) : null

  /* A slug was given and the catalogue does not know it. The search below runs
     unscoped — the slug is never sent, since the backend would answer it with
     zero — and the page says so. */
  const staleScope = asked && !universe ? asked : null

  if (!query) return <EmptyQuery staleScope={staleScope} rayons={rayons} />

  const result = await lireRecherche({ q: query, rayon: universe?.slug ?? null, tri: sort, page })
  const scope = universe?.slug ?? null
  const scopeName = universe ? (result.rayonNom ?? universe.nom) : null

  /* Only the departments that answer, deepest first; a tie keeps the order the
     department list itself uses, so two rows with the same figure do not swap
     places between two searches. */
  const rang = (slug: string) => rayons.findIndex((rayon) => rayon.slug === slug)
  const perDepartment = result.parRayon
    .filter((entry) => entry.total > 0 && rang(entry.slug) !== -1)
    .map((entry) => ({ slug: entry.slug, name: entry.nomCourt, count: entry.total }))
    .sort((a, b) => b.count - a.count || rang(a.slug) - rang(b.slug))

  const from = result.total === 0 ? 0 : (result.page - 1) * PER_PAGE + 1
  const to = Math.min(result.page * PER_PAGE, result.total)

  return (
    <>
      <Breadcrumb
        path={[{ nom: 'Catalogue', href: '/catalogue' }]}
        current={`Recherche « ${query} »`}
      />

      <PageHeader
        title={
          result.total > 0 ? (
            <>Résultats pour «&nbsp;{query}&nbsp;»</>
          ) : (
            // Not "Résultats" over an empty page. The heading is the first thing
            // read and it has to carry the outcome, not the intention.
            <>Aucun résultat pour «&nbsp;{query}&nbsp;»</>
          )
        }
        /* Says the rule, and only the rule. It never says "toutes les
           références HP", because a word-start search for « hp » also reaches
           HPE and the figure in the corner would not match the sentence. */
        lead={
          result.total > 0
            ? `Les références dont le nom, la marque ou la famille contiennent un mot commençant par chacun des mots tapés${
                scopeName ? `, dans le rayon ${scopeName}` : ''
              }. « ondul » atteint donc « onduleur », et une marque peut en amener une voisine. Cette recherche se refait telle quelle depuis la barre du haut.`
            : `Aucune référence ne commence par tous ces mots${
                scopeName ? ` dans le rayon ${scopeName}` : ''
              }. La recherche exige chaque mot, et le cherche en début de mot : c’est ce qui empêche « onduleur 1500 » de renvoyer tous les onduleurs, et c’est aussi ce qui fait échouer une faute de frappe.`
        }
        aside={
          result.total > 0
            ? `${formatAmount(result.total)} référence${result.total > 1 ? 's' : ''}`
            : undefined
        }
      />

      <section className="shell pb-band">
        {staleScope ? (
          <StaleScope
            slug={staleScope}
            tail={
              perDepartment.length > 0
                ? 'La recherche a donc porté sur tous les rayons, et les nombres ci-dessous sont ceux du catalogue entier. Pour vous limiter à un rayon qui existe, prenez-le dans la liste juste en dessous.'
                : 'La recherche a donc porté sur tous les rayons, et elle n’a rien trouvé non plus. Les rayons du magasin sont listés plus bas.'
            }
          />
        ) : null}

        {/* The department the search is limited to. Present in both states:
            when the results are empty it is the fastest way out of the dead
            end, and when they are not it is the fastest way to narrow. */}
        {perDepartment.length > 0 ? (
          <nav aria-label="Limiter à un rayon" className="enter mb-stack">
            <ul className="flex flex-wrap gap-2.5">
              <li>
                <Chip
                  href={searchHref({ q: query, tri: sort })}
                  active={!scope}
                  label="Tous les rayons"
                  count={result.totalTousRayons}
                />
              </li>
              {perDepartment.map((entry) => (
                <li key={entry.slug}>
                  <Chip
                    href={searchHref({ q: query, rayon: entry.slug, tri: sort })}
                    active={scope === entry.slug}
                    label={entry.name}
                    count={entry.count}
                  />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {result.total > 0 ? (
          <>
            {/**
             * The range and the four orderings.
             *
             * WRITTEN HERE, AND FOR NOW ONLY HERE. The other listings sort
             * inside the shared filter panel (`FilteredListing`), and this
             * page is meant to join them once the backend's search counts
             * every facet the panel draws. Until then it keeps its own row,
             * because `q` and `rayon` have to survive a change of ordering.
             */}
            <div className="enter mb-stack flex flex-wrap items-center justify-between gap-x-10 gap-y-5 border-b border-rule pb-5">
              <p className="e-text t-num text-small text-ink-2">
                {result.total <= PER_PAGE
                  ? `${formatAmount(result.total)} résultats`
                  : `${formatAmount(from)} à ${formatAmount(to)} sur ${formatAmount(result.total)}`}
              </p>

              <div className="e-item flex flex-wrap items-center gap-x-2 gap-y-2">
                <span id="sort-label" className="t-label mr-1 hidden text-ink-3 sm:inline">
                  Trier
                </span>
                <ul aria-labelledby="sort-label" className="flex flex-wrap gap-2">
                  {SORTS.map((option) => (
                    <li key={option.key}>
                      <Link
                        // No page parameter: a reader who asks for the cheapest
                        // and lands on page seven of the old order has been
                        // answered with something else.
                        href={searchHref({ q: query, rayon: scope, tri: option.key })}
                        scroll={false}
                        aria-current={option.key === sort ? 'true' : undefined}
                        className={`press inline-flex min-h-11 items-center rounded-pill px-5 py-2 text-small whitespace-nowrap transition-colors duration-[var(--t-fast)] md:min-h-0 ${
                          option.key === sort
                            ? 'bg-secondary font-semibold text-on-surface'
                            : 'border border-rule text-ink-2 hover:border-ink hover:text-secondary'
                        }`}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ProductGrid products={result.produits} columns={4} priorityCount={4} />

            <Pager
              basePath="/recherche"
              query={{
                q: query,
                ...(scope ? { rayon: scope } : {}),
                ...(sort === 'recent' ? {} : { tri: sort }),
              }}
              page={result.page}
              pages={result.pages}
            />
          </>
        ) : (
          <Nothing
            query={query}
            scopeName={scopeName}
            totalUnscoped={result.totalTousRayons}
            families={result.familles}
            brands={result.marques}
            rayons={rayons}
            widenHref={searchHref({ q: query, tri: sort })}
            whatsapp={whatsapp}
          />
        )}
      </section>
    </>
  )
})

/**
 * A destination with its own figure: a department to narrow to, or a family or
 * a brand the dead end offers instead.
 *
 * THE COUNT ON THE SELECTED CHIP IS FULL WHITE, NOT WHITE AT 80 %. The label
 * beside it is white on --accent, which measures 5.13:1 and passes. The count
 * was drawn at 80 % opacity to make it recede, which blends it to #ccdfd0 over
 * #008013 and measures 4.09:1 at 12 pixels — under the 4.5:1 that anything
 * smaller than 24px (or 18.66px bold) has to hold. A figure a reader is meant
 * to compare against the one in the corner of the page is not decoration, so
 * the recession is bought with weight and size instead of with opacity.
 */
function Chip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`press inline-flex min-h-11 items-center gap-2.5 rounded-pill px-5 py-2 text-small transition-colors duration-[var(--t-fast)] md:min-h-0 ${
        active
          ? 'bg-secondary font-semibold text-on-surface'
          : 'border border-rule text-ink-2 hover:border-ink hover:text-secondary'
      }`}
    >
      {label}
      <span className={`t-num text-micro ${active ? 'text-paper' : 'text-ink-3'}`}>
        {formatAmount(count)}
      </span>
    </Link>
  )
}

/**
 * The department in the address does not exist.
 *
 * A DISCREPANCY, NOT AN ERROR. Nothing failed: the search ran, it has results,
 * and they are good. What is wrong is narrower and worth exactly one paragraph —
 * the page is answering a slightly wider question than the URL asked, and every
 * figure below is a catalogue-wide figure. Said once, at the top, before the
 * counts the reader is about to read them as.
 *
 * IT IS DRAWN AS A WARNING AND NOT AS A DEAD END. `--warn` measures 6.84:1 on
 * paper, so the eyebrow is legible at micro size, and the body underneath is
 * ordinary ink because the sentence is ordinary information. There is no button:
 * the way to pick a real department is the chip row immediately below when it
 * exists, and this paragraph says so rather than duplicating twelve links. When
 * that row is absent — the words match nothing anywhere — the reader is sent to
 * the departments instead, which the empty state below renders in full.
 *
 * `role="status"` because on a client-side navigation from one search to the
 * next, this block appearing is the only thing that changed, and a screen reader
 * gets no notification from a paragraph arriving mid-document.
 *
 * The slug is printed back as the reader wrote it, capped at 60 characters
 * upstream, and it is text in a text node: React escapes it, so a slug carrying
 * markup is a slug, not markup.
 */
function StaleScope({ slug, tail }: { slug: string; tail: string }) {
  return (
    <div role="status" className="enter e-item mb-stack max-w-[62ch] border-l-2 border-warn pl-5">
      <p className="t-label text-warn">Rayon inconnu</p>
      <p className="mt-2 text-small leading-[1.6] text-ink-2">
        L’adresse demande le rayon{' '}
        <span className="font-semibold text-ink">«&nbsp;{slug}&nbsp;»</span>, qui n’existe pas
        dans ce catalogue. {tail}
      </p>
    </div>
  )
}

/**
 * What the counter is asked, when the catalogue could not answer.
 *
 * A bare `?text=onduleur%201500` opens WhatsApp with one word in the box and
 * leaves the customer to write the sentence around it, which on a phone is the
 * moment most of them close the app. This sends a message that already reads as
 * a message, and it tells the counter the one thing that makes it actionable:
 * this was looked for on the site and not found, so the answer is not "it is on
 * the website" — it is a price, a substitute, or a no.
 *
 * The SAME sentence is built in `SearchField.tsx` for the row at the foot of
 * the suggestion panel, deliberately duplicated rather than shared: this file is
 * a server component and that one is a client component, and a helper module for
 * one template string would be a third file to keep in step with two.
 */
function counterHref(whatsapp: string, query: string): string {
  return whatsappHref(
    whatsapp,
    `Bonjour, je cherche « ${query} ». Je ne l’ai pas trouvé sur nowtechcenter.com, est-ce que vous l’avez ?`,
  )
}

/**
 * Nothing matched.
 *
 * THIS IS A SERVICE DESK, NOT AN ERROR MESSAGE. It is also, by a wide margin,
 * the most-read state of this page: everybody who mistypes, everybody who uses
 * the manufacturer's spelling, everybody who scopes to the wrong department
 * lands here. So it answers the four questions a person actually has, in the
 * order they have them, and every one of them is a link rather than a sentence.
 *
 * THE ORDER IS DELIBERATE: the way out of the department first, then the
 * families and brands the words did touch, then the twelve doors, then a human.
 * A customer who scoped to Réseaux and got zero while the shop holds thirty-four
 * elsewhere has been told a technical truth and a practical lie, and the first
 * block is the correction. Only once that is out of the way is it honest to
 * offer the counter, because the counter genuinely holds stock the export does
 * not, and offering it first would be using a person as a search index.
 *
 * WHY THE DEPARTMENTS APPEAR HERE TOO. The blocks above are conditional and the
 * common case is that NONE of them fires: "zzzzqqq" touches no family, no brand
 * and no department, and what was left was a heading, a paragraph and two
 * buttons in an acre of white — the least drawn page on the site standing in for
 * the most visited state of it. The twelve departments with their real counts
 * are the same grid the no-query state renders a hundred lines below, and they
 * are the honest floor: whatever the words were, these twelve are where the
 * 4 254 references live. They are drawn only when nothing more specific fired,
 * because under a list of matching families they would be noise.
 *
 * WHY THE FIRST BLOCK CARRIES NO TOP MARGIN AND NO RULE. Each block used to own
 * its own `mt-stack` and the last one owned a rule as well, which meant that in
 * the frequent case where only the last one drew, the state opened with a
 * band of empty page and a horizontal line across nothing. Separators belong
 * BETWEEN things: `first:` strips both off whichever block happens to be first.
 */
function Nothing({
  query,
  scopeName,
  totalUnscoped,
  families,
  brands,
  rayons,
  widenHref,
  whatsapp,
}: {
  query: string
  scopeName: string | null
  totalUnscoped: number
  families: readonly Destination[]
  brands: readonly Destination[]
  rayons: readonly RayonNav[]
  widenHref: string
  /** The panel's WhatsApp line; without one the counter is not offered. */
  whatsapp: string | null
}) {
  /* The block that separates itself from the one above it, and does not when
     there is nothing above it. One string, four blocks, no arithmetic. */
  const block = 'e-item mt-stack border-t border-rule pt-8 first:mt-0 first:border-0 first:pt-0'

  const named = families.length > 0 || brands.length > 0

  return (
    <div className="enter max-w-[62ch]">
      {scopeName && totalUnscoped > 0 ? (
        <div className="e-item rounded-well border border-rule bg-space p-6 md:p-7">
          <p className="text-body leading-[1.6]">
            Rien dans <strong className="font-semibold">{scopeName}</strong>, mais{' '}
            <span className="t-num font-semibold">{formatAmount(totalUnscoped)}</span>{' '}
            {totalUnscoped > 1 ? 'références' : 'référence'} ailleurs dans le catalogue.
          </p>
          <Action href={widenHref} variant="secondary" className="mt-5">
            Chercher dans tous les rayons
            <IconArrowRight className="text-[1.0625rem]" />
          </Action>
        </div>
      ) : null}

      {named ? (
        <div className={block}>
          <h2 className="text-sub font-bold tracking-[-0.02em]">
            Ces mots nomment plutôt une page
          </h2>
          {/* Careful with the promise: these come from the catalogue-wide
              ranking, so a scoped search can be offered a family that sits in
              another department. Saying "dans tout le catalogue" costs three
              words and stops the row from lying. */}
          <p className="mt-3 text-small leading-[1.6] text-ink-2">
            Aucune référence ne porte tous ces mots, mais ces pages les portent, dans tout le
            catalogue. Le nombre est celui des références qu’elles contiennent.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {families.map((family) => (
              <li key={`f-${family.slug}`}>
                <Chip
                  href={`/categorie/${family.slug}`}
                  active={false}
                  label={family.nom}
                  count={family.compte}
                />
              </li>
            ))}
            {brands.map((brand) => (
              <li key={`b-${brand.slug}`}>
                <Chip
                  href={`/marque/${brand.slug}`}
                  active={false}
                  label={brand.nom}
                  count={brand.compte}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!named ? (
        <div className={block}>
          <h2 className="text-sub font-bold tracking-[-0.02em]">Entrer par un rayon</h2>
          <p className="mt-3 text-small leading-[1.6] text-ink-2">
            Ces mots ne touchent ni une famille ni une marque. Voici les douze rayons du
            magasin, avec le nombre de références que chacun contient aujourd’hui.
          </p>
          <Departments rayons={rayons} className="mt-7" />
        </div>
      ) : null}

      <div className={block}>
        <h2 className="text-sub font-bold tracking-[-0.02em]">Le comptoir sait, lui</h2>
        <p className="mt-3 text-small leading-[1.6] text-ink-2">
          Le catalogue en ligne ne montre pas tout ce que l’atelier tient, et une référence
          peut s’écrire autrement chez le fabricant. Posez la question : le message part déjà
          écrit, avec «&nbsp;{query}&nbsp;» dedans.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {/* `Action` is the only button in the system and it renders a link,
              which an absolute wa.me URL is. Same control as the showroom band
              uses for the same destination. */}
          {whatsapp ? (
            <Action href={counterHref(whatsapp, query)} target="_blank" rel="noopener noreferrer">
              Demander sur WhatsApp
            </Action>
          ) : null}
          <Action href="/catalogue" variant="secondary">
            Parcourir le catalogue
            <IconArrowRight className="text-[1.0625rem]" />
          </Action>
        </div>
      </div>
    </div>
  )
}

/**
 * The twelve doors.
 *
 * ONE COMPONENT, TWO STATES, BECAUSE IT IS ONE ANSWER. "There is nothing for
 * these words" and "you have not typed anything yet" are different sentences
 * with the same next step, and the next step is the department list with its
 * real counts. It used to exist only inside the no-query state, which is the
 * state almost nobody reaches, while the dead-end state that everybody reaches
 * had nothing to offer. Same markup in both, so the two can never drift.
 *
 * The counts are the catalogue's own `compte` per department, not a figure
 * about the query: they say how big each room is, which is exactly the question
 * a reader who has run out of words is asking.
 *
 * AND ON A PHONE THE TWELVE ARE A LIST, NOT A GRID, BECAUSE HERE THE COST OF THE
 * GRID IS PAID BY THE ONE CONTROL THAT MATTERS. Measured at 360 before this was
 * touched: each door was 87.9 tall with its two-line gloss, the twelve came to
 * 1 406.5, and the block sits directly above "Le comptoir sait, lui" — so the
 * WhatsApp button, the human a reader falls back on when the catalogue has
 * failed them, was at y 2 369 on a 4 198-pixel page. Three screens below the
 * fold, on the state of this page that more people see than any other.
 *
 * Set as the site's ordinary index row — a rule between, the name left, the
 * count right, 52 tall, no gloss — the twelve measure 624 and the button comes
 * up to y 1 587. The reasoning behind dropping the gloss rather than truncating
 * it is written out over the same list in `/catalogue`.
 *
 * `sm:` puts the grid back untouched: at 1440 the li measures 181 x 129.6 inside
 * the dead end's 62ch column and 381.3 x 87.9 on the full-width empty state.
 */
function Departments({
  rayons,
  className = '',
}: {
  rayons: readonly RayonNav[]
  className?: string
}) {
  return (
    <ul
      className={`grid border-t border-rule sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 sm:border-t-0 lg:grid-cols-3 ${className}`}
    >
      {rayons.map((department, index) => (
        <li
          key={department.id}
          className="enter e-item border-b border-rule sm:border-t sm:border-b-0 sm:pt-5"
          style={{ '--enter-index': index } as React.CSSProperties}
        >
          <Link
            href={`/rayon/${department.slug}`}
            className="group block min-h-11 py-3.5 sm:min-h-0 sm:py-0"
          >
            <span className="flex items-baseline justify-between gap-4">
              <span className="draw-under text-body font-semibold tracking-[-0.01em] group-hover:text-secondary">
                {department.nom}
              </span>
              <span className="t-num shrink-0 text-micro text-ink-3">
                {formatAmount(department.compte)}
              </span>
            </span>
            <span className="mt-1.5 hidden text-micro leading-[1.6] text-ink-3 sm:block">
              {department.accroche ?? ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Arrived with nothing typed.
 *
 * Reachable in one way that matters: someone edited the address bar, or a stale
 * link dropped the parameter. The wrong answer is a results page for the empty
 * string, which would report zero references and read as a broken shop. The
 * right answer is the door the reader was heading for anyway, so this is the
 * twelve departments with their real counts and a way into the whole catalogue.
 *
 * A DEAD `?rayon=` IS STILL SAID HERE. `/recherche?rayon=vieux-slug` with no
 * query is exactly the shape a stale bookmark takes, and the reader who follows
 * it is owed the same sentence as the one who follows it with a query: the
 * department they named is gone, here are the ones that exist.
 */
function EmptyQuery({
  staleScope,
  rayons,
}: {
  staleScope: string | null
  rayons: readonly RayonNav[]
}) {
  return (
    <>
      <PageHeader
        title="Que cherchez-vous ?"
        lead="La recherche part de la barre en haut de page : tapez une référence, une marque ou un type de matériel, et les suggestions arrivent à partir de deux lettres. Sinon, entrez par un rayon."
      />

      <section className="shell pb-band" aria-label="Rayons">
        {staleScope ? (
          <StaleScope
            slug={staleScope}
            tail="Rien n’a encore été cherché, alors rien n’est perdu : voici les rayons qui existent."
          />
        ) : null}

        <Departments rayons={rayons} />

        <div className="mt-band flex flex-wrap gap-3">
          <Action href="/catalogue">
            Ouvrir le catalogue complet
            <IconArrowRight className="text-[1.0625rem]" />
          </Action>
          <Action href="/marques" variant="secondary">
            Toutes les marques
          </Action>
        </div>
      </section>
    </>
  )
}
