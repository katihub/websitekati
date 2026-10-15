import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesKati } from './MesKati'

/**
 * LE PORTEFEUILLE KATI DU CLIENT : soldes disponible et en attente, leur
 * valeur en FCFA, les gains a venir et l'historique. Reserve au client connecte.
 */
export const metadata: Metadata = {
  title: 'Mes KATI — KatiHub',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  return (
    <main className="mx-auto w-full max-w-[48rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Mon compte</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Mes KATI</h1>
      <p className="mt-2 text-small text-ink-2">Vos points de fidélité KatiHub : gagnés sur chaque commande livrée, utilisables pour payer une partie de vos achats.</p>
      <div className="mt-7">
        <MesKati />
      </div>
    </main>
  )
}
