import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { FamilyChips } from '@/components/catalog/FamilyChips'
import { FilteredListing, lireListeFiltree } from '@/components/catalog/FilteredListing'
import { PageHeader } from '@/components/layout/PageHeader'
import { lireNavigation } from '@/lib/catalogue-en-direct'
import { categorieParSlug, enfantsDeCategorie } from '@/lib/catalogue-vues'
import { formatAmount, formatCount } from '@/lib/format'
import { countFilters, readListing, scopedPlace, type ListingParams } from '@/lib/params'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingParams>
}

export const generateMetadata = metadonneesAvecPanne(async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const nav = await lireNavigation()
  const categorie = categorieParSlug(nav, slug)
  if (!categorie) return {}
  const { filters } = readListing(query, nav, scopedPlace('famille', categorie.slug, categorie.nom))
  return {
    title: categorie.nom,
    description: `${categorie.nom} : ${formatCount(categorie.compte, 'référence')} en stock chez NowTech Center. Retrait le jour même à Douala et Yaoundé, livraison en 24 à 48 h.`,
    // A filtered family is a subset of a page already indexed; see /catalogue.
    ...(countFilters(filters) > 0 ? { robots: { index: false, follow: true } } : {}),
  }
})

/**
 * A family.
 *
 * The WooCommerce term itself, at whatever depth it sits. A family holding
 * sub-families shows them above its grid and counts their stock into its own
 * total, which is how the shop counts it at the counter: "Onduleurs" means every
 * onduleur, not only the ones nobody filed one level deeper.
 *
 * WHY THE LEAD IS A FACT AND NOT A SENTENCE. There is no editorial copy for 268
 * families and there never will be, so writing one would mean generating 268
 * paragraphs of the same three adjectives. The line under the title states where
 * the page sits and how it is divided, which is the only thing that is both true
 * and different for every one of them.
 *
 * ITS PANEL HAS NO FAMILY GROUP. The family is the page, and a second family
 * ticked beside it would be unioned in and widen the grid past the title; the
 * sub-families are the chips above the grid, each a page of its own.
 *
 * IT DOES NOT REPEAT THE COUNT. The total is already printed on the title's own
 * baseline and again as a range above the grid; saying "307 références" a third
 * time inside the lead put the same number three times on one phone screen.
 */
export default avecPanneCatalogue(async function CategoriePage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])

  const nav = await lireNavigation()
  const categorie = categorieParSlug(nav, slug)
  if (!categorie) notFound()

  const lecture = await lireListeFiltree({
    nav,
    params: query,
    place: scopedPlace('famille', categorie.slug, categorie.nom),
  })
  if (!lecture) notFound()
  const { liste, identite } = lecture

  /* Same reason as on a department: the backend's children are tied by name,
     the site's by id, so they are derived from the navigation's tree. */
  const enfants = enfantsDeCategorie(nav, categorie)

  // Index 0 is always "Catalogue", which is a route and not a shelf: on a
  // category filed directly under a department the useful parent is the
  // department, and on one with no department there is no parent to name.
  const parent = identite.fil.length > 1 ? identite.fil[identite.fil.length - 1] : null

  return (
    <>
      <Breadcrumb path={identite.fil} current={identite.titre} />

      <PageHeader
        title={identite.titre}
        lead={
          [
            parent ? `Rangé sous ${parent.nom}.` : null,
            enfants.length > 0 ? `Découpé en ${formatCount(enfants.length, 'famille')}.` : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined
        }
        aside={
          liste.active > 0
            ? `${formatAmount(liste.total)} / ${formatAmount(identite.total)}`
            : `${formatAmount(liste.total)} références`
        }
      />

      {/* The anchor ScrollOnQuery returns to; see the department page. */}
      <section data-results className="shell pb-band">
        <FamilyChips familles={enfants} />
        <FilteredListing liste={liste} nav={nav} priorityCount={3} />
      </section>
    </>
  )
})
