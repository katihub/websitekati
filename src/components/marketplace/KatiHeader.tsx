import { CartButton } from '@/components/layout/CartButton'
import { lireCategoriesMarketplace } from '@/lib/marketplace-data'
import { lireAnnonces } from '@/lib/announcements'
import { ActionsCompte, LiensBarreHaut } from './KatiHeaderCompte'
import { KatiLogo } from './KatiLogo'
import { KatiAnnouncementTicker } from './KatiAnnouncementTicker'
import { MarketplaceSearchForm } from './MarketplaceSearchForm'
import { LanguageSwitcher, TrustSlogan } from './LanguageSwitcher'
import { MarketplaceNav } from './MarketplaceNav'
import { CaptureParrainage } from './kati/CaptureParrainage'
import styles from './marketplace-shell-v2.module.css'

/** Les six premieres categories restent dans la barre ; l'arbre entier alimente le mega-menu responsive. */
export async function KatiHeader() {
  const [categories, announcements] = await Promise.all([lireCategoriesMarketplace(), lireAnnonces()])
  return (
    <header className={styles.header} data-marketplace-header>
      <CaptureParrainage />
      <div className={styles.topbar} data-marketplace-topbar><div className={`${styles.shell} ${styles.topbarInner}`}>
        <KatiAnnouncementTicker announcements={announcements} />
        <TrustSlogan />
        <LanguageSwitcher />
        <LiensBarreHaut />
      </div></div>
      <div className={`${styles.shell} ${styles.mainbar}`}>
        <KatiLogo />
        <MarketplaceSearchForm className={styles.search} />
        <div className={styles.actions} data-marketplace-actions>
          <ActionsCompte />
          <CartButton href="/panier" />
        </div>
      </div>
      <MarketplaceNav categories={categories} />
    </header>
  )
}
