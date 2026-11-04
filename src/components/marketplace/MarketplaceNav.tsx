'use client'

import Link from 'next/link'
import { useMarketplaceLanguage } from '@/lib/language'
import type { CategorieArbre } from '@/lib/marketplace-data'
import { MobileCategoriesMenu } from './MobileCategoriesMenu'
import styles from './marketplace-shell-v2.module.css'

export function MarketplaceNav({ categories }: { categories: readonly CategorieArbre[] }) {
  const { text } = useMarketplaceLanguage()
  return <nav className={styles.nav} aria-label={text('allCategories')} data-marketplace-nav>
    <div className={`${styles.shell} ${styles.navInner}`}>
      <Link href="/categories" className={styles.allCategories}>▦ {text('allCategories')}</Link>
      <MobileCategoriesMenu categories={categories} />
      <div className={styles.navScroll}>
        {categories.slice(0, 6).map(categorie => <Link key={categorie.id} href={`/categories/${categorie.slug}`}>{categorie.nom}</Link>)}
        <Link href="/boutiques">{text('shops')}</Link>
        <Link href="/devenir-vendeur">{text('sell')}</Link>
      </div>
    </div>
  </nav>
}
