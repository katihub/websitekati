'use client'

import Link from 'next/link'
import { useMarketplaceLanguage } from '@/lib/language'
import type { CategorieArbre } from '@/lib/marketplace-data'
import { MobileCategoriesMenu } from './MobileCategoriesMenu'
import { iconeCategorieMarketplace, ShopIcon } from './ShopIcon'
import styles from './marketplace-shell-v2.module.css'

export function MarketplaceNav({ categories }: { categories: readonly CategorieArbre[] }) {
  const { text } = useMarketplaceLanguage()
  return <nav className={styles.nav} aria-label={text('allCategories')} data-marketplace-nav>
    <div className={`${styles.shell} ${styles.navInner}`}>
      <Link href="/categories" className={`${styles.allCategories} ${styles.navLink}`}>
        <ShopIcon name="grid" className={styles.navIcon} />{text('allCategories')}
      </Link>
      <MobileCategoriesMenu categories={categories} />
      <div className={styles.navScroll}>
        {categories.map(categorie => (
          <Link key={categorie.id} href={`/categories/${categorie.slug}`} className={styles.navLink}>
            <ShopIcon name={iconeCategorieMarketplace(categorie.nom)} className={styles.navIcon} />{categorie.nom}
          </Link>
        ))}
        <Link href="/boutiques" className={styles.navLink}><ShopIcon name="bag" className={styles.navIcon} />{text('shops')}</Link>
        <Link href="/promotions" className={styles.navLink}><ShopIcon name="tag" className={styles.navIcon} />{text('promotionsMenu')}</Link>
        <Link href="/devenir-vendeur" className={styles.navLink}><ShopIcon name="tag" className={styles.navIcon} />{text('sell')}</Link>
      </div>
    </div>
  </nav>
}
