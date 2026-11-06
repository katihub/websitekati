'use client'

import Link from 'next/link'
import { useMarketplaceLanguage } from '@/lib/language'
import type { CategorieArbre } from '@/lib/marketplace-data'
import { MobileCategoriesMenu } from './MobileCategoriesMenu'
import { ShopIcon } from './ShopIcon'
import styles from './marketplace-shell-v2.module.css'
import orderStyles from './marketplace-nav-order.module.css'
import { UNIVERS_CATEGORIES } from '@/lib/univers-categories'

export function MarketplaceNav({ categories }: { categories: readonly CategorieArbre[] }) {
  const { text } = useMarketplaceLanguage()
  return <nav className={`${styles.nav} ${orderStyles.navOrder}`} aria-label={text('allCategories')} data-marketplace-nav>
    <div className={`${styles.shell} ${styles.navInner}`}>
      <Link href="/categories" className={`${styles.allCategories} ${styles.navLink} ${orderStyles.allCategories}`}>
        <ShopIcon name="grid" className={styles.navIcon} />{text('allCategories')}
      </Link>
      <MobileCategoriesMenu categories={categories} className={orderStyles.mobileCategories} />
      <Link href="/boutiques" className={styles.navLink}><ShopIcon name="bag" className={styles.navIcon} />{text('shops')}</Link>
      <Link href="/mon-budget" className={styles.navLink}><ShopIcon name="wallet" className={styles.navIcon} />Mon Budget</Link>
      <div className={styles.navScroll}>
        {UNIVERS_CATEGORIES.map((univers) => (
          <Link key={univers.slug} href={`/univers/${univers.slug}`} className={styles.navLink}>
            <ShopIcon name={univers.icone} className={styles.navIcon} />{univers.nom}
          </Link>
        ))}
        <Link href="/promotions" className={styles.navLink}><ShopIcon name="tag" className={styles.navIcon} />{text('promotionsMenu')}</Link>
        <Link href="/soldes" className={styles.navLink}><ShopIcon name="tag" className={styles.navIcon} />{text('salesMenu')}</Link>
        <Link href="/devenir-vendeur" className={styles.navLink}><ShopIcon name="tag" className={styles.navIcon} />{text('sell')}</Link>
      </div>
    </div>
  </nav>
}
