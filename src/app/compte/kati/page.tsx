import type { Metadata } from 'next'
import { connection } from 'next/server'

import { lireAccueilMarketplace } from '@/lib/marketplace-data'
import { MesKati } from './MesKati'
import styles from './kati.module.css'

/**
 * LE PORTEFEUILLE KATI DU CLIENT : soldes disponible et en attente, leur
 * valeur en FCFA, les gains a venir et l'historique. Reserve au client connecte.
 */
export const metadata: Metadata = {
  title: 'Mes KATI — KatiMarket',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  const accueil = await lireAccueilMarketplace()
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <span>Mon compte</span><b aria-hidden="true">/</b><span aria-current="page">Mes KATI</span>
        </nav>
        <MesKati recommendations={accueil.offres.slice(0, 10)} />
      </div>
    </main>
  )
}
