import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesDevis } from './MesDevis'

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
      <p className="t-label text-ink-3">Mon compte</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Mes devis</h1>
      <p className="mt-2 text-small text-ink-2">Demandez un devis depuis votre panier ou une fiche produit : chaque boutique confirme sa partie, puis vous l’acceptez en ligne pour commander.</p>
      <div className="mt-7">
        <MesDevis />
      </div>
    </main>
  )
}
