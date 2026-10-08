import type { Metadata } from 'next'
import { connection } from 'next/server'

import { lireConditions, lirePointsVente } from '@/lib/catalogue-en-direct'
import { avecPanneCatalogue } from '@/lib/panne-catalogue'

import { ValiderCommande } from './ValiderCommande'

/**
 * VALIDER LE PANIER EN UNE COMMANDE, POUR UN CLIENT CONNECTE.
 *
 * C'EST LA PORTE QUI MANQUAIT. Jusqu'ici le tunnel s'arretait sur WhatsApp,
 * meme pour un client connecte : la vitrine ne creait aucune commande. Cet
 * ecran appelle enfin `POST /commandes`, choisit la remise et le paiement, et
 * mene soit au paiement en ligne, soit au suivi de la commande.
 *
 * LE CHEMIN WHATSAPP RESTE, ET RESTE LE DEFAUT. Un visiteur qui ne se
 * connectera jamais commande toujours par devis ; cet ecran s'ajoute pour
 * ceux qui ont un compte, il ne remplace rien.
 *
 * PAS INDEXEE : une page qui suppose une session et un panier n'a rien a
 * faire dans un resultat de recherche.
 */
export const metadata: Metadata = {
  title: 'Valider ma commande — NowTech Center',
  robots: { index: false, follow: false },
}

/**
 * LES COMPTOIRS SONT CEUX DU PANEL, LUS A LA DEMANDE. La commande enregistre la
 * cle du comptoir choisi : proposer une liste figee au build, c'est proposer un
 * comptoir ferme depuis. `connection()` garde le build hors du backend.
 */
export default avecPanneCatalogue(async function Page() {
  await connection()
  const [pointsVente, conditions] = await Promise.all([lirePointsVente(), lireConditions()])

  return (
    <main className="mx-auto w-full max-w-[46rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Commande</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">
        Valider ma commande
      </h1>
      <p className="mt-2 max-w-[58ch] text-small text-ink-2">
        Choisissez comment vous récupérez et réglez votre commande. Les prix sont revérifiés au
        moment de la validation.
      </p>

      <div className="mt-7">
        <ValiderCommande pointsVente={pointsVente} conditions={conditions} />
      </div>
    </main>
  )
})
