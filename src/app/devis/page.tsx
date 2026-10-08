import type { Metadata } from 'next'
import { connection } from 'next/server'

import { Devis } from '@/components/devis/Devis'
import { PageHeader } from '@/components/layout/PageHeader'
import { lireConditions } from '@/lib/catalogue-en-direct'

/**
 * `/devis`, the page that stands where a checkout would.
 *
 * SIX SURFACES ALREADY POINT HERE and every one of them promises something
 * slightly different: the basket drawer says "Demander la proforma", the counter
 * strip says "Devis entreprise", the footer says "Facture proforma", the
 * homepage tile says "Demander un devis", the account menu says "Mon devis", and
 * the assistant says "Ouvrir un devis". They are all the same object, and the
 * lead below is written to be a true answer to all six at once: this shop takes
 * no money online, so the list of material IS the end of the journey.
 *
 * NOT INDEXED, AND THAT IS NOT A DETAIL. A quote is one browser's basket: the
 * page is different for every reader, identical and empty for every crawler, and
 * a search result promising a customer their own quote leads to a blank screen.
 * `follow` stays on, because the links out of the empty state into the catalogue
 * are worth crawling.
 *
 * The header is a server component and holds still. The count belongs to the
 * list below it rather than to the title: the basket only resolves after
 * hydration, and a page title that changes size a beat after it is read is worse
 * than a title that never carried the number.
 *
 * RENDERED ON EACH REQUEST, ALTHOUGH NOTHING HERE READS THE BACKEND. The layout
 * does: the masthead's departments and the footer's column come from the
 * navigation, and they fall back to nothing when it does not answer. As a static
 * page, a regeneration that ran during an outage was kept as valid — /devis was
 * served without its « Rayons » column until the next visit after the minute
 * had passed. Rendered per request, a page without departments is one response,
 * never a cache entry; the data cache still spares the backend the call.
 */
export const metadata: Metadata = {
  title: 'Votre devis',
  description:
    'Constituez votre liste de matériel, relevez la base HT, la TVA et le total TTC, ' +
    'puis envoyez-la au comptoir sur WhatsApp pour recevoir une facture proforma.',
  robots: { index: false, follow: true },
}

export default async function DevisPage() {
  await connection()
  const conditions = await lireConditions()
  return (
    <>
      <PageHeader
        title="Votre devis"
        /* THE DESCRIPTION IS THE THING PUT FORWARD, NOT A BLOCK ADDED UNDER IT.
           A three-step sequence was built below the header first, and the shop
           was right to reject it: asked to give one sentence more weight, it
           answered by writing more furniture, which pushed the sentence further
           down the page it was meant to lead. So the paragraph itself is
           promoted, in place, with `emphasis`.

           The sentence is also cut down to what carries the page. Three facts,
           in the order a doubt arrives: nothing is paid here, this becomes a
           proforma, a person sends it. The two words that answer the doubt are
           the only marked ones. */
        lead={
          <>
            Rien ne se paie en ligne ici. Cette page transforme votre liste en{' '}
            <strong className="font-semibold text-ink">facture proforma</strong>, et c’est{' '}
            <strong className="font-semibold text-ink">un humain au comptoir</strong> qui vous la
            renvoie.
          </>
        }
        emphasis
      />
      <Devis conditions={conditions} />
    </>
  )
}
