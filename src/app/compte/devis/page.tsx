import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesDevis } from './MesDevis'
import { LocalizedText } from '@/lib/language'

/**
 * LES DEVIS MARKETPLACE DU CLIENT : demandes en cours, reponses des boutiques,
 * devis acceptes et devenus commandes. Reserve au client connecte.
 */
export const metadata: Metadata = {
  title: 'Mes devis — KatiMarket',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  return (
    <main className="mx-auto w-full max-w-[48rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3"><LocalizedText fr="Mon compte" en="My account" /></p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink"><LocalizedText fr="Mes devis" en="My quotes" /></h1>
      <p className="mt-2 text-small text-ink-2"><LocalizedText fr="Demandez un devis depuis votre panier ou une fiche produit : chaque boutique confirme sa partie, puis vous l’acceptez en ligne pour commander." en="Request a quote from your cart or a product page. Each shop confirms its part, then you can accept online to place your order." /></p>
      <div className="mt-7">
        <MesDevis />
      </div>
    </main>
  )
}
