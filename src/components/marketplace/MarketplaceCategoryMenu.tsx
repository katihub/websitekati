import Link from 'next/link'

import { categoriesDuMenu } from '@/lib/menu-categories'
import type { RayonAccueil } from './RayonsAccueil'
import { iconeCategorieMarketplace, ShopIcon } from './ShopIcon'
import styles from './marketplace-home-v2.module.css'

export function MarketplaceCategoryMenu({ rayons }: { rayons: RayonAccueil[] }) {
  return <aside className={styles.categoryMenu} aria-label="Catégories de produits">
    <h2><span aria-hidden="true">☰</span>Toutes les catégories</h2>
    <ul className={styles.categoryList}>
      {categoriesDuMenu(rayons).map((rayon) => {
        const sousCategories = rayon.sousCategories
        return <li className={styles.categoryItem} key={rayon.slug}>
          <Link className={styles.categoryLink} href={`/categories/${rayon.slug}`} aria-haspopup={sousCategories.length ? 'true' : undefined}>
            <ShopIcon name={iconeCategorieMarketplace(rayon.nom)} />
            <span>{rayon.nom}</span>
            <b aria-hidden="true">›</b>
          </Link>
          {sousCategories.length ? <section className={styles.categorySubmenu} aria-label={`Sous-catégories de ${rayon.nom}`}>
            <header>
              <div><small>Explorer le rayon</small><h3>{rayon.nom}</h3></div>
              <span>{sousCategories.length} sous-catégorie{sousCategories.length > 1 ? 's' : ''}</span>
            </header>
            <div className={styles.categorySubmenuGrid}>
              {sousCategories.map((sousCategorie) => <Link key={sousCategorie.slug} href={`/categories/${sousCategorie.slug}`}>
                <span>{sousCategorie.nom}</span><b aria-hidden="true">→</b>
              </Link>)}
            </div>
            <Link className={styles.categoryViewAll} href={`/categories/${rayon.slug}`}>Voir tous les produits <span aria-hidden="true">→</span></Link>
          </section> : null}
        </li>
      })}
      <li className={styles.categoryItem}>
        <Link className={styles.categoryLink} href="/categories"><ShopIcon name="grid" /><span>Plus de catégories</span><b aria-hidden="true">›</b></Link>
      </li>
    </ul>
  </aside>
}
