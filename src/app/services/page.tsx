import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { IconPhone } from '@/components/brand/Icons'
import { PageHeader } from '@/components/layout/PageHeader'
import { Packshot } from '@/components/product/Packshot'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Action } from '@/components/ui/Action'
import { dialable } from '@/constants/site'
import { PHOTO_NOTE, TRADES, isPrestation, readable, tradeOf } from '@/constants/services'
import {
  CatalogueIndisponible,
  lireListe,
  lireNavigation,
  lirePointsVenteOuVide,
} from '@/lib/catalogue-en-direct'
import { categorieParSlug, rayonParId, trierServices } from '@/lib/catalogue-vues'
import { pickupLine, shopPhones, shopWhatsapp, whatsappHref } from '@/lib/comptoirs'
import type { CarteProduit } from '@/types/catalogue'
import { capitalise, formatCount, formatPrice, formatWords } from '@/lib/format'
import { avecPanneCatalogue } from '@/lib/panne-catalogue'

export const metadata: Metadata = {
  // The tab in the green band says "Services", so the browser tab and the
  // search result say it too. The h1 below is the one that draws the boundary.
  title: 'Services',
  description:
    'Les prestations de l’atelier NowTech : vidéosurveillance, réseau, contrôle d’accès, ' +
    'onduleurs et solaire. Une prestation se chiffre après un relevé sur site, elle ne se ' +
    'met pas au panier. Le matériel, lui, est au catalogue.',
}

/**
 * `/services`, the page that sells WORK, and the one page on this site with no
 * way into the basket.
 *
 * THE COMPLAINT THIS REWRITE ANSWERS, in the shop owner's own words: "on ne peut
 * pas avoir le même détaillé des produits aux services, le panier sert à ce
 * moment à quoi, je ne comprends plus". He is right, and the fault was ours.
 * This page used to print nineteen prestations as a price list in which EVERY
 * ROW LINKED TO `/produit/<slug>`, and a product sheet carries an Ajouter au
 * panier button. So the site said, in the same breath, that an installation of
 * fire detectors is quoted after a site survey and that you may put it in a
 * basket for 45 000 FCFA. Then it printed fourteen laptops, printers and a drone
 * underneath. Nobody can hold that shape in their head, and a customer who
 * cannot tell what the basket is for stops using it for the things it IS for.
 *
 * THE FIX IS A CUT, NOT A LAYOUT. Not one link on this page reaches a product
 * sheet. A prestation row opens WhatsApp with the request already written,
 * because a site survey is arranged by a human and always was: the product
 * sheets for these nineteen records still exist and are still reachable from
 * `/rayon/services-occasion` and from search, which is where a record that has a
 * basket button belongs.
 *
 * THE SECOND CUT IS THE FOURTEEN PIECES OF HARDWARE. They are gone from the
 * page as a list and stated as a fact, with the count and the way through to the
 * department. Printed as rows they were the confusion itself; deleted in silence
 * they would look like an omission, and four of them are not even in the Services
 * & Occasion department: they are filed under GPS Tracker, Imprimantes EPSON and
 * Laptop HP, so "go and see them next door" had to become "go and see the
 * department, and search for the rest".
 *
 * NOT ONE PRESTATION, RATE, DELAY OR GUARANTEE IS INVENTED HERE. Every row is a
 * record from the export and every figure is that record's own price. The
 * sentences this page adds are each already asserted elsewhere in this repository
 * and are quoted rather than rewritten, so they cannot drift:
 *   - what the workshop installs, and that a prestation is quoted after a site
 *     survey: `constants/assistant.ts`, the `installation` topic, which is also
 *     what Bod answers on every page of this site;
 *   - that a list of material comes back as a facture proforma: the same file,
 *     the `devis` topic, and `/devis` itself;
 *   - that nothing is paid online: `constants/site.ts`, `PAYMENT_METHODS`, whose
 *     five entries are cash, two mobile-money wallets and a bank transfer;
 *   - where the counters are: the panel's points of sale, put in words by
 *     `pickupLine` in `lib/comptoirs`, exactly as the utility strip and the
 *     service band do;
 *   - that WhatsApp is where this shop is reached: the same file, and the
 *     showroom band on the homepage.
 * No lead time appears anywhere below. The record names carry the supplier's own
 * "Express" and "Rapide"; the page never turns those into a promise of its own.
 *
 * TWO CLAIMS WERE CUT FROM THIS PAGE FOR HAVING NO SOURCE AT ALL, and both read
 * as harmless until you look for the file that backs them:
 *   - "les équipes interviennent sur site à Douala et à Yaoundé", in the lead and
 *     in the meta description. Nothing in this repository says where a technician
 *     travels. The panel's points of sale say where the counters ARE and `DELIVERY_CITIES`
 *     says where a parcel goes; neither is a service area, and inventing one on a
 *     page whose whole point is that it does not invent is the worst place to do
 *     it. The counters are stated instead, from the panel's list, which is true.
 *   - "le prix dépend du nombre de points, des distances et de l'état de
 *     l'existant". Plausible, unsourced, and a price list in disguise: it tells a
 *     reader that distance is billed. `assistant.ts` says only that the prestation
 *     is quoted after a site survey, so that is all this page says.
 *
 * The nameless record is dropped. A row with no name is not a service the shop
 * declines to describe, it is a hole in the export.
 *
 * ---------------------------------------------------------------------------
 * THE SECOND COMPLAINT, AND THE SECOND REWRITE: "visuellement c'est fade", "on
 * a l'impression de ne pas tomber sur l'essentiel".
 *
 * MEASURED AT 390 x 844 BEFORE THIS PASS: 679 words, ZERO images, 5 680 pixels
 * tall. The most text and the least picture of any page on this storefront, and
 * the numbers say why it reads as fade: a reader arrived at a wall of type and
 * had to travel six and a half screens through it to learn that this shop knows
 * how to run cable. The five trades were the answer to his question and they
 * were buried in prose he had no reason to finish.
 *
 * WHAT CHANGED, IN THREE MOVES.
 *
 * 1. THE LEAD IS NOW THE SOURCE SENTENCE AND NOTHING ELSE. It ran to 55 words
 *    and its last two sentences restated, in the reader's first screen, exactly
 *    what the green rail one screen later says with a heading and a button:
 *    that a prestation is not put in a basket. Saying it twice did not make it
 *    twice as clear, it made the top of the page an essay. The lead is now the
 *    `installation` answer from `constants/assistant.ts` verbatim, both
 *    sentences of it, which is the one public claim this shop makes about its
 *    own workshop and the same words Bod speaks on every page of this site.
 *    26 words. The panier boundary is not lost: it is the rail's own heading.
 *
 * 2. THE FIVE TRADES COME FIRST, AS PICTURES, AND ON A PHONE THEY SCROLL
 *    SIDEWAYS. A shelf and not a stack, because a stack of five photographs is
 *    five screens of scrolling before the second one and the whole complaint
 *    was about scrolling past the essential. It is a shelf in the strict sense
 *    the house rule sets: it snaps, it lets the next card show past the right
 *    edge so the eye knows there is a sixth thing to reach for, it contains its
 *    own overscroll so a horizontal flick never steals the page's vertical
 *    travel, and it exists ONLY below `md`. From `md` it is a grid, three then
 *    five across, because a desktop reader comparing five trades wants them all
 *    on one line and a mouse has no inertia to flick with. Each tile jumps to
 *    that trade's own list further down, so the five headings are one gesture
 *    away instead of 679 words away.
 *
 * 3. THE PICTURES ARE THE ONLY DOWNLOADED PHOTOGRAPHS ON THIS STOREFRONT, and
 *    `constants/services.ts` carries the whole argument for why this page is
 *    the exception and what the five are forbidden from showing. The short
 *    version: the workshop sells labour, labour has no packshot, and the
 *    fourteen pieces of hardware that share the supplier's term are the exact
 *    confusion this page was written to remove. `PHOTO_NOTE` prints under the
 *    shelf so no reader can take a stock camera wall for the counter in Akwa.
 *
 * WHAT DID NOT CHANGE, AND WAS NOT ALLOWED TO. Not one prestation, rate, delay,
 * guarantee or service area is added by this pass. Not one link on this page
 * reaches `/produit`. The nineteen rows still open WhatsApp with the request
 * already written, the rail still hands over two telephone numbers and the
 * counters the panel publishes, and the fourteen pieces of hardware are
 * still stated as a fact and not printed as a list.
 */

/** The one message this page sends, wherever it is sent from. */
function surveyHref(whatsapp: string, subject?: string): string {
  const message = subject
    ? `Bonjour, je voudrais un relevé sur site pour : ${readable(subject)}`
    : 'Bonjour, je voudrais un relevé sur site pour une installation.'
  return whatsappHref(whatsapp, message)
}

/**
 * Cheapest first inside every trade, which is the one ordering a reader can
 * check against the department without trusting us.
 *
 * `trierServices` sorts by a narrower version of the prestation test and then by
 * price, so a row it did not recognise fell to the bottom whatever it cost: the
 * menuiserie line at 5 000 FCFA printed after the automotive one at 100 000.
 * Sorting again here is not a second opinion about what a service is, it is the
 * same list with the ranking key removed.
 */
const byPrice = (a: CarteProduit, b: CarteProduit) => a.prix - b.prix

/** "les traceurs GPS, les imprimantes EPSON et les portables HP", in French. */
const listFrench = new Intl.ListFormat('fr-FR', { style: 'long', type: 'conjunction' })

/**
 * Every record under the supplier's term, however many pages the backend cuts it into.
 *
 * 96 is the backend's ceiling per page and the term holds thirty-three
 * records, so this is one call today. The loop is there for the day it holds
 * more: a services page that silently stops at 96 rows would be a price list
 * with a hole in it that nobody can see.
 *
 * FOR THE SAME REASON, A PAGE THAT DOES NOT COME BACK IS A FAILURE, NOT AN EMPTY
 * PAGE. This used to read a missing term as "no services" and a missing second
 * page as "no more rows": renamed in the panel, `nos-services` would have drawn
 * the atelier with no prestation under it, and a page lost between two reads
 * would have dropped its rows without a word. Both now throw, and the page says
 * the catalogue did not answer instead of printing a shorter price list.
 *
 * The term and its pages are the shop's own, never the reader's, so the backend
 * does not count them against anyone.
 */
async function lireServices(): Promise<CarteProduit[]> {
  const filtres = { familles: ['nos-services'], parPage: 96 } as const
  const lirePage = async (page: number) => {
    const lue = await lireListe(page === 1 ? filtres : { ...filtres, page }, 'vitrine')
    if (!lue) {
      throw new CatalogueIndisponible('/catalogue/liste', `famille nos-services introuvable (page ${page})`)
    }
    return lue
  }
  const premiere = await lirePage(1)
  const suivantes = await Promise.all(Array.from({ length: premiere.pages - 1 }, (_, i) => lirePage(i + 2)))
  return [premiere, ...suivantes].flatMap((page) => page.produits)
}

export default avecPanneCatalogue(async function ServicesPage() {
  // No search parameters and no cookie: without this the page would be
  // prerendered at build and the build would call the backend.
  await connection()
  /* THE COUNTERS ARE READ TOLERANTLY. They are one sentence at the foot of the
     green rail, already left out when the list is empty; a counter list that
     did not load is no reason to replace the whole price list with the error
     page. The prestations are the page, and their read stays strict. */
  const [nav, services, pointsVente] = await Promise.all([
    lireNavigation(),
    lireServices(),
    lirePointsVenteOuVide(),
  ])
  const pickup = pickupLine(pointsVente)
  const whatsapp = shopWhatsapp(pointsVente)
  const rows = trierServices(services).filter((row) => row.nom.trim().length > 0)
  const prestations = rows.filter((row) => isPrestation(row.nom))
  const material = rows.filter((row) => !isPrestation(row.nom))
  const rayon = rayonParId(nav, 'services')

  /**
   * THE FAMILIES THAT CARRY THE SUPPLIER'S TERM WITHOUT LIVING UNDER IT, READ
   * OFF THE RECORDS RATHER THAN TYPED OUT.
   *
   * Four of the fourteen pieces of hardware are filed elsewhere as their primary
   * category: GPS Tracker, Imprimantes EPSON, Laptop HP. This page used to name
   * those three in prose, which was true on the day it was written and is a
   * claim about somebody else's data every day after. `categorieNom` on the
   * summary IS the primary category, so the sentence now rebuilds itself: a
   * re-export that refiles a record changes the sentence, and one that refiles
   * all of them deletes it.
   *
   * The term's own name comes from the catalogue and not from a literal, so the
   * comparison cannot start matching everything the day someone renames it.
   */
  const termName = categorieParSlug(nav, 'nos-services')?.nom ?? null
  const elsewhere = [...new Set(material.map((row) => row.categorieNom))]
    .filter((name): name is string => name !== null && name !== termName)
    .sort((a, b) => a.localeCompare(b, 'fr'))

  // A heading is drawn only when records fell under it. Five trades is the rule,
  // never the promise: if the export stops carrying camera work, the camera
  // heading stops being printed rather than standing over an empty column.
  const groups = TRADES.map((trade) => ({
    trade,
    rows: prestations.filter((row) => tradeOf(row.nom).id === trade.id).sort(byPrice),
  })).filter((group) => group.rows.length > 0)

  return (
    <>
      <PageHeader
        title="Ce que fait l’atelier"
        /* THE `installation` ANSWER FROM `constants/assistant.ts`, WORD FOR
           WORD, AND THE TWO SENTENCES THAT USED TO FOLLOW IT ARE GONE. They
           said that this page sells nothing and that the basket is for
           material, which is true, sourced, and already the heading and the
           first paragraph of the green rail one screen below. Printed twice it
           cost 29 of the 55 words a phone reader had to cross before the page
           showed him anything, and it pushed the first photograph 220 pixels
           further down a 844-pixel screen. Once is enough, and the rail is
           where it lands hardest because that is where the button is. */
        lead="L’atelier installe et configure ce qu’il vend : vidéosurveillance, réseau, contrôle d’accès, onduleurs et solaire. La prestation se chiffre après un relevé sur site."
        aside={prestations.length > 0 ? formatCount(prestations.length, 'prestation') : undefined}
      />

      {/* THE SHELF OF TRADES, AND IT IS THE FIRST THING UNDER THE TITLE ON
          PURPOSE.

          The question this page is opened with is "savez-vous faire ceci", and
          for six months the answer was 679 words below the fold. Five
          photographs answer it in the first screen: measured at 390 x 844, the
          first one now lands at y=440 with 34 words in front of it, where the
          page used to carry 679 words and no picture at all.

          It is drawn from `groups` and not from `TRADES`, so a heading that has
          no records under it has no tile either. The rule is the same one the
          lists below already follow: a trade is a heading over records that
          exist, never a promise. */}
      {groups.length > 0 ? (
        <section className="shell">
          <SectionHeader title="Les métiers de l’atelier" />

          {/* THE RAIL, AND EVERY CLASS ON IT IS LOAD-BEARING BELOW `md`.

              `snap-x snap-mandatory` with `snap-start` on the tiles so a flick
              lands a card against the gutter instead of halfway off it.
              `overscroll-x-contain` so a horizontal gesture that runs out of
              rail stops there rather than being handed to the page, which on
              iOS is what turns a shelf into a back-navigation. `no-scrollbar`
              because the peeking sixth of the next card is the affordance, not
              a grey bar.

              THE BLEED IS WRITTEN `mx-[calc(var(--gutter)*-1)]`, NOT WITH THE
              MINUS PREFIX. `-mx-[var(--gutter)]` compiles to nothing in this
              Tailwind, which is a bug this repository has already paid for
              once. The pair of it, `px-[var(--gutter)]`, puts the first card
              back on the page's own left edge, and `scroll-px` makes the snap
              stop there too rather than under the gutter.

              FROM `md` IT IS A GRID AND NONE OF THAT SURVIVES. Every rail class
              is undone by name: `md:mx-0 md:px-0 md:overflow-visible`. A
              desktop reader comparing five trades wants five on one line, and
              Tailwind being mobile-first, an un-prefixed class here would have
              shipped the phone's rail to 1440 as well. */}
          <ul className="no-scrollbar mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-4 overflow-x-auto overscroll-x-contain px-[var(--gutter)] md:mx-0 md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-10 md:overflow-visible md:px-0 lg:grid-cols-5">
            {groups.map((group, index) => (
              // 70vw is 273 pixels at 390. Measured, that leaves 72 pixels of
              // the second card showing past the right edge: enough to read as
              // a card there is more of, rather than as a rendering fault. The
              // cap stops the same tile becoming a 500-pixel poster on a
              // 720-wide tablet just under `md`.
              <li
                key={group.trade.id}
                className="w-[70vw] max-w-[19rem] shrink-0 snap-start md:w-auto md:max-w-none"
              >
                <Link
                  href={`#metier-${group.trade.id}`}
                  style={{ '--enter-index': index } as React.CSSProperties}
                  className="group enter block"
                >
                  {/* 4:5. A portrait tile is 341 pixels tall at 273 wide, so
                      the first photograph runs from y=440 to y=781 and its
                      caption closes inside the 844-pixel screen: the reader
                      sees one whole thing rather than the top of five. A wider
                      3:2 frame fits too, and shows a third as much picture.
                      `rounded-space` and not `well`, because at this size the
                      tile is a panel rather than a chip.

                      NO PADDING ON THIS BOX. `Packshot` fills it, and `fill`
                      insets to the padding box, so padding here would push the
                      photograph out of its own frame. */}
                  <span className="e-media relative block aspect-[4/5] overflow-hidden rounded-space bg-space">
                    {/* `Packshot` AND NOT A BARE `next/image`, THOUGH THESE ARE
                        NOT PACKSHOTS. What it owns is the shimmer, and the
                        reason the shimmer exists applies here twice over: this
                        audience is on a phone connection and a tile that is
                        blank until the photograph lands reads as a page that
                        failed, not as a page that is loading. The component
                        takes a className, so the fit is ours: `object-cover`,
                        since these five are 3:2 and 2:3 and the frame is 4:5.

                        Only the first is `priority`. It is the page's LCP
                        candidate on a phone; the other four are off the right
                        edge of the rail and preloading them would spend the
                        reader's data on cards he may never flick to. */}
                    <Packshot
                      src={`/metiers/${group.trade.photo.file}`}
                      alt={group.trade.photo.alt}
                      sizes="(max-width: 767px) 70vw, (max-width: 1023px) 31vw, 19rem"
                      priority={index === 0}
                      className="object-cover transition-transform duration-[var(--t-base)] ease-[var(--ease-brand)] group-hover:scale-[1.05]"
                    />
                  </span>

                  <span className="e-item mt-4 block">
                    {/* TWO LINES RESERVED FROM `md`, AND ONLY FROM `md`. Two of
                        the five labels wrap at 225 pixels and three do not, so
                        in a row of five the counts sat on three different
                        baselines and the band read as five loose captions
                        rather than one shelf. 2.7em is two lines of this
                        leading. Below `md` the tiles are read one at a time as
                        the rail passes them, nothing is compared to anything,
                        and a reserve there would only be white. */}
                    <span className="block text-small font-semibold leading-[1.35] text-pretty transition-colors duration-[var(--t-fast)] group-hover:text-secondary md:min-h-[2.7em]">
                      {group.trade.label}
                    </span>
                    <span className="t-num mt-1 block text-micro text-ink-3">
                      {formatCount(group.rows.length, 'ligne')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* THE CAPTION THAT STOPS FIVE PHOTOGRAPHS FROM BECOMING FIVE CLAIMS,
              and the credit that makes the licence checkable. The names are
              read off the tiles actually drawn, so a trade that lost its
              records loses its credit line with it rather than crediting a
              photograph nobody can see. `PHOTO_NOTE` is the sentence itself,
              kept beside the files it describes. */}
          <p className="mt-6 max-w-[62ch] text-micro leading-[1.6] text-ink-3">
            {PHOTO_NOTE} Clichés de{' '}
            {listFrench.format(groups.map((group) => group.trade.photo.author))}.
          </p>
        </section>
      ) : null}

      {/* THE BUY BOX OF A PAGE THAT DOES NOT SELL. It sits where a product sheet
          puts its basket button, on purpose: the reader arriving from a tab
          marked Services is looking for the control that starts things, and
          finding a telephone number there instead of a basket is the whole
          answer to "le panier sert à quoi". The dark rail is the same block the
          homepage already uses to hand over a number. */}
      {/* The band above it is the shelf, and the band above THAT is the page
          header, whose own bottom padding used to be all the air this block
          needed. With a section between them the rail owes itself a `band`,
          and owes itself nothing when the shelf did not draw. */}
      <section
        className={`shell ${groups.length > 0 ? 'mt-band' : ''} ${groups.length === 0 && material.length === 0 ? 'pb-band' : ''}`}
      >
        {/* UN TIERS DE REMBOURRAGE EN MOINS, COMME PARTOUT AILLEURS : 24/40/48
            deviennent 20/28/32. C'est le seul grand panneau plein du site, donc
            c'est le seul endroit ou quarante-huit pixels de vert vide faisaient
            le tour d'un paragraphe. */}
        <div className="on-rail enter rounded-space bg-rail p-5 text-rail-ink sm:p-7 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div>
              <h2 className="text-sub font-semibold leading-[1.2] tracking-[-0.02em] text-balance">
                Une prestation ne se met pas au panier
              </h2>
              <p className="e-text mt-4 max-w-[54ch] text-small leading-[1.65] text-pretty text-rail-ink-2">
                Vous décrivez le besoin, un technicien passe, le comptoir renvoie une facture
                proforma. Le chiffre vient de ce relevé et de rien d’autre : un chantier ne se
                devine pas depuis un écran. Rien ne se paie en ligne, ici pas plus qu’ailleurs
                sur ce site.
              </p>

              {/* THE OTHER HALF OF "COMMENT JE VOUS FAIS VENIR" IS QUE JE PASSE
                  VOUS VOIR, and this page was the only one of the three that
                  hands over a number without saying where the number sits. The
                  line is `pickupLine`, not a retyping of it: the utility strip
                  and the service band had each formatted their own version of
                  these districts and had already drifted apart once. The count
                  is the panel's too; "Trois" typed here would have outlived a
                  closed counter the way "Bonapriso" did. */}
              {pickup ? (
                <p className="mt-4 text-small leading-[1.65] text-rail-ink-2">
                  {capitalise(formatWords(pointsVente.length))}{' '}
                  {pointsVente.length > 1 ? 'comptoirs' : 'comptoir'}, si vous préférez passer :{' '}
                  {pickup}.
                </p>
              ) : null}
            </div>

            {/* Two ways to start, and the second is not a fallback: in this
                market the number is dialled at least as often as the message is
                written. Both take a 44px line box below sm, where they are the
                only controls on the screen. */}
            <div className="flex flex-col gap-6 lg:items-start">
              {/* `on-rail` and not the default: --accent on the green band is
                  1.34:1, which is not a button, it is a rumour. The variant
                  inverts the roles, white ground and rail-coloured label.

                  TARGET AND REL, BECAUSE `Action` RENDERS A BARE `next/link` AND
                  ADDS NEITHER. The nineteen rows below already open WhatsApp in
                  a new tab; this control, the biggest one on the page, was
                  taking the whole tab with it, so the primary action was the one
                  that lost the reader his place. `/recherche` passes the same
                  two props to the same component for the same absolute wa.me
                  URL, and this is now the same control everywhere. */}
              {whatsapp ? (
                <Action href={surveyHref(whatsapp)} variant="on-rail" target="_blank" rel="noopener noreferrer">
                  Demander un relevé sur site
                </Action>
              ) : null}

              <ul className="flex flex-wrap gap-x-8 gap-y-2">
                {shopPhones(pointsVente).map((phone) => (
                  <li key={phone}>
                    <a
                      href={`tel:${dialable(phone)}`}
                      className="t-num flex min-h-11 items-center gap-2.5 text-small text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary sm:min-h-0"
                    >
                      <IconPhone className="text-[1rem]" />
                      {phone}
                    </a>
                  </li>
                ))}
              </ul>

              <p className="max-w-[42ch] text-small leading-[1.6] text-rail-ink-2">
                Une liste de matériel à chiffrer, elle, se prépare ici et repart en proforma :{' '}
                {/* A drawn underline only appears on hover, and this link sits
                    on a band a thumb never hovers. It carries a real one. */}
                <Link
                  href="/devis"
                  className="font-semibold text-rail-ink underline underline-offset-4 transition-colors duration-[var(--t-fast)] hover:text-secondary"
                >
                  ouvrir un devis
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {groups.length > 0 ? (
        <section className={`shell mt-band ${material.length > 0 ? '' : 'pb-band'}`}>
          {/* THE TITLE MOVED UP TO THE SHELF, SO THIS ONE SAYS WHAT IS LEFT.
              Two sections cannot both be called "les métiers de l'atelier": the
              tiles are the métiers, this is what each one contains, and a
              reader who has just pressed a tile has to land on a heading that
              agrees with the gesture he made. */}
          <SectionHeader
            title="Le détail, ligne par ligne"
            context={`${formatCount(prestations.length, 'ligne')} de prestation, telles que l’atelier les a déclarées, regroupées par métier d’après leur propre libellé. Le montant est le prix d’entrée porté par la fiche, pas un devis. Chaque ligne ouvre WhatsApp avec la demande déjà écrite.`}
          />

          {/* Two columns from lg only. The measure of a row is its name, and
              these names run to 80 characters: split earlier, half of them wrap
              to three lines and the price column stops being a column. */}
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
            {groups.map((group, index) => (
              // THE LANDING PAD FOR ITS OWN TILE, AND THE OFFSET IS MEASURED
              // RATHER THAN GUESSED. The masthead is sticky and lands its
              // bottom edge at 56 pixels on a phone and at 121 on the desktop,
              // both measured on this page. Without a scroll margin the
              // heading a reader just asked for arrives underneath it. 80 and
              // 144 clear those two by a comfortable line.
              <section
                key={group.trade.id}
                id={`metier-${group.trade.id}`}
                style={{ '--enter-index': index } as React.CSSProperties}
                className="enter e-item scroll-mt-20 md:scroll-mt-36"
              >
                <h3 className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                  <span className="t-label text-secondary">{group.trade.label}</span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {formatCount(group.rows.length, 'ligne')}
                  </span>
                </h3>

                <ul>
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <a
                        href={whatsapp ? surveyHref(whatsapp, row.nom) : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex min-h-11 flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-rule py-4 transition-colors duration-[var(--t-fast)] hover:bg-space"
                      >
                        <span className="max-w-[46ch] text-small leading-[1.5] text-pretty group-hover:text-secondary">
                          {readable(row.nom)}
                        </span>
                        {/* THE PRICE AND THE HANDSET TAKE THE WHOLE LINE BELOW
                            `sm`, AND THAT IS NOT A MARGIN DECISION. At 390 the
                            name eats the row and this pair wraps under it, where
                            `justify-between` on the row above has nothing left
                            to push apart: the handset ended up eleven pixels
                            after the last F of FCFA, reading as part of the
                            price rather than as the row's own control. Full
                            width, it returns to the right edge under the name,
                            which is where the eye already goes for it. From `sm`
                            the pair is `w-auto` again and nothing moves. */}
                        <span className="flex w-full shrink-0 items-center justify-between gap-3 text-ink-3 sm:w-auto sm:justify-end">
                          <span className="t-num text-small">
                            dès <b className="font-semibold text-ink-2">{formatPrice(row.prix)}</b>
                          </span>
                          {/* The affordance a phone cannot hover to find. The
                              handset is what this shop already draws for a
                              WhatsApp link, on the product sheet and in the
                              footer alike. */}
                          <IconPhone
                            aria-hidden
                            className="text-[1rem] transition-colors duration-[var(--t-fast)] group-hover:text-secondary"
                          />
                          {/* NOT AN `aria-label` ON THE ROW. A label on the
                              anchor replaces everything inside it, and the
                              price is inside it: a screen reader would have
                              been told the trade and never the figure. Appended
                              instead, so the accessible name is the name, the
                              price, and then what pressing it does. */}
                          <span className="sr-only">
                            Demander un relevé sur site, sur WhatsApp
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : (
        // The export could stop carrying the term tomorrow, and this page would
        // still have to answer the question it exists for. The rail above is the
        // answer; this is the sentence that stops the page ending on a blank.
        <section className="shell mt-band">
          <p className="max-w-[62ch] text-lead leading-[1.55] text-ink-2">
            Le détail des prestations n’est pas consultable en ligne pour le moment. Le comptoir
            répond sur WhatsApp et au téléphone, et le relevé sur site reste la première étape.
          </p>
        </section>
      )}

      {/* THE BOUNDARY, STATED RATHER THAN IMPLIED, AND STATED WITHOUT PRINTING
          THE LIST. Two things share one word in this shop and they are not the
          same trade: this page bills a technician's time, the department sells a
          machine you carry away. A reader who came for the second one is told
          where it is instead of being left to wonder why a laptop is on a
          services page, and the department is where the basket button lives. */}
      {material.length > 0 ? (
        <section className="shell mt-band pb-band">
          <SectionHeader
            title="Du matériel porte le même mot"
            /* THE OPENING CLAUSE COUNTS BOTH SIDES, SO IT HAS TO SURVIVE ONE OF
               THEM BEING EMPTY. Written flat it read "le fournisseur a rangé deux
               choses : les 0 prestation ci-dessus, et 14 pièces de matériel",
               pointing at nothing above it, on the one export where this page
               matters most: the one where the term has stopped carrying labour
               and is now a hardware bin with a misleading name. */
            context={`${
              prestations.length > 0
                ? `Sous le terme « ${termName ?? 'Nos Services'} », le fournisseur a rangé deux choses : les ${formatCount(prestations.length, 'prestation')} ci-dessus, et ${formatCount(material.length, 'pièce')} de matériel`
                : `Sous le terme « ${termName ?? 'Nos Services'} », le fournisseur a aussi rangé ${formatCount(material.length, 'pièce')} de matériel`
            }. Ce n’est pas la même chose. Du matériel a un prix ferme, se met au panier, se retire au comptoir ou se fait livrer. Une prestation, non. Le matériel se compare en rayon${rayon ? `, avec l’occasion, dans les ${formatCount(rayon.compte, 'référence')} de ${rayon.nom}` : ''}.`}
            aside={
              <Action href="/rayon/services-occasion" variant="secondary">
                Voir le rayon Services &amp; Occasion
              </Action>
            }
          />

          <p className="max-w-[62ch] text-small leading-[1.65] text-ink-2">
            {elsewhere.length > 0
              ? `Quelques-unes de ces pièces sont classées ailleurs, sous leur vraie famille : ${listFrench.format(elsewhere)}. Le plus court pour les retrouver reste la recherche, par référence ou par modèle.`
              : 'Le plus court pour retrouver une de ces pièces reste la recherche, par référence ou par modèle.'}
          </p>
          {/* 19.5 pixels tall on a telephone, measured, and it is the last
              control on the page. `min-h-11` gives it a thumb below `sm` and
              `sm:min-h-0` gives the desktop its own height back, which is the
              same treatment the showroom band's closing link already takes. */}
          <p className="mt-3 sm:mt-5">
            <Link
              href="/catalogue"
              className="draw-under inline-flex min-h-11 items-center text-small font-semibold text-secondary hover:text-secondary sm:min-h-0"
            >
              Parcourir tout le catalogue
            </Link>
          </p>
        </section>
      ) : null}
    </>
  )
})
