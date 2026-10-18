import type { Metadata } from 'next'
import Link from 'next/link'

import { CategoriesProducts } from '@/components/marketplace/CategoriesProducts'
import {
  lireAccueilMarketplace,
  lireCategoriesMarketplace,
  type OffreMarketplace,
} from '@/lib/marketplace-data'
import styles from './categories.module.css'

/**
 * TOUTES LES CATEGORIES DE LA MARKETPLACE, TELLES QUE KATIHUB LES TIENT : une
 * carte par categorie, ses sous-categories et la garantie minimale qui s'y applique.
 */
export const metadata: Metadata = {
  title: 'Toutes les catégories',
  description: 'Parcourez les catégories et sous-catégories des boutiques vérifiées de KatiHub, avec la garantie minimale de chacune.',
}

export const revalidate = 300

const LIMITE_SELECTION = 5

function timestamp(offre: OffreMarketplace) {
  return offre.publieLe ? Date.parse(offre.publieLe) || 0 : 0
}

function nouveautes(offres: readonly OffreMarketplace[]) {
  return [...offres]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .slice(0, LIMITE_SELECTION)
}

function selection(offres: readonly OffreMarketplace[]) {
  return [...offres]
    .sort((a, b) => {
      const remiseA = a.prixReferenceFcfa && a.prixFcfa ? a.prixReferenceFcfa - a.prixFcfa : 0
      const remiseB = b.prixReferenceFcfa && b.prixFcfa ? b.prixReferenceFcfa - b.prixFcfa : 0
      return remiseB - remiseA || b.disponible - a.disponible || a.id.localeCompare(b.id)
    })
    .slice(0, LIMITE_SELECTION)
}

export default async function CategoriesPage() {
  const [categories, accueil] = await Promise.all([
    lireCategoriesMarketplace(),
    lireAccueilMarketplace(),
  ])
  const produitsRecents = nouveautes(accueil.offres)
  const produitsChoisis = selection(accueil.offres)

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <nav aria-label="Fil d’Ariane" className={styles.breadcrumb}>
          <Link href="/">Accueil</Link>
          <ArrowIcon />
          <span aria-current="page">Catégories</span>
        </nav>

        <header className={styles.intro}>
          <div>
            <h1>Toutes les catégories</h1>
            <p>
              Découvrez tous nos rayons et leurs sous-catégories. Chaque catégorie affiche la
              garantie minimale requise sur les produits vendus sur KatiHub.
            </p>
          </div>
          <Link href="/catalogue" className={styles.catalogueLink}>
            Voir tout le catalogue <ArrowIcon />
          </Link>
        </header>

        {categories.length ? (
          <ul className={styles.categories} data-testid="categories">
            {categories.map((categorie) => (
              <li key={categorie.id} className={styles.categoryCard}>
                <div className={styles.categoryHead}>
                  <span className={styles.categoryIcon} aria-hidden="true">
                    <CategoryIcon name={categorie.nom} />
                  </span>
                  <div>
                    <h2><Link href={`/categories/${categorie.slug}`}>{categorie.nom}</Link></h2>
                    <p className={categorie.garantie.mois ? styles.warranty : styles.warrantyMuted}>
                      <ShieldIcon />
                      {categorie.garantie.mois
                        ? `Garantie minimale : ${categorie.garantie.libelle}`
                        : 'Sans garantie minimale imposée'}
                    </p>
                  </div>
                </div>

                {categorie.sousCategories.length ? (
                  <ul className={styles.subcategories}>
                    {categorie.sousCategories.map((sous) => (
                      <li key={sous.id}>
                        <Link href={`/categories/${sous.slug}`}><span>{sous.nom}</span><ArrowIcon /></Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.noSubcategory}>Tous les produits de ce rayon sont réunis ici.</p>
                )}

                <Link href={`/categories/${categorie.slug}`} className={styles.categoryCta}>
                  Voir tout le rayon <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            Les catégories ne peuvent pas être chargées pour le moment.{' '}
            <Link href="/catalogue">Voir tout le catalogue</Link>
          </p>
        )}
      </main>

      <CategoriesProducts nouveautes={produitsRecents} selection={produitsChoisis} />
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5.5 5.7v5.5c0 4.2 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.6 6.5-9.8V5.7L12 3Z" />
      <path d="m9.4 12.1 1.7 1.7 3.7-4" />
    </svg>
  )
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function CategoryIcon({ name }: { name: string }) {
  const key = name.toLocaleLowerCase('fr')
  if (/informatique|ordinateur/.test(key)) return <svg viewBox="0 0 24 24"><path d="M4 5h16v11H4zM2.5 19h19M9 16v3m6-3v3" /></svg>
  if (/électroménager|electromenager/.test(key)) return <svg viewBox="0 0 24 24"><path d="M5 3h14v18H5zM5 8h14M8 5.5h.01M11 5.5h.01" /><circle cx="12" cy="14.5" r="4" /></svg>
  if (/électronique|electronique|téléphone|telephone/.test(key)) return <svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 5h4m-3 13.5h2" /></svg>
  if (/mode|style|vêtement|vetement/.test(key)) return <svg viewBox="0 0 24 24"><path d="m8 4-5 3 3 5 2-1v10h8V11l2 1 3-5-5-3c-.5 1.5-1.8 2.5-4 2.5S8.5 5.5 8 4Z" /></svg>
  if (/beauté|beaute|santé|sante/.test(key)) return <svg viewBox="0 0 24 24"><path d="M9 3h6v4l2 2v12H7V9l2-2V3Zm0 9h6m-3-3v6m-3-4.5h6" /></svg>
  if (/auto|moto/.test(key)) return <svg viewBox="0 0 24 24"><path d="m5 10 2-4h10l2 4 2 2v5H3v-5l2-2Zm0 0h14M6 17v2m12-2v2" /><circle cx="7" cy="14" r="1" /><circle cx="17" cy="14" r="1" /></svg>
  if (/sport|loisir/.test(key)) return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m6.5 6.5 11 11M9 3.5l-1 5-4.5.5m17 6-4.5.5-1 5M3.5 15l5 .5 1 5m5-17 1 5 5 .5" /></svg>
  if (/sécurité|securite|surveillance/.test(key)) return <svg viewBox="0 0 24 24"><path d="m3 8 13-3 2 8-13 3zM8 15l1 4m-4 1h8m5-10 3-1m-2 5 2 1" /><circle cx="11" cy="10.5" r="2.5" /></svg>
  if (/puériculture|puericulture|enfant|bébé|bebe/.test(key)) return <svg viewBox="0 0 24 24"><path d="M4 4h3l2 10h9l2-7H8m2 7a4 4 0 0 0 8 0" /><circle cx="10" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" /></svg>
  return <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21H3V10.5Z" /><path d="M9 21v-7h6v7" /></svg>
}
