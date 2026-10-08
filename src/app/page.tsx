import { connection } from 'next/server'

import { PREMIERS_PRODUITS } from '@/app/api/rayon-produits/route'
import { BannerStage } from '@/components/home/BannerStage'
import { getBanners } from '@/lib/banners'
import { BrandRail } from '@/components/home/BrandRail'
import { CounterTour } from '@/components/home/CounterTour'
import { HeroDeck } from '@/components/home/HeroDeck'
import { PromoBand } from '@/components/home/PromoBand'
import { RecentColumns } from '@/components/home/RecentColumns'
import { Selections } from '@/components/home/Selections'
import { ServiceStrip } from '@/components/home/ServiceStrip'
import { ShowroomBand } from '@/components/home/ShowroomBand'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { COUNTER_TOUR } from '@/constants/home'
import { lireAccueil, lireNavigation, lirePointsVenteOuVide, lireListe } from '@/lib/catalogue-en-direct'
import {
  colonnesRecentes,
  panneauxHero,
  panneauxPromo,
  rayonParId,
  rayonsOrdonnes,
  selectionsAccueil,
  tourDesComptoirs,
  tuilesMarques,
} from '@/lib/catalogue-vues'
import { pickupLine, shopPhone } from '@/lib/comptoirs'
import { formatAmount, formatCount } from '@/lib/format'
import { avecPanneCatalogue } from '@/lib/panne-catalogue'

/**
 * The homepage.
 *
 * It orchestrates and does not render: every visual decision lives in a section
 * component, and every fact comes from the catalog rather than from this file.
 *
 * THE SHAPE. The designer's banners open the page, on a loop, saying nothing the
 * artwork does not already say. Then a rail of twelve departments driving the
 * card beside it, two banners for the two departments nobody needs arguing for,
 * then
 * merchandise in decreasing order of how much the shop chose it: four filters a
 * customer would have applied themselves, a deliberate pass over the six
 * departments the top of the page cannot reach, and last the families where
 * stock genuinely moved this month. The operating facts and the three counters
 * interrupt that twice, at the two points where a reader has seen enough to
 * start asking how any of it would reach them.
 *
 * WHAT IS NOT HERE. No star ratings, because the catalog holds no reviews. No
 * "best seller" shelf, because the export carries no order history. No
 * countdown, because nothing here is genuinely expiring. Every list on this page
 * is a query a customer could run themselves, and each one says which.
 *
 * THE BAND BETWEEN SECTIONS IS 64 PIXELS ON A PHONE AND THE TOKEN'S OWN VALUE
 * FROM sm UP. `--s-band` is clamp(6rem, 8.5vw, 10rem), and 8.5vw of a 360
 * screen is 30 pixels, so the clamp holds it at its 96px floor: a measure
 * calculated for a 1440 screen, where it computes to 122 and separates two
 * bands the eye takes in whole. On a phone nothing is taken in whole, the
 * sections are already one per screen, and six of those gaps put 576 pixels of
 * empty page between them on a document that measured 13 009 tall. Sixteen
 * (64px) keeps the page's air and gives back a third of it. At 640 the utility
 * returns and computes to the same 96 it always did, so no screen from sm up
 * moves.
 */
export default avecPanneCatalogue(async function HomePage() {
  /* TOUT VIENT DU BACKEND, EN QUATRE LECTURES PARALLELES. Les bannieres, la
     navigation (rayons, comptes, photographies d'ouverture, marques), les blocs
     de l'accueil (selections, tour des comptoirs, colonnes d'arrivages) et les
     comptoirs. Le catalogue compile au build ne savait rien d'un produit cree
     dans le panel ni d'un prix corrige ; l'accueil etait la page ou cela se
     voyait le plus.

     `connection()` EN PREMIER, parce que cette page n'a ni `searchParams` ni
     cookie : sans lui elle serait prerendue au build, qui appellerait le
     backend et echouerait avec lui. Le cache de donnees (soixante secondes et
     l'etiquette `catalogue`) evite que chaque visite coute quatre appels.

     LECTURES STRICTES POUR LE CATALOGUE. Si le backend ne repond pas,
     l'accueil affiche la page d'erreur plutot qu'une vitrine vide : douze
     rayons a zero reference diraient au client que la boutique ne vend rien.
     Les comptoirs, eux, sont lus en mode tolerant : sans eux la bande des
     comptoirs disparait et la ligne de retrait se tait, mais un accueil dont le
     catalogue a repondu n'a pas a devenir une page d'erreur pour autant. */
  await connection()
  const [banners, nav, accueil, pointsVente] = await Promise.all([
    getBanners(),
    lireNavigation(),
    lireAccueil(COUNTER_TOUR),
    lirePointsVenteOuVide(),
  ])

  const familyCount = nav.nombreFamilles
  const panels = panneauxHero(nav)
  /* LES PRODUITS DU PREMIER RAYON SONT LUS ICI, LES ONZE AUTRES A LA DEMANDE.
     La carte de l'ouverture montre desormais les premiers produits du rayon
     pointe dans le rail. Les douze au rendu, ce serait douze appels et
     quatre-vingt-seize cartes dans le document pour n'en montrer que huit ;
     `api/rayon-produits` sert les suivants quand le curseur les demande. */
  const premiers = panels[0]
    ? await lireListe({ rayons: [panels[0].slug], parPage: PREMIERS_PRODUITS }, 'vitrine')
    : null
  const promos = panneauxPromo(nav)
  // The band's own heading states the rule it is sorted by, so the two numbers
  // in that sentence are counted here rather than typed: hard-coding 869 and 514
  // would be right today and wrong the first time the stock moves.
  const depths = rayonsOrdonnes(nav)
    .map((rayon) => rayon.compte)
    .sort((a, b) => b - a)
  // Twelve, not ten: the grid runs 2, 3 and 4 columns, and twelve is the only
  // count under fifteen that fills whole rows at all three. Ten left two empty
  // cells, 613 by 474 pixels each, on every screen between 768 and 1279. The
  // backend returns twelve per selection for that reason.
  const selections = selectionsAccueil(accueil)
  const picks = tourDesComptoirs(accueil)

  // Twelve marks, two rows of six, ranked by catalogue depth. The wall shows
  // only manufacturers we hold a mark for; the others are one link away.
  const brands = tuilesMarques(nav, 12)

  const columns = colonnesRecentes(accueil)

  return (
    <>
      {/* Full bleed and flush to the masthead: the artwork is the first thing,
          and a gutter around it would frame someone else's composition. */}
      <BannerStage banners={banners.principales} promos={banners.promos} />

      {/* `block`, not `band`. The stage and the rail are one opening seen in
          two parts, and a full band between them reads as the page having
          already moved on from the artwork. */}
      <section className="shell mt-stack">
        <HeroDeck panels={panels} produitsInitiaux={premiers?.produits ?? []} />

        {/* THE BAND IS A DESKTOP OBJECT NOW, AND `hidden` IS ENOUGH TO MAKE IT
            FREE. Six panels of a department that the twelve tiles above already
            offer, each with a photograph, is a second table of contents on the
            screen that can least afford one: the tiles are the shop's entrance
            and the band repeats six twelfths of it, 900 pixels further down.
            The images cost nothing while it is hidden, because `next/image` is
            lazy by default and an element that is `display: none` never enters
            a viewport, so the observer never fires and the file is never
            fetched. From md, where the band sits beside itself in two columns
            and the reader is not scrolling past it one card at a time, it
            returns untouched. */}
        <div className="mt-stack hidden md:block">
          {/* THE BAND HAD NO HEADING AT ALL, AND A BAND OF FOUR PANELS THAT DOES
              NOT SAY WHAT IT IS reads as advertising. It is not: these four are
              the four deepest departments in the shop, 869, 747, 704 and 514
              references against 351 for the fifth, so the heading states the
              rule and the rule is a count anyone can check.

              IT IS NOT "BEST SELLER", WHICH WAS ASKED FOR AND CANNOT BE WRITTEN.
              This export carries no order history: not one row of it says what
              sells. Printing those two words would be the first invented claim
              on the site, on the page most people see first, and it is the exact
              rule that took "les équipes interviennent à Douala" off /services.
              Depth is the true thing this band happens to be sorted by. */}
          <SectionHeader
            title="Là où le magasin est le plus profond"
            context={`Les ${formatCount(promos.length, 'rayon')} qui portent le plus de références, de ${formatAmount(depths[0] ?? 0)} à ${formatAmount(depths[promos.length - 1] ?? 0)}. Le suivant en compte ${formatAmount(depths[promos.length] ?? 0)}.`}
            action={{ href: '/catalogue', label: 'Ouvrir le catalogue' }}
          />
          <PromoBand panels={promos} />
        </div>
      </section>

      <section className="shell mt-11 sm:mt-band">
        <Selections selections={selections} />
      </section>

      <div className="mt-11 sm:mt-band">
        <ServiceStrip pickupLine={pickupLine(pointsVente)} />
      </div>

      <section className="shell mt-11 sm:mt-band">
        <SectionHeader
          title="Le tour du magasin"
          context="Un article en stock dans chacun des six rayons que le haut de cette page ne traverse pas."
          action={{ href: '/catalogue', label: `Les ${familyCount} familles` }}
        />
        <CounterTour
          picks={picks}
          reconditioned={rayonParId(nav, 'services')?.image ?? null}
          phone={shopPhone(pointsVente)}
        />
      </section>

      <section className="shell mt-11 sm:mt-band">
        <SectionHeader
          title="Derniers arrivages"
          context="Les trois familles où du stock est entré le plus récemment, une par rayon."
          action={{ href: '/catalogue?tri=recent', label: 'Tout voir' }}
        />
        <RecentColumns columns={columns} />
      </section>

      <section className="shell mt-11 sm:mt-band">
        <SectionHeader
          title="Marques distribuées"
          context={`${formatAmount(nav.nombreProduits)} références réparties sur une centaine de marques, retrouvées ligne par ligne dans le catalogue.`}
          action={{ href: '/marques', label: 'Toutes les marques' }}
        />
        <BrandRail brands={brands} />
      </section>

      {pointsVente.length > 0 ? (
        <div className="mt-11 sm:mt-band">
          <ShowroomBand pointsVente={pointsVente} />
        </div>
      ) : null}
    </>
  )
})
