import type { Metadata } from 'next'

import { MesFavoris } from './MesFavoris'

/**
 * LES FAVORIS DU CLIENT : gardes dans le navigateur, et sur son compte quand il
 * est connecte, pour les retrouver sur un autre appareil.
 */
export const metadata: Metadata = {
  title: 'Mes favoris — KatiHub',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[48rem] px-4 pt-10 pb-band md:pt-14">
      <p className="t-label text-ink-3">Mon compte</p>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink">Mes favoris</h1>
      <div className="mt-7">
        <MesFavoris />
      </div>
    </main>
  )
}
