import type { Metadata } from 'next'

import { PaiementDeCommande } from './PaiementDeCommande'

/**
 * PAYER UNE COMMANDE, PAR SA REFERENCE.
 *
 * WHO REACHES THIS PAGE TODAY. The counter, mostly: a customer telephones,
 * the counter raises the order and sends them this link, and they pay from
 * wherever they are. That is a real workflow this shop already runs over
 * WhatsApp, and it is the reason this page is worth having before the online
 * basket can create orders by itself.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not a checkout. The storefront cannot
 * yet turn a basket into an order — the tunnel still ends on a WhatsApp
 * message — so nothing here pretends to close a sale. It settles an order
 * that already exists, which is a smaller and honest claim.
 *
 * NOT INDEXED, AND NOT BECAUSE IT IS SECRET. A reference in a search result
 * is a reference someone else can try; the order itself is protected by the
 * session, but the page has no business being crawled.
 */
export const metadata: Metadata = {
  title: 'Régler ma commande — NowTech Center',
  robots: { index: false, follow: false },
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>
}) {
  const { reference } = await params
  const { suivi } = await searchParams

  return (
    <main className="mx-auto w-full max-w-[34rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Commande</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">
        {decodeURIComponent(reference)}
      </h1>
      <p className="mt-2 max-w-[52ch] text-small text-ink-2">
        Réglez par Mobile Money ou Orange Money. Votre téléphone sonnera : composez votre code
        secret pour valider.
      </p>

      <div className="mt-7">
        <PaiementDeCommande
          reference={decodeURIComponent(reference)}
          jetonUrl={typeof suivi === 'string' && suivi ? suivi : undefined}
        />
      </div>
    </main>
  )
}
