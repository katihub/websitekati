import type { Metadata } from 'next'

import { DetailCommande } from './DetailCommande'

/**
 * LE SUIVI D'UNE COMMANDE, PAR SA REFERENCE.
 *
 * C'est ici que le client voit ou en est sa commande, et surtout c'est le
 * SEUL endroit ou il peut confirmer l'avoir recue — un geste que lui seul
 * peut poser, et sans lequel le comptoir ne peut pas clore « livree ».
 *
 * PAS INDEXEE : une reference dans un resultat de recherche est une reference
 * qu'un autre peut essayer. La commande est protegee par la session — ou, sans
 * compte, par le jeton de son lien —, mais la page n'a rien a faire dans un
 * moteur.
 */
export const metadata: Metadata = {
  title: 'Ma commande — NowTech Center',
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
  /* LE LIEN D'UNE COMMANDE SANS COMPTE porte sa cle : `?suivi=…`. */
  const { suivi } = await searchParams
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <DetailCommande
        reference={decodeURIComponent(reference)}
        jetonUrl={typeof suivi === 'string' && suivi ? suivi : undefined}
      />
    </main>
  )
}
