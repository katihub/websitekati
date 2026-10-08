import type { Metadata } from 'next'
import { connection } from 'next/server'

import { MesCommandes } from './MesCommandes'

/**
 * LA LISTE DES COMMANDES DU CLIENT.
 *
 * Le point d'entree du suivi : de la on ouvre chaque commande, on la regle si
 * elle attend un paiement en ligne, on confirme sa reception. Reserve au
 * client connecte — la liste n'existe pas sans session.
 *
 * RENDUE A CHAQUE REQUETE, pour la meme raison que /devis : l'en-tete et le
 * pied de page lisent la navigation, et une page statique regeneree pendant une
 * panne etait gardee comme valide, sans ses rayons, jusqu'a la visite suivante.
 */
export const metadata: Metadata = {
  title: 'Mes commandes — NowTech Center',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Mon compte</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Mes commandes</h1>
      <div className="mt-7">
        <MesCommandes />
      </div>
    </main>
  )
}
