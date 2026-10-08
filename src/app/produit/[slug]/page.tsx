import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { BuyBlock } from '@/components/product/BuyBlock'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductGrid } from '@/components/product/ProductGrid'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { lireFiche, lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'
import { pickupLine } from '@/lib/comptoirs'
import { formatDelai } from '@/lib/delai'
import { formatAmount, formatMonth, formatPrice } from '@/lib/format'
import { servicePoints } from '@/constants/site'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'

/**
 * AU-DELA DE CE NOMBRE DE CARACTERES, la description courte est coupee a cinq
 * lignes dans la colonne d'achat et reprise en entier plus bas. Cinq lignes de
 * la colonne en tiennent environ 320 : une vraie description courte, telle que
 * le panel la demande, n'est jamais coupee.
 */
const SEUIL_COURTE = 320

interface Params {
  params: Promise<{ slug: string }>
}

export const generateMetadata = metadonneesAvecPanne(async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  // La meme lecture que la page : `lireFiche` est memoisee pour le rendu.
  const fiche = await lireFiche(slug)
  if (!fiche) return {}
  const photo = fiche.galerie[0]?.url
  return {
    title: fiche.nom,
    description: `${fiche.nom}${fiche.marque ? `, ${fiche.marque}` : ''} à ${formatPrice(fiche.prix)} chez NowTech Center. En stock, retrait le jour même à Douala et Yaoundé.`,
    openGraph: photo ? { images: [photo] } : undefined,
  }
})

/**
 * A product.
 *
 * THE DECISION IS THE LAYOUT. Photograph on the left, everything that answers
 * "should I buy this" on the right, and nothing between them. On this catalogue
 * the picture alone almost never decides anything, because half the shop is
 * black boxes that photograph identically, so the right column leads with the
 * facts the export actually parsed out of the name and only then asks for the
 * click.
 *
 * ==========================================================================
 * WHAT WAS TAKEN FROM E-SHOP, AND WHAT COULD NOT BE
 * ==========================================================================
 *
 * E-shop's product page is written as an editorial spread, and its column reads
 * in one unbroken order: CLASSIFICATION, NAME, ONE LINE, rule, PRICE beside
 * AVAILABILITY, the CONTROL, prose, rule, the FACTS in labelled clusters. That
 * order is the thing worth copying, because it is a ladder — each step is the
 * next question a buyer asks — and it is what stops a product page reading as a
 * form with a picture next to it. It is taken here step for step, with three
 * substitutions this catalogue forces.
 *
 * ITS ONE LINE IS OUR SPECIFICATIONS. E-shop has a hand-written sentence under
 * every name. This export has none, and writing 4 254 of them would mean
 * generating them. What sits in that slot instead is the only characterisation
 * this shop can honestly make: the two or three facts the ingestion parsed out
 * of the product's own name. 1 498 of 4 254 references carry at least one; on
 * the other 2 756 the slot is simply not drawn, because an empty label is worse
 * than no label.
 *
 * THEY ARE NO LONGER CHIPS. They were set in filled grey rectangles, which is
 * what the grid card uses, and in the grid that is right: there they are
 * scanned across twelve cards at 12px and the fill is what separates them. Here
 * there is one product, the reader is reading rather than scanning, and a row
 * of filled rectangles under a heading is the single most template-looking
 * object on the page. They are now a line of type separated by hairline
 * slashes, in the register the rest of this column is set in.
 *
 * ITS PROSE SLOT WAS LEFT EMPTY, AND IT NO LONGER IS — BUT PAS DANS LA COLONNE.
 * Entre le bouton et les faits, E-shop imprime un paragraphe. Ce creneau est
 * reste vide longtemps pour une bonne raison : l'export ne portait aucune
 * description, et en inventer 4 254 est la seule chose que cette boutique
 * refuse de faire.
 *
 * Ce n'est plus le cas. Le client en fournissait depuis toujours — mesure sur
 * 600 produits de sa source, 99 % en portent une, mediane 936 caracteres — et la
 * synchronisation ne les lisait pas. Elles sont maintenant en base, modifiables
 * depuis le panel.
 *
 * ELLES NE SONT PAS REMONTEES DANS LA COLONNE POUR AUTANT. Neuf cent trente-six
 * caracteres entre le prix et le bouton repousseraient le bouton sous la ligne
 * de flottaison sur un telephone, et rien ne doit s'interposer entre le prix et
 * la decision. La prose ouvre une section propre sous la fiche, pour le lecteur
 * qui a besoin d'en savoir plus ou qui compare deux references.
 *
 * ITS CLUSTERS ARE HEADED, AND NOW SO ARE OURS. E-shop groups its facts under
 * three small labels — Made from, Fits, Lives — instead of running a hairline
 * table of ten rows. A ruled table is the default for a catalogue of this size
 * and it always reads as a spec sheet off a hardware site. The block under the
 * button carries a heading for the same reason: "Retrait et livraison" is how
 * the thing reaches you, and the heading turns a run of leftover rows into one
 * answered question.
 *
 * ITS COLUMN CARRIES TWO RULES, AND NOW SO DOES OURS, WHICH COST THE COLUMN ITS
 * THIRD BLOCK. E-shop rules the column exactly twice: once above the price and
 * once above the facts. Three movements, two rules. This column had three ruled
 * blocks, and the third was "La référence" — famille, mise en ligne, référence
 * WooCommerce — set as a right-aligned two-column table, which is the one shape
 * this page's own head note says to avoid. It was also the wrong content for
 * that slot: E-shop's facts are about the OBJECT, and belong beside its price;
 * these three are about the RECORD. They are now the photograph's caption. See
 * point 6 in the body.
 *
 * WHAT THE CAPTION IS WORTH, MEASURED AT 1440. The spread was 899 pixels tall
 * with the photograph's column ending at 883 and the buy column at 1118: 235
 * pixels of white under a square frame beside a column that outran it, on every
 * reference in the catalogue. E-shop never shows that, because its photography
 * is a stack of three plates and is the TALLER column. Ours cannot be — the
 * frame is square, the packshots are 425 to 576 pixels a side and 2 880 of the
 * 4 254 references carry exactly one. Moving the record under the plate is the
 * same rebalancing done from the other end: the columns now finish 30 pixels
 * apart instead of 235, and the whole spread is 728 rather than 899. At 1280 the
 * gap goes from 347 to 138.
 *
 * WHAT WAS NOT TAKEN. E-shop pins the BUYING COLUMN and lets the photography
 * scroll past it. Measured here at 1440 that would be wrong: the buy column runs
 * 293 to 1059, which is 766 pixels against 803 of usable viewport under a
 * 157-pixel chrome, and the longest names in this export are 211 characters and
 * push it well past that. Pinning a column taller than the screen pins nothing
 * and scrolls the price away from the picture it belongs to.
 *
 * NOTHING IS PINNED HERE NOW. The photograph was, as the same idea applied to
 * the column that actually fits, and it has been given up to put the caption
 * back under the plate; the arithmetic of that trade is written out at point 6.
 * The short version is that this spread is 752 pixels tall at 1440 against 803
 * of viewport, so on more than nine references in ten there is nothing to pin it
 * against.
 *
 * ALSO NOT TAKEN: E-SHOP'S SECOND MOVEMENT, AND THERE IS NO HONEST SUBSTITUTE
 * FOR IT. Under its control E-shop prints `product.lead`, a hand-written line
 * about when the piece will reach you, and under that a paragraph about how it
 * was made. The only lead time this export knows is the shop's own, which is the
 * same four sentences on all 4 254 references and is already printed one rule
 * below under "Retrait et livraison". Printing it twice in eighty pixels would
 * be dressing a repetition as a promise.
 *
 * ALSO NOT TAKEN: its rule above the related run. E-shop closes the spread with
 * a hairline and opens the next section under it. `SectionHeader` already draws
 * a hairline of its own, and two hairlines 60 pixels apart is a boxed section,
 * not an editorial one. The `band` of silence does that work here.
 *
 * ==========================================================================
 *
 * WHAT THIS PAGE DOES NOT HAVE, AND WHY. No rating, because there are no
 * reviews. No "12 personnes regardent cet article", because that is a number
 * nobody counted.
 *
 * LE COMPTE A REBOURS SUR LA REMISE N'Y EST TOUJOURS PAS, ET LA RAISON A CHANGE.
 * Il etait absent parce que rien n'expirait : une remise posee a la main restait
 * jusqu'a ce qu'on la retire. Les promotions ont desormais une date de fin, donc
 * quelque chose expire vraiment, et `promoFin` est disponible sur cette page.
 * Il reste absent par choix : un compte a rebours presse le lecteur, et la
 * plupart de ces remises sont sans terme — en afficher un sur les quelques-unes
 * qui en ont apprendrait a lire l'urgence la ou il n'y en a pas.
 *
 * TOUTE LA FICHE VIENT DU BACKEND, ET IL N'Y A PLUS DE REPLI. Le nom, les
 * photographies, le prix et les references voisines etaient lus dans un
 * fichier compile au build, et seule la prose venait de la base. Un produit
 * cree dans le panel n'avait donc pas de fiche du tout : l'adresse repondait
 * 404 tant que personne n'avait redeploye. Si le backend ne repond pas, la page
 * le dit (voir `app/error.tsx`) plutot que d'afficher un prix d'hier.
 *
 * THE OPERATING FACTS SIT IN THE BUY COLUMN, NOT IN A STRIP BELOW. Retrait,
 * livraison, paiement and garantie are the four questions a Cameroonian buyer
 * asks between reading the price and pressing the button, and answering them
 * three sections further down means answering them after the decision. E-shop
 * keeps its own facts in the column for the same reason.
 *
 * THE PRICE AND THE AVAILABILITY SHARE A BASELINE, WHICH COST THE AVAILABILITY
 * FOUR WORDS. They were stacked, 28 pixels apart, which made the availability
 * read as a caption on the price rather than as the second half of the same
 * statement. E-shop sets the two on one baseline, and it can, because its two
 * strings are short. Measured here they were not: the price draws 262 pixels at
 * 1440 and "En stock, retrait le jour même" draws 201, which is 483 in a
 * 416-pixel column, so the row wrapped on the 3 916 references that are in stock
 * and held on the 338 that are not. A row that changes shape with the stock
 * status is worse than either shape. The sentence is cut to "En stock" — 57
 * pixels, and 339 with the price — and the four words it lost are printed word
 * for word two rules below, under "Retrait et livraison", which is where a
 * reader who has finished reading the price actually looks for them. Nothing is
 * lost from the page and the row now holds at 390 as well: 183 + 20 + 57 = 260
 * against 332.
 *
 * THE REFERENCE NUMBER IS STILL PRINTED, AND IT IS STILL THE POINT. It is the
 * product's id in the shop's database: the WooCommerce post id for everything
 * synchronised from the old site, a number from 1 000 000 000 up for a product
 * created in the panel. It is what the counter reads back over the telephone,
 * and it is the one identifier the customer and the shop can both point at. It
 * has moved from the foot of the buy column to the caption under the photograph,
 * which is nearer the thing it names, not further from it.
 *
 * THE SPECIFICATIONS LINE IS SET AT E-SHOP'S SIZE, WHICH IS ONE STEP ABOVE BODY
 * AND WAS ONE STEP BELOW IT. E-shop's line under the name is 17px — `text-lead`
 * here, to the pixel — because on that page it is the sentence that gives the
 * piece a voice. This page's substitute for it carries the same job and had been
 * set at 13px, where it read as a footnote on the name rather than as the second
 * half of the statement. It is `text-lead` from `sm` and `text-body` below it:
 * at 306 pixels of column, 17px mono runs three specifications onto a third line
 * and pushes the price down a screen that has none to give. Measured at 390 the
 * name, the price and the button did not move: 632, 813, 929.
 *
 * THE VERTICAL RHYTHM BELOW `sm` IS A DIFFERENT RHYTHM, BECAUSE THE COLUMN IS
 * NOT BESIDE THE PHOTOGRAPH ANY MORE, IT IS UNDER IT. Measured at 360 on a
 * 780px screen before this change: the masthead and the trail end at 275, the
 * frame runs 303 to 609, the thumbnails to 697, and the product's own NAME
 * started at 771. Every gap in the column was a desktop gap: 40px between the
 * two grid children, 36 above each ruled block with 28 under each rule, on a
 * screen where the same content is stacked instead of side by side.
 *
 * They are cut below `sm` and restored at `sm` exactly: 40 to 28 between the
 * children, 36/28 to 28/24 on the ruled blocks, 40 to 20 above the article. The
 * gallery gives back another 143 on top of that by turning its wrapped thumbnail
 * grid into a swipe rail; see the head of `ProductGallery`.
 *
 * THE GRID HAS THREE CHILDREN AND TWO COLUMNS, AND THE THIRD IS PLACED RATHER
 * THAN NESTED. Photograph, buy column, caption. Below `lg` the grid is one
 * column and they simply stack, so the caption falls to the foot of the article,
 * after everything about the object — which is where three facts about a
 * database row belong on a phone, and it is also the DOM order a screen reader
 * gets at every width. From `lg` the caption is placed into row 2 of column 1,
 * under the photograph, and the buy column spans both rows. Nesting it inside
 * the photograph's cell was tried first and measured: 56 pixels at 390, which
 * put the basket button back at y 982 on an 844-pixel screen. That is the exact
 * number `BuyBlock` was rewritten to get rid of.
 */
export default avecPanneCatalogue(async function ProduitPage({ params }: Params) {
  const { slug } = await params
  /* Les comptoirs en lecture tolerante : ils ne donnent que le lieu du retrait,
     et une fiche lisible ne doit pas tomber en erreur pour une ligne sous le
     bouton d'achat. L'habillage fait la meme lecture, donc aucun appel de plus. */
  const [fiche, pointsVente] = await Promise.all([lireFiche(slug), lirePointsVenteOuVide()])
  if (!fiche) notFound()

  const photos = fiche.galerie.map((photo) => photo.url).filter((url): url is string => url !== null)
  const famille = fiche.categorie?.nom ? { ...fiche.categorie, nom: fiche.categorie.nom } : null

  /**
   * LE FIL S'ARRETE A LA FAMILLE, COMME IL L'A TOUJOURS FAIT.
   *
   * Le backend rend le chemin entier, ancetres compris : « Catalogue /
   * Ordinateurs & Accessoires / Ordinateurs / Ordinateurs portables / Laptop
   * HP ». La fiche a toujours montre trois etapes — le catalogue, le rayon, la
   * famille — et c'est la famille qui ouvre la liste des produits voisins. Les
   * etapes intermediaires restent a un clic, sur la page de la famille.
   */
  const fil = fiche.fil.filter(
    (etape) =>
      etape.href === '/catalogue' ||
      etape.href.startsWith('/rayon/') ||
      (famille !== null && etape.href === `/categorie/${famille.slug}`),
  )

  /**
   * LE SEUIL DE 40 % TIENT TOUJOURS, MAIS PLUS POUR TOUT LE MONDE.
   *
   * `Price` le documente : 4 107 produits sur 4 256 portent un drapeau « en
   * promotion » herite de WooCommerce, ou le prix barre etait decoratif. Un prix
   * barre sur presque chaque reference ne veut plus rien dire, et seules les 513
   * remises d'au moins 40 % meritaient d'etre ancrees.
   *
   * CE RAISONNEMENT NE S'APPLIQUE PAS A UNE PROMOTION DECIDEE ICI. Elle porte
   * une date, elle a ete saisie par quelqu'un, et une contrainte de base verifie
   * ses chiffres. La masquer parce qu'elle ne fait « que » 15 % reviendrait a
   * ignorer la decision du comptoir.
   *
   * LA FENETRE EST DONC LE CRITERE, ET NON LA PROVENANCE. Ma premiere version
   * disait « tout ce qui vient du backend s'affiche » : comme le backend sert
   * aussi les remises heritees, elle ressuscitait le bruit exact que ce seuil
   * existe pour supprimer — 4 127 prix barres au lieu de 513.
   */
  const promotionDecidee = Boolean(fiche.promoDebut || fiche.promoFin)
  const remisePct = fiche.remisePct
  const anchored =
    fiche.prixReference && remisePct && (promotionDecidee || remisePct >= 40)
      ? fiche.prixReference
      : null
  const added = formatMonth(fiche.ajouteLe)

  /* The photograph's credit line. Built here rather than inline so the three
     facts can be absent one at a time: 20 references are filed under no family
     at all, and `ajouteLe` is null wherever WooCommerce lost the upload date. A
     caption that prints "Famille Non classé" is worse than a caption of two
     facts. The reference itself is always known, so the line is never empty. */
  const credit: { label: string; value: ReactNode }[] = []
  if (famille) {
    credit.push({
      label: 'Famille',
      value: (
        <Link
          href={`/categorie/${famille.slug}`}
          /* 12px of type in a caption is a 75 by 17 target. The hit area is
             taken to 44 by a pseudo-element rather than by padding, because
             padding would push the caption off the photograph's baseline, and
             it reaches further DOWN than up: below is the product's own name,
             which is type, while above is the bottom edge of the swipe rail.
             Hidden from `sm`, where the pointer is a pointer. */
          className="draw-under relative text-secondary after:absolute after:-inset-x-2 after:-top-2 after:-bottom-6 after:content-[''] hover:text-secondary sm:after:hidden"
        >
          {famille.nom}
        </Link>
      ),
    })
  }
  if (added) credit.push({ label: 'Mise en ligne', value: <span className="t-num">{added}</span> })
  credit.push({ label: 'Réf.', value: <span className="t-num">{fiche.id}</span> })

  /* LES DEUX TEXTES DU PANEL, ET OU ILS VONT.
     `description` est la « Description courte » du panel : elle se lit dans la
     colonne d'achat, sous le bouton, en quelques lignes. `ficheTechnique` est
     sa « Description détaillée » : elle a la section du bas pour elle.
     Les fiches importees de l'ancien site portent souvent un LONG texte dans
     `description` — 936 caracteres en moyenne. Coupe a cinq lignes en haut, il
     est alors repris en entier en bas, pour que rien ne soit perdu. */
  const courte = fiche.description?.trim() || null
  const courteLongue = courte !== null && courte.length > SEUIL_COURTE
  const detaillee = fiche.ficheTechnique?.trim() || null
  const delai = formatDelai(fiche.delaiLivraison)

  /* Les deux sections du bas sont facultatives : la derniere qui s'affiche
     porte l'espace avant le pied de page, que `main` ne pose plus. */
  const avecProse = Boolean(detaillee || courteLongue || fiche.fichePdf)
  const avecLies = fiche.lies.length > 0 && famille !== null

  return (
    <>
      <Breadcrumb path={fil} current={fiche.nom} />

      {/* PLUS COMPACTE, ET C'EST LA PHOTOGRAPHIE QUI CEDE. La galerie prenait la
          colonne flexible : a 1440, un carre de 790 pixels, qui poussait tout le
          reste sous la ligne de flottaison. Elle est plafonnee a 32 puis 36 rem,
          la colonne d'achat recoit la place rendue — plafonnee elle aussi, pour
          que le bouton ne s'etire pas sur 700 pixels — et les marges verticales
          sont resserrees d'un tiers. */}
      <article className={`shell pt-4 sm:pt-5 md:pt-6 ${avecProse || avecLies ? '' : 'pb-band'}`}>
        <div className="grid gap-x-10 gap-y-6 sm:gap-y-7 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)] xl:gap-x-14">
          {/* THE ROWS ARE DECLARED, AND THAT DECLARATION IS WHAT PUTS THE
              CAPTION BACK ON THE PHOTOGRAPH. See point 6. */}
          <div className="lg:col-start-1 lg:row-start-1 lg:self-start">
            <ProductGallery images={photos} name={fiche.nom} />
          </div>

          {/* THE MEASURE IS CAPPED WHERE THE PAGE IS ONE COLUMN. From lg up this
              column is a 416-pixel track and the cap never binds. From 768 to
              1023 it was the whole shell: 653 pixels at 768 and 765 at 900, so
              a ninety-character name set at about 100 characters to the line and
              the basket button drew 623 pixels wide. 34rem is 544, which is the
              same measure the ruled blocks below it are read at on a laptop. */}
          <div className="enter md:max-w-[34rem] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-[38rem]">
            {/* 1. CLASSIFICATION. The brand when the export knows it, the family
                   when it does not, and nothing at all when neither is known —
                   1 212 of 4 254 references carry no brand. */}
            {fiche.marque ? (
              <p className="e-text t-label mb-3 text-secondary">{fiche.marque}</p>
            ) : famille ? (
              <p className="e-text t-label mb-3 text-ink-3">{famille.nom}</p>
            ) : null}

            {/* 2. THE NAME. The darkest thing in the column, and the second
                   largest, which is where this page parts company with E-shop
                   and does it deliberately. There a name is two or three words
                   and is set at 48px above a 26px price. Here the median name is
                   49 characters and the longest is 211: at 48px in a 416-pixel
                   column that one sets to eleven lines and puts its own price
                   below the fold. Sizing the name by its length was measured and
                   refused for a different reason — it makes the same piece of
                   furniture change size between two references of one family,
                   which reads as a rendering fault rather than as an editorial
                   decision. So the name holds one size, 32px from md, and the
                   price is the larger of the two. On a catalogue reached mostly
                   from a search result, where the reader already knows what the
                   thing is and is asking what it costs, that is the honest
                   order. */}
            <h1 className="text-sub leading-[1.25] font-bold tracking-[-0.02em] text-balance md:text-title md:leading-[1.15]">
              {fiche.nom}
            </h1>

            {/* 3. THE LINE. See the head of this file: on this catalogue the one
                   line under the name is the parsed specifications, set as type
                   rather than as chips. The slash is a separator and carries no
                   meaning, so it is hidden from assistive technology, and it
                   leads its item rather than trailing it: a wrapped second line
                   then opens with a mark that reads as a continuation instead of
                   closing with one that reads as a mistake. */}
            {fiche.caracteristiques.length > 0 ? (
              <ul className="e-item mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body text-ink-2 sm:mt-4 sm:text-lead">
                {fiche.caracteristiques.map((spec, index) => (
                  <li key={spec} className="flex items-baseline gap-3">
                    {index > 0 ? (
                      <span aria-hidden className="text-rule-2">
                        /
                      </span>
                    ) : null}
                    <span className="t-num">{spec}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 4. THE PRICE, THE AVAILABILITY, THE CONTROL. */}
            <div className="mt-5 border-t border-rule pt-4 sm:mt-6 sm:pt-5">
              {anchored ? (
                <p className="t-num mb-1 text-small text-ink-3">
                  <span className="line-through">{formatPrice(anchored)}</span>
                  <span className="ml-3 font-bold text-secondary">-{remisePct}%</span>
                </p>
              ) : null}

              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                <p className="t-num text-display leading-none font-bold tracking-[-0.03em]">
                  {formatPrice(fiche.prix)}
                </p>
                {/* "En stock" and not "En stock, retrait le jour même". The
                    longer sentence is 201 pixels wide and would not sit on the
                    price's baseline in a 416-pixel column; it is also printed
                    word for word two rules below, under "Retrait et livraison",
                    where it is the answer to a question the reader is actually
                    asking by then. Nothing is lost and the row holds its shape
                    on every reference. */}
                <p className="text-small text-ink-2">
                  <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-primary align-middle" />
                  En stock
                </p>
              </div>

              {/* LE DELAI DU PRODUIT, REGLE DANS LE PANEL. Absent, rien n'est
                  promis ici : la section « Retrait et livraison » garde la
                  regle generale de la maison. */}
              {delai ? (
                <p className="mt-2 text-small text-ink-2">
                  Livraison en <span className="t-num font-semibold text-ink">{delai}</span>
                </p>
              ) : null}

              <div className="mt-4 sm:mt-5">
                <BuyBlock
                  product={{
                    slug: fiche.slug,
                    name: fiche.nom,
                    /* Le panier capture le prix a l'ajout : c'est le prix
                       effectif de la base, celui que la caisse facturera. */
                    price: fiche.prix,
                    image: fiche.image,
                  }}
                />
              </div>
            </div>

            {/* 5. EN BREF : la description courte du panel. Sous le bouton et
                   pas au-dessus, pour que rien ne s'interpose entre le prix et
                   l'achat ; coupee a cinq lignes, avec un lien vers le texte
                   entier quand elle en fait davantage. */}
            {courte ? (
              <section className="mt-5 border-t border-rule pt-4 sm:mt-6 sm:pt-5">
                <h2 className="t-label mb-3 text-ink-3">En bref</h2>
                <p
                  className={`text-small leading-[1.7] whitespace-pre-line text-ink-2 ${courteLongue ? 'line-clamp-5' : ''}`}
                >
                  {courte}
                </p>
                {courteLongue ? (
                  <a
                    href="#description"
                    className="draw-under mt-2 inline-block text-small font-semibold text-secondary"
                  >
                    Lire la description complète
                  </a>
                ) : null}
              </section>
            ) : null}

            {/* 6. HOW IT REACHES YOU. */}
            <section className="mt-5 border-t border-rule pt-4 sm:mt-6 sm:pt-5">
              <h2 className="t-label mb-3 text-ink-3">Retrait et livraison</h2>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {servicePoints(pickupLine(pointsVente), delai).map((point) => (
                  <div key={point.title}>
                    <dt className="mb-1 text-small font-semibold">{point.title}</dt>
                    {point.detail ? (
                      <dd className="text-micro leading-[1.6] text-ink-3">{point.detail}</dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {/* 6. THE PLATE'S CREDIT.
              Placed rather than nested, and that placement is the whole point.
              In the DOM it is last, which is where it belongs to a screen reader
              and where it belongs on a phone: three facts about the RECORD, read
              after everything about the object. From `lg` it is dropped into the
              cell under the photograph, where it reads as the caption of a
              plate. The `-mt-6` cancels most of the grid's own 40px row gap so
              it hugs the picture at 16 rather than floating 40 below it.

              IT IS NOT ABOVE THE NAME ON A PHONE, AND THAT WAS MEASURED TWICE.
              Nested inside the gallery's cell it cost 56 pixels at 390 and put
              the basket button back at y 982 on an 844-pixel screen, which is
              the exact number `BuyBlock` was rewritten to get rid of. Placed
              here it costs the name, the price and the button nothing at all,
              and the block it replaces takes 150 pixels off the column.

              IT HAD COME UNSTUCK FROM THE PHOTOGRAPH, AND THE `-mt-6` WAS NOT
              THE REASON. The grid's rows were both automatic, and an item that
              spans two automatic rows hands its own leftover height to both of
              them. The buy column spans both, so on every reference whose column
              outran its picture the rows grew underneath it and carried the
              caption away from the plate it captions: 46 pixels at 1440 on the
              ThinkPad, 114 on the longest name in the export, 130 at 1280.
              `lg:grid-rows-[auto_1fr]` fixes row 1 to the photograph's own
              height — a spanning item contributes nothing to a track it crosses
              when it also crosses a flexible one — and hands the slack to row 2,
              where `lg:self-start` keeps the caption at the top of it. The gap
              is now the grid's 40 less the 24 pulled back, which is 16, on every
              reference at every width from lg up.

              THE PLATE IS NO LONGER PINNED, AND THAT IS WHAT THE FIX COST.
              Declaring row 1 as the photograph's height leaves a sticky element
              a containing block exactly its own size, so it cannot travel: the
              rule was worth 0 pixels of movement afterwards and 68 before, on
              the tail of long names only. Measured against what it was holding:
              at 1440 the whole spread is 752 pixels for the ThinkPad and 861 for
              the 211-character name, against 803 of viewport under a 157-pixel
              chrome, so more than nine references in ten never scroll this
              article at all and the pin had nothing to do. A caption that sits
              on its picture on 4 254 pages is worth more than 68 pixels of
              travel on a few hundred. */}
          <dl className="enter e-item flex flex-wrap items-baseline gap-x-3 gap-y-1 text-micro text-ink-3 lg:col-start-1 lg:row-start-2 lg:-mt-3 lg:self-start">
            {credit.map((fact, index) => (
              <div key={fact.label} className="flex items-baseline gap-3">
                {index > 0 ? (
                  <span aria-hidden className="text-rule-2">
                    /
                  </span>
                ) : null}
                <dt>{fact.label}</dt>
                <dd className="text-ink-2">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      {/* LA PROSE DU FOURNISSEUR, ET LE DOCUMENT.
          ==========================================================================

          POURQUOI CETTE SECTION N'EXISTAIT PAS, ET POURQUOI ELLE EXISTE
          MAINTENANT. L'en-tete de ce fichier disait « pas de description, parce
          que l'export n'en porte pas ». C'etait vrai : la synchronisation ne
          lisait que le prix, le stock et les images. Mesure depuis sur la source,
          99 % des produits en portent une, et elles sont maintenant en base.

          ELLE VIENT APRES LA DECISION, PAS AVANT. Le lecteur decide sur la
          photographie, le prix et la disponibilite — c'est le role de la colonne
          d'achat, et rien ne doit s'interposer entre le prix et le bouton. Ce
          qui suit s'adresse a celui qui a besoin d'en savoir plus AVANT de se
          decider, ou qui compare deux references. Le placer plus haut
          repousserait le bouton sous la ligne de flottaison sur un telephone.

          ELLE EST ABSENTE QUAND IL N'Y A RIEN, plutot que titree et vide. Un
          intertitre « Description » suivi du blanc apprend au lecteur que cette
          page est incomplete, et il cesse de chercher ailleurs. */}
      {avecProse ? (
        /* `id="description"` : c'est la cible du lien « Lire la description
           complete » de la colonne d'achat. `scroll-mt` laisse la place de
           l'en-tete colle, sans quoi le titre de la section arrivait dessous. */
        <section
          id="description"
          className={`shell mt-8 scroll-mt-28 sm:mt-10 ${avecLies ? '' : 'pb-band'}`}
        >
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            {/* LE TEXTE PRINCIPAL : la description detaillee quand le panel en
                porte une, sinon la description courte quand elle etait trop
                longue pour la colonne d'achat. `whitespace-pre-line` et non
                `pre-wrap` : le backend rend du texte pur, sauts de ligne
                conserves. La mesure `max-w-[68ch]` tient la ligne lisible. */}
            {detaillee || courteLongue ? (
              <div>
                <h2 className="t-label mb-3 text-ink-3">
                  {detaillee ? 'Description détaillée' : 'Description'}
                </h2>
                <p className="max-w-[68ch] text-body leading-[1.75] whitespace-pre-line text-ink-2">
                  {detaillee ?? courte}
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-8">
              {/* Les deux textes existent ET le court est long : il a ete coupe
                  en haut, on le rend en entier ici plutot que de le perdre. */}
              {detaillee && courteLongue ? (
                <div>
                  <h2 className="t-label mb-3 text-ink-3">Description</h2>
                  <p className="text-small leading-[1.7] whitespace-pre-line text-ink-2">{courte}</p>
                </div>
              ) : null}

              {/* LE DOCUMENT PORTE SON POIDS ET SON FORMAT, ET CE N'EST PAS
                  DECORATIF. Un lien qui ouvre 8 Mo sans prevenir, sur une
                  connexion facturee au megaoctet, est une depense imposee au
                  lecteur. Le dire avant le clic est la moindre des choses ici.

                  `download` PORTE LE NOM D'ORIGINE : le fichier est range sous
                  un UUID cote stockage, et sans cet attribut le visiteur
                  retrouverait « 8f3a-....pdf » dans ses telechargements. */}
              {fiche.fichePdf ? (
                <div>
                  <h2 className="t-label mb-3 text-ink-3">Document constructeur</h2>
                  <a
                    href={fiche.fichePdf.url}
                    download={fiche.fichePdf.nom}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-baseline gap-3 text-body font-semibold underline decoration-rule-2 underline-offset-[6px] transition-colors hover:decoration-ink"
                  >
                    <span>{fiche.fichePdf.nom}</span>
                    <span className="t-num text-micro font-normal text-ink-3">
                      PDF
                      {fiche.fichePdf.octets
                        ? ` · ${Math.max(1, Math.round(fiche.fichePdf.octets / 1024))} Ko`
                        : ''}
                    </span>
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {avecLies ? (
        <section className="shell mt-band pb-band">
          <SectionHeader
            title="À rapprocher"
            /* NOT "dans la même famille". The query starts in the family and
               widens to the parent when the family is too thin to fill a row,
               so on "Laptop ASUS", which holds five, it returns a Dell. A
               heading that claims family membership while showing a neighbour
               is the kind of small lie this catalogue is built to avoid, so the
               heading is loosened and the rule is printed under it. */
            context={`Les références les plus proches par famille, marque et prix. ${famille.nom} en compte ${formatAmount(famille.compte)}.`}
            action={{
              href: `/categorie/${famille.slug}`,
              label: 'Ouvrir la famille',
            }}
          />
          <ProductGrid products={fiche.lies} columns={5} />
        </section>
      ) : null}
    </>
  )
})
