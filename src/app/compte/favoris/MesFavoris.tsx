'use client'

import Link from 'next/link'

import { useListeClient } from '@/lib/listes-client'
import { useSession } from '@/lib/session'

const fcfa = (montant: number) => `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA`

export function MesFavoris() {
  const { session } = useSession()
  const favoris = useListeClient('favori')

  if (!favoris.elements.length) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Vous n’avez pas encore de favori. Touchez le cœur d’une fiche produit pour l’ajouter ici.</p>
      <Link href="/catalogue" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">Parcourir le catalogue</Link>
    </div>
  }

  return <div className="grid gap-4">
    {!session ? <p className="text-small text-ink-2">Ces favoris sont gardés dans ce navigateur. <Link href="/connexion?retour=%2Fcompte%2Ffavoris" className="text-secondary underline">Connectez-vous</Link> pour les retrouver sur tous vos appareils.</p> : null}
    <ul className="flex flex-col gap-2" data-testid="mes-favoris">
      {favoris.elements.map((element) => <li key={element.offreId} className="flex items-center justify-between gap-3 rounded-well border border-rule px-4 py-3">
        <Link href={`/marketplace/produits/${element.slug}${element.boutiqueSlug ? `?boutique=${element.boutiqueSlug}` : ''}`} className="min-w-0 hover:underline">
          <span className="block font-semibold text-ink">{element.nom}</span>
          <span className="block text-micro text-ink-3">{element.boutiqueNom ?? 'Boutique KatiMarket'}{element.prixFcfa !== null ? ` · ${fcfa(element.prixFcfa)}` : ''}</span>
        </Link>
        <button type="button" onClick={() => favoris.retirer(element.offreId)} className="min-h-11 shrink-0 rounded-control border border-rule px-3 text-small font-semibold">Retirer</button>
      </li>)}
    </ul>
  </div>
}
