'use client'

import Link from 'next/link'
import { useMarketplaceLanguage } from '@/lib/language'
import type { CategorieArbre } from '@/lib/marketplace-data'
import { MobileCategoriesMenu } from './MobileCategoriesMenu'
import { CATEGORY_ICON } from './ProductCardAccueil'
import styles from './marketplace-shell-v2.module.css'

export function MarketplaceNav({ categories }: { categories: readonly CategorieArbre[] }) {
  const { text } = useMarketplaceLanguage()
  return <nav className={styles.nav} aria-label={text('allCategories')} data-marketplace-nav>
    <div className={`${styles.shell} ${styles.navInner}`}>
      <Link href="/categories" className={`${styles.allCategories} ${styles.navLink}`}>
        <span className={styles.navIcon} aria-hidden="true">▦</span>{text('allCategories')}
      </Link>
      <MobileCategoriesMenu categories={categories} />
      <div className={styles.navScroll}>
        {categories.map(categorie => (
          <Link key={categorie.id} href={`/categories/${categorie.slug}`} className={styles.navLink}>
            <span className={styles.navIcon} aria-hidden="true">{CATEGORY_ICON[categorie.nom] ?? '📦'}</span>{categorie.nom}
          </Link>
        ))}
        <Link href="/boutiques" className={styles.navLink}><span className={styles.navIcon} aria-hidden="true">🏬</span>{text('shops')}</Link>
        <Link href="/devenir-vendeur" className={styles.navLink}><span className={styles.navIcon} aria-hidden="true">🏷️</span>{text('sell')}</Link>
      </div>
    </div>
  </nav>
}
