import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumb } from '@/components/catalog/Breadcrumb'
import { FamilyChips } from '@/components/catalog/FamilyChips'
import { FilteredListing, lireListeFiltree } from '@/components/catalog/FilteredListing'
import { PageHeader } from '@/components/layout/PageHeader'
import { lireNavigation } from '@/lib/catalogue-en-direct'
import { enfantsDuRayon, rayonParSlug } from '@/lib/catalogue-vues'
import { formatAmount } from '@/lib/format'
import { countFilters, readListing, scopedPlace, type ListingParams } from '@/lib/params'
import { avecPanneCatalogue, metadonneesAvecPanne } from '@/lib/panne-catalogue'

interface Params {
  params: Promise<{ slug: string }>
  searchParams: Promise<ListingParams>
}

export const generateMetadata = metadonneesAvecPanne(async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const nav = await lireNavigation()
  const rayon = rayonParSlug(nav, slug)
  if (!rayon) return {}
  const { filters } = readListing(query, nav, scopedPlace('rayon', rayon.slug, rayon.nom))
  return {
    title: rayon.nom,
    description: `${rayon.accroche ? `${rayon.accroche} ` : ''}${formatAmount(rayon.compte)} références en stock chez NowTech Center, à Douala et Yaoundé.`,
    // Same rule as /catalogue: a filtered state is a subset of a page already
    // indexed, and the combinations are not a space to invite a crawler into.
    ...(countFilters(filters) > 0 ? { robots: { index: false, follow: true } } : {}),
  }
})

/**
 * A department.
 *
 * One of the twelve. The layer above the WooCommerce tree rather than inside it:
 * these groupings are the merchant's own, read off the counter, and they are the
 * only level of this taxonomy a customer would recognise as a department in a
 * shop. The families listed at the top are the tree's, sorted by depth of stock.
 *
 * The page is the shared filtered listing, with the department as its scope. A
 * department, a family, a brand and the catalogue differ in what they contain,
 * not in what the reader does with them, and giving them different panels would
 * mean a customer who narrowed by one click has to relearn the page they are
 * already on.
 *
 * THE SLUG IS CHECKED AGAINST THE NAVIGATION BEFORE THE LISTING IS ASKED FOR.
 * The backend also accepts a department's internal id (`network`) where a slug
 * is expected; answered as a page, `/rayon/network` would have been a second
 * address for the same shelf.
 */
export default avecPanneCatalogue(async function RayonPage({ params, searchParams }: Params) {
  const [{ slug }, query] = await Promise.all([params, searchParams])

  const nav = await lireNavigation()
  const rayon = rayonParSlug(nav, slug)
  if (!rayon) notFound()

  const lecture = await lireListeFiltree({
    nav,
    params: query,
    place: scopedPlace('rayon', rayon.slug, rayon.nom),
  })
  if (!lecture) notFound()
  const { liste, identite } = lecture

  return (
    <>
      <Breadcrumb path={identite.fil} current={identite.titre} />

      <PageHeader
        title={identite.titre}
        lead={rayon.accroche ?? undefined}
        aside={
          liste.active > 0
            ? `${formatAmount(liste.total)} / ${formatAmount(identite.total)}`
            : `${formatAmount(liste.total)} références`
        }
      />

      {/* `data-results` is what ScrollOnQuery carries the reader back to when a
          filter, a sort or a page changes the set under them, and it sits above
          the families so the whole answer to the tap arrives on screen. */}
      <section data-results className="shell pb-band">
        {/* The families come from the navigation and not from `liste.enfants`:
            the backend breaks ties between two equally deep families by name,
            and the site has always broken them by id. See `parProfondeur`. */}
        <FamilyChips familles={enfantsDuRayon(nav, rayon.id)} />
        <FilteredListing liste={liste} nav={nav} priorityCount={3} />
      </section>
    </>
  )
})
