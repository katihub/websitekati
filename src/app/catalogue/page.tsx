import type { Metadata } from 'next'
import Link from 'next/link'

import { FamilyIndex } from '@/components/catalog/FamilyIndex'
import { FilteredListing, lireListeFiltree } from '@/components/catalog/FilteredListing'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProductMedia } from '@/components/product/ProductMedia'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { CatalogueIndisponible, lireNavigation } from '@/lib/catalogue-en-direct'
import { indexDesFamilles, rayonsOrdonnes } from '@/lib/catalogue-vues'
import { formatAmount, formatCount } from '@/lib/format'
import { CATALOGUE, countFilters, readListing, type ListingParams } from '@/lib/params'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'

/**
 * The catalogue.
 *
 * FOUR PLACES ON THE HOMEPAGE POINT HERE, and they point at two different
 * things. "Ouvrir le catalogue complet" means the merchandise; "Les 218
 * familles" and "Voir l'index complet" mean the map. This page is both, in that
 * order, because a reader who came for merchandise should not have to scroll a
 * directory to reach it, and a reader who came for the map arrives on the anchor
 * with the index already under their cursor.
 *
 * THE PAGE IS BUILT DOWNWARD IN DECREASING GRANULARITY: twelve departments, then
 * every reference in the shop with the four orderings, then the full index of
 * families. That is the same movement the homepage makes, from the curated to
 * the exhaustive, and it means the top of this page can be read in ten seconds
 * while the bottom of it can be read for ten minutes.
 *
 * NOTHING HERE IS EDITORIAL. Every figure is counted by the backend at the moment
 * of the request, every list is the result of a query stated on the page, and
 * the only ordering that claims anything is "Arrivage", the date the reference
 * was put online.
 *
 * A FILTERED CATALOGUE IS A DIFFERENT PAGE, AND IT LOSES TWO OF ITS THREE
 * SECTIONS. The twelve departments and the 218-family index describe the whole
 * shop; printed above and below a list narrowed to nine references they describe
 * something the reader is no longer looking at, and every count in them
 * contradicts the count in the middle. So the moment a filter is on, the page
 * opens directly on the results and the index becomes one line pointing back at
 * itself. The departments are not lost: they are the panel's first group, with
 * counts that are true of the current selection rather than of the shop.
 *
 * THE FILTERED STATES ARE NOT INDEXED. Eight dimensions over 12 departments, 218
 * families and 101 brands is a combinatorial space no crawler should be invited
 * into, and every one of those pages is a subset of a page that is already
 * indexed. `robots: noindex, follow` the moment a filter is on — follow, because
 * the products themselves are the pages worth reaching.
 *
 * WHAT THIS PAGE LOOKED LIKE ON A TELEPHONE, MEASURED AT 390 x 844 BEFORE THE
 * WORK BELOW: 1 504 words, 26 photographs, the first of them at y 1 536, and
 * 18 607 pixels tall. Twenty-two screens, of which the first two were type and
 * the last fourteen were the family index unrolled. A shop whose whole argument
 * is that it holds 4 254 things you can look at opened with 371 words and no
 * merchandise, and the client read that back as "on a l'impression de ne pas
 * tomber sur l'essentiel".
 *
 * THE ANSWER IS THE CATALOGUE'S OWN PHOTOGRAPHY, NOT ILLUSTRATION. Every one of
 * the twelve departments has a pinned hero product with a real packshot behind
 * it — the navigation carries it as `image` — so the twelve doors at the top of
 * this page are now twelve photographs of things this shop actually sells,
 * taken from the same library the grid below them is drawn from. Nothing was
 * downloaded, generated or licensed to make that happen.
 *
 * AND WHAT IT MEASURES NOW, SAME BROWSER, SAME 390 x 844: 726 words, 38
 * photographs, the first of them at y 327 — inside the first screen, under the
 * head, with the second and a slice of the third beside it — and 9 872 pixels
 * tall against 20 321. Twelve screens instead of twenty-four, and the half of
 * them that was a directory unrolled is now twelve folded rows: the index went
 * from 11 743 pixels to 1 731, and the merchandise, 5 768 pixels of it, is the
 * biggest thing on the page, which is the only ordering a shop can defend.
 *
 * THE POINTER WAS NOT ASKED TO PAY FOR ANY OF IT. At 1 440 the page measured
 * 11 236 pixels before and 11 326 after — ninety pixels, the difference between
 * twelve rows of type and twelve photographs — with the same three-column
 * index, the same panel, and the first photograph up from y 1 286 to y 445.
 */

interface Params {
  searchParams: Promise<ListingParams>
}

/* `searchParams` AVANT LA NAVIGATION, DANS LES METADONNEES COMME DANS LA PAGE.
   C'est lui qui fait rendre /catalogue a la demande. Lu apres, il laissait le
   build prerendre la page jusqu'a la premiere lecture : le build appelait le
   backend, et echouait avec lui quand il ne repondait pas. */
export const generateMetadata = metadonneesAvecPanne(async function generateMetadata({ searchParams }: Params): Promise<Metadata> {
  const params = await searchParams
  const nav = await lireNavigation()
  const { filters } = readListing(params, nav, CATALOGUE)
  const filtered = countFilters(filters) > 0

  return {
    title: 'Le catalogue',
    // THE COUNT IS READ, NOT WRITTEN, AND IT USED TO BE WRITTEN. This sentence
    // said "4 254 références" as a literal, which was true on the day it was
    // typed and stopped being true the first time the catalogue synchronised
    // itself: the page then announced 4 268 in its own heading while this tag
    // told search engines 4 254. From the moment the source of the data is a
    // timer rather than a person, every hard-coded fact about the data is a
    // future lie, and this was the only one left in the metadata.
    description:
      `Les ${nav.nombreProduits.toLocaleString('fr-FR')} références NowTech Center, ` +
      'rayon par rayon et famille par famille : informatique, réseau, ' +
      'sécurité électronique, impression, énergie et électroménager.',
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
})

export default avecPanneCatalogue(async function CataloguePage({ searchParams }: Params) {
  const params = await searchParams
  const nav = await lireNavigation()
  const lecture = await lireListeFiltree({ nav, params, place: CATALOGUE })
  // No scope, so a 404 from the backend has already been turned into an error.
  if (!lecture) throw new CatalogueIndisponible('/catalogue/liste', 'liste absente')
  const { liste } = lecture

  const productCount = nav.nombreProduits
  const familyCount = nav.nombreFamilles
  const filtering = liste.active > 0

  /**
   * The twelve doors, with a photograph each.
   *
   * The packshot is the navigation's `image`: the pinned hero of the department,
   * falling back on the backend to the newest photographed product it holds, so
   * no tile can come out empty while the department has stock. Resolved once,
   * above the return, because it is the same twelve whether a filter is on or
   * not.
   */
  const shelf = rayonsOrdonnes(nav).map((rayon) => ({
    id: rayon.id,
    slug: rayon.slug,
    name: rayon.nom,
    totalCount: rayon.compte,
    image: rayon.image,
  }))

  return (
    <>
      <PageHeader
        title={
          filtering
            ? 'Le catalogue, réduit à ce que vous avez demandé'
            : 'Tout ce que le magasin tient, en une page'
        }
        lead={
          filtering
            ? `${formatCount(liste.total, 'référence')} sur ${formatAmount(productCount)} ${liste.total < 2 ? 'répond' : 'répondent'} à ${formatCount(liste.active, 'filtre')}. Cette adresse porte la sélection entière : copiez-la, elle rouvrira exactement cette liste chez quelqu’un d’autre.`
            : /* THE SECOND SENTENCE WENT, AND IT WAS THE INSTRUCTIONS. "Descendez
                 pour les parcourir, ou ouvrez l'index si vous savez déjà ce que
                 vous cherchez" is two lines at 390 telling a reader to do the
                 thing the shelf immediately under it already invites, and those
                 two lines are 44 pixels between the page and its first
                 photograph. What is left is the only sentence that carries a
                 fact. */
              `Douze rayons, ${familyCount} familles et ${formatAmount(productCount)} références, exactement telles qu’elles sont rangées au comptoir.`
        }
        aside={
          filtering
            ? `${formatAmount(liste.total)} / ${formatAmount(productCount)}`
            : `${formatAmount(productCount)} références`
        }
      />

      {/* The twelve, before anything else. A reader who knows their department
          should never have to meet 4 254 products to reach 845 of them. Under a
          filter they are gone: twelve counts describing the whole shop, printed
          above a list of nine, are twelve numbers contradicting the one that
          matters. They come back as the panel's first group, counted against the
          selection. */}
      {filtering ? null : (
        <section className="shell" aria-label="Les douze rayons">
          {/**
           * THE TWELVE DOORS ARE PHOTOGRAPHS NOW, AND THAT IS THE WHOLE POINT OF
           * THIS BLOCK. What stood here was twelve rows of type: a name, a
           * count, and under `sm` a two-line gloss. 624 pixels on a phone, which
           * was cheap, and the reason the first picture on this page arrived at
           * y 1 536 — a shop with 4 215 packshots opened on a table of contents.
           *
           * Each door shows its department's pinned hero product, which is the
           * same photograph the homepage's deck opens that department with, so
           * the two pages agree about what a rayon looks like. A real switch
           * standing for "Réseaux, Switchs & Routeurs" is worth more than any
           * stock photograph of an office, it costs nothing, it raises no
           * licence, and it is true.
           *
           * ON A PHONE IT IS A SHELF, NOT A COLUMN. Twelve tiles stacked one per
           * row would be 2 600 pixels and would put the merchandise below three
           * screens of navigation; twelve tiles on a rail are 220 and the reader
           * flicks through them the way they would along a shelf. The rail
           * bleeds through the shell's gutter to both edges of the screen so the
           * next tile is CUT by the screen rather than by a margin, which is the
           * only honest way to say "there is more this way"; `scroll-pl` puts
           * the snapped tile back on the page's own left edge, so a tile that
           * has come to rest lines up with the heading above it.
           *
           * THE CARD IS 156 WIDE AND THAT NUMBER IS MEASURED TWICE. At 390 the
           * gutter is 7.5vw = 29.25, so a rail of 156-wide tiles with a 12 gap
           * shows two whole tiles and 25 pixels of the third: enough to read as
           * a cut edge, not enough to read as a third column. And 156 is what
           * the longest name needs — "Onduleurs, Régulateurs & Énergie" is 32
           * characters and sets on two lines at 13px there, where at 140 it
           * needed three and the clamp ate the last word of half the twelve.
           *
           * FROM `sm` IT IS A GRID AND THE RAIL IS GONE: no overflow, no snap,
           * no negative margin. Three columns, then four, then six from `lg`, so
           * the twelve are two rows under a pointer.
           */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-6 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-6">
            {shelf.map((department, index) => (
              <li
                key={department.id}
                /* THE ENTRANCE IS ON THE LIST ITEM, NOT ON THE LINK. `Reveal`
                   stamps `data-enter="in"` on every `.enter` it finds and its
                   first sweep runs before this segment has attached, so whichever
                   element carries the class is reported as a hydration mismatch;
                   the page reported exactly one before this block was touched and
                   reports exactly one now. Carried on the `li` it is at least on
                   the element `ProductCard` and the department list it replaces
                   both put it on, so `.enter .e-media` and `.enter .sheen::after`
                   resolve the way they do everywhere else on the site. */
                className="group enter w-[9.75rem] shrink-0 snap-start sm:w-auto sm:shrink"
                style={{ '--enter-index': index } as React.CSSProperties}
              >
                <Link href={`/rayon/${department.slug}`} className="block">
                  {/* The same three layers a product card uses, and for the same
                      reason: `.plate > *` needs exactly one child, the sheen
                      wipes the well open, and the well itself is `ProductMedia`,
                      which carries the shimmer and the "Photo à venir" fallback
                      so a department whose hero has lost its file degrades to a
                      labelled frame instead of a hole. */}
                  <div className="plate mb-3">
                    <div className="sheen relative overflow-hidden rounded-well">
                      <ProductMedia
                        src={department.image}
                        // The department is named in type immediately under the
                        // picture. Naming the hero product here would make a
                        // screen reader announce a switch model nobody asked
                        // about before the word "Réseaux".
                        alt=""
                        sizes="(min-width: 1280px) 12rem, (min-width: 640px) 22vw, 156px"
                        // THE FIRST THREE ARE THE LARGEST CONTENTFUL PAINT ON
                        // THIS PAGE NOW. Two of them are on screen at 390 and
                        // four at 1440, and everything below is a scroll away.
                        priority={index < 3}
                      />
                    </div>
                  </div>
                  <span className="clamp-2 draw-under block h-[2.8em] text-small font-semibold leading-[1.4] tracking-[-0.01em] group-hover:text-secondary">
                    {department.name}
                  </span>
                  <span className="t-num mt-1 block text-micro text-ink-3">
                    {formatAmount(department.totalCount)} réf.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* `data-results` is what ScrollOnQuery carries the reader back to when a
          filter, a sort or a page number changes the set under them. It is on
          the section rather than on the grid so the heading and the count, which
          are what actually answer the tap, arrive on screen first. The anchor
          belongs to the page and not to `FilteredListing`, because each page
          decides what heads its results. */}
      <section data-results className={`shell ${filtering ? '' : 'mt-band'}`}>
        <SectionHeader
          title={filtering ? 'Les références retenues' : 'Toutes les références'}
          context={
            filtering ? (
              /**
               * THE ARITHMETIC OF THE PANEL IS A POINTER SENTENCE, AND ON A
               * PHONE IT WAS 208 PIXELS ABOVE THE MERCHANDISE. Measured at 390
               * on `?rayon=reseaux-switchs-routeurs&stock=1`: the head's lead is
               * 132 pixels, this paragraph 208, the filter bar 73, and the first
               * packshot landed at y 878 — thirty-four pixels below a fold this
               * whole page has just been rebuilt to get above. The three
               * sentences doing the damage describe how the counts INSIDE the
               * panel combine, and on a phone THE PANEL IS NOT ON THE PAGE: it
               * is behind the "Filtrer et trier" button, in a sheet the reader
               * has not opened. Explaining a control nobody can see, above the
               * goods they came for, is the fault the client named.
               *
               * The first sentence stays at every width, because it is the one
               * that prevents a misreading of the numbers the reader meets the
               * second the sheet opens. The rest is `hidden sm:inline`, so from
               * 640 up the paragraph is word for word what it was, and the
               * desktop measured identical: 884 words, first packshot at y 813,
               * 5 753 pixels tall, before and after.
               */
              <>
                Chaque compte du panneau est calculé contre les autres filtres déjà posés, jamais
                contre le magasin entier : c’est la taille de cette valeur seule.
                <span className="hidden sm:inline">
                  {' '}
                  Cochez-en une dans un groupe et c’est exactement la liste que vous obtenez ;
                  cochez-en une seconde dans le même groupe et la liste réunit les deux, donc elle
                  s’élargit. Une valeur qui ne donnerait rien, ou qui rendrait exactement la liste
                  déjà affichée, n’est pas proposée : le panneau ne montre que ce qui change quelque
                  chose.
                </span>
              </>
            ) : (
              'Le catalogue entier, dans l’ordre que vous choisissez. « Arrivage » classe par date de mise en ligne de la photographie, seule date que l’export porte.'
            )
          }
          action={filtering ? undefined : { href: '#index', label: `Les ${familyCount} familles` }}
        />

        <FilteredListing liste={liste} nav={nav} priorityCount={filtering ? 3 : 0} />
      </section>

      {/* `scroll-mt` because the masthead is sticky: without it the anchor puts
          the heading exactly under the green bar that covers it.

          AND 112 IS THE HEIGHT OF THE BAR, NOT A LANDING. Measured at 360: the
          masthead pins at exactly 112 pixels and `scroll-mt-28` is 112, so
          "Les 218 familles" put the heading's box at y 112.2 — its ascenders
          touching the green edge, with no air at all between the bar and the
          word under it. `scroll-mt-32` is 128 and leaves 16, the same gutter the
          page uses everywhere else. `lg:scroll-mt-28` keeps the pointer on the
          number it was measured with. */}
      <section id="index" className="shell mt-band pb-band scroll-mt-32 lg:scroll-mt-28">
        <SectionHeader
          title="L’index des familles"
          context={
            filtering
              ? `L’index décrit le magasin entier, pas la sélection ci-dessus. Le montrer sous une liste filtrée reviendrait à répondre à une question que vous n’avez pas posée.`
              : `Les ${familyCount} familles où le magasin tient effectivement du stock, classées par profondeur sous leur rayon. Le nombre est celui des références en catalogue.`
          }
        />

        {filtering ? (
          <p className="enter e-text max-w-[62ch] text-small leading-[1.65] text-ink-2">
            <Link href="/catalogue#index" className="draw-under font-semibold text-secondary hover:text-secondary">
              Ouvrir l’index des {familyCount} familles
            </Link>{' '}
            efface la sélection en cours. Pour rester dedans, le groupe « Famille » du panneau
            propose les familles les plus fournies de ce que vous avez déjà retenu.
          </p>
        ) : (
          <FamilyIndex departments={indexDesFamilles(nav)} />
        )}
      </section>
    </>
  )
})
