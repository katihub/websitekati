import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { dialable } from '@/constants/site'
import { lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'
import { shopPhone } from '@/lib/comptoirs'

/**
 * LA PAGE QUE LE TRAVAILLEUR DE SERVICE SERT QUAND LE RÉSEAU TOMBE.
 *
 * Elle existe pour une raison simple : sur ce marché la connexion se coupe,
 * et ce que le navigateur affiche alors — son dinosaure, sa page d'erreur —
 * ne dit rien d'utile et ressemble à une panne de la boutique. Celle-ci dit
 * ce qui se passe, et donne le numéro du comptoir, qui est le canal qui
 * marche quand les données ne marchent pas.
 *
 * Elle est mise en cache à l'installation de l'application, donc elle doit
 * rester légère : ni catalogue, ni session, ni image distante. Le numéro est
 * la seule lecture, celle des comptoirs que le layout fait déjà : c'est le
 * panel qui le tient, et la copie mise en cache est celle du jour où elle a été
 * gardée.
 *
 * RENDUE À CHAQUE REQUÊTE. Son en-tête et son pied de page, eux, lisent la
 * navigation. Statique, elle était régénérée par le préchargement des liens de
 * la page d'erreur pendant une panne, et gardée sans rayons (0 lien /rayon/
 * contre 14) : c'est cette version que le travailleur de service aurait mise
 * de côté. Rendue à la demande, une version sans rayons n'est plus qu'une
 * réponse, et `public/sw.js` refuse de la garder.
 */
export const metadata: Metadata = {
  title: 'Hors ligne',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  const phone = shopPhone(await lirePointsVenteOuVide())

  return (
    <main className="mx-auto w-full max-w-[34rem] px-4 pt-16 pb-band text-center md:pt-24">
      <p className="t-label text-ink-3">Connexion</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">
        Vous êtes hors ligne
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-small leading-[1.6] text-ink-2">
        Le catalogue a besoin du réseau pour afficher les prix et les disponibilités du jour.
        Reconnectez-vous, ou appelez le comptoir — c’est le plus rapide.
      </p>

      {phone ? (
        <a
          href={`tel:${dialable(phone)}`}
          className="press fill mt-7 inline-flex min-h-12 items-center justify-center rounded-control bg-secondary px-6 text-small font-bold text-on-surface [--fill-to:var(--secondary)]"
        >
          Appeler le comptoir · {phone}
        </a>
      ) : null}

      <p className="mt-6">
        <Link href="/" className="text-micro text-secondary underline underline-offset-2">
          Réessayer
        </Link>
      </p>
    </main>
  )
}
