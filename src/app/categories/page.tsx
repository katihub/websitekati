import type { Metadata } from 'next'
import Link from 'next/link'

import { lireCategoriesMarketplace } from '@/lib/marketplace-data'

/**
 * TOUTES LES CATEGORIES DE LA MARKETPLACE, TELLES QUE KATIHUB LES TIENT : une
 * carte par categorie, ses sous-categories et la garantie minimale qui s'y applique.
 */
export const metadata: Metadata = {
  title: 'Toutes les catégories',
  description: 'Parcourez les catégories et sous-catégories des boutiques vérifiées de KatiHub, avec la garantie minimale de chacune.',
}

export const revalidate = 300

export default async function CategoriesPage() {
  const categories = await lireCategoriesMarketplace()
  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pt-10 pb-band md:pt-14">
      <nav aria-label="Fil d’Ariane" className="text-micro text-ink-3"><Link href="/" className="hover:underline">Accueil</Link> › <span aria-current="page">Catégories</span></nav>
      <h1 className="mt-2 text-h3 font-semibold text-ink">Toutes les catégories</h1>
      <p className="mt-2 max-w-[60ch] text-small text-ink-2">Chaque catégorie fixe une garantie minimale : tous les vendeurs de la catégorie s’y engagent, certains offrent plus.</p>
      {categories.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="categories">
          {categories.map((categorie) => (
            <li key={categorie.id} className="rounded-well border border-rule p-4">
              <h2 className="text-h4 font-semibold"><Link href={`/categories/${categorie.slug}`} className="hover:underline">{categorie.nom}</Link></h2>
              <p className="text-micro text-ink-3">{categorie.garantie.mois ? `Garantie minimale : ${categorie.garantie.libelle}` : 'Sans garantie minimale imposée'}</p>
              {categorie.sousCategories.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {categorie.sousCategories.map((sous) => (
                    <li key={sous.id}><Link href={`/categories/${sous.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-rule px-3 text-micro hover:border-ink">{sous.nom}</Link></li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-well border border-rule bg-space p-4 text-small">Les catégories ne peuvent pas être chargées pour le moment. <Link href="/catalogue" className="text-secondary underline">Voir tout le catalogue</Link></p>
      )}
    </main>
  )
}
