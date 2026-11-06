import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CatalogueProductCard } from '@/components/marketplace/CatalogueProductCard'
import { ShopIcon } from '@/components/marketplace/ShopIcon'
import { lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'
import { categoriesDansUnivers, universPourSlug } from '@/lib/univers-categories'
import styles from './univers.module.css'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const univers = universPourSlug((await params).slug)
  return univers
    ? {
        title: univers.nom,
        description: `Découvrez les offres des catégories ${univers.nom} chez les boutiques vérifiées KatiMarket.`,
        alternates: { canonical: `/univers/${univers.slug}` },
      }
    : { title: 'Univers KatiMarket' }
}

export default async function UniversPage({ params }: Props) {
  const univers = universPourSlug((await params).slug)
  if (!univers) notFound()

  const categories = categoriesDansUnivers(await lireCategoriesMarketplace(), univers)
  if (!categories.length) notFound()

  const sections = await Promise.all(categories.map(async (categorie) => ({
    categorie,
    liste: await lireOffresMarketplace({
      categorieSlug: categorie.slug,
      page: 1,
      taille: 8,
      tri: 'recent',
    }),
  })))

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link><span>›</span><Link href="/categories">Catégories</Link><span>›</span>
          <span aria-current="page">{univers.nom}</span>
        </nav>
        <header className={styles.hero}>
          <ShopIcon name={univers.icone} />
          <div>
            <p>UNIVERS KATIMARKET</p>
            <h1>{univers.nom}</h1>
            <span>Les catégories réunies au même endroit, auprès de boutiques locales vérifiées.</span>
          </div>
          <Link href="/mon-budget"><ShopIcon name="wallet" /> Trouver selon mon budget</Link>
        </header>

        <nav className={styles.categoryNav} aria-label={`Catégories ${univers.nom}`}>
          {sections.map(({ categorie }) => (
            <a key={categorie.id} href={`#${categorie.slug}`}><ShopIcon name="grid" />{categorie.nom}</a>
          ))}
        </nav>

        {sections.map(({ categorie, liste }) => (
          <section className={styles.categorySection} id={categorie.slug} key={categorie.id}>
            <header>
              <div><p>CATÉGORIE</p><h2>{categorie.nom}</h2></div>
              <Link href={`/categories/${categorie.slug}`}>Voir toutes les offres <ShopIcon name="arrow" /></Link>
            </header>
            {categorie.sousCategories.length ? (
              <nav className={styles.subcategories} aria-label={`Sous-catégories ${categorie.nom}`}>
                {categorie.sousCategories.map((sousCategorie) => (
                  <Link key={sousCategorie.id} href={`/categories/${sousCategorie.slug}`}>
                    {sousCategorie.nom}<ShopIcon name="arrow" />
                  </Link>
                ))}
              </nav>
            ) : null}
            {liste.indisponible
              ? <p className={styles.message} role="status">Les offres de cette catégorie sont momentanément indisponibles.</p>
              : liste.offres.length
                ? <div className={styles.products}>{liste.offres.map((offre) => <CatalogueProductCard key={offre.id} offer={offre} />)}</div>
                : <p className={styles.message}>Aucune offre disponible pour le moment.</p>}
          </section>
        ))}
      </div>
    </div>
  )
}
