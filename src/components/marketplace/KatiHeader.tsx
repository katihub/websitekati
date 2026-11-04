import Link from 'next/link'
import { CartButton } from '@/components/layout/CartButton'
import { SUPPORT_WHATSAPP } from '@/constants/contact-marketplace'
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
        <div className={styles.supportContacts}>
          <a
            className={styles.supportWhatsApp}
            href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Contacter le support WhatsApp au ${SUPPORT_WHATSAPP}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            <span>{SUPPORT_WHATSAPP}</span>
          </a>
        </div>
        <TrustSlogan />
        <LanguageSwitcher />
        <LiensBarreHaut />
      </div></div>
      <div className={`${styles.shell} ${styles.mainbar}`}>
        <div className={styles.brandHome}>
          <KatiLogo />
          <Link href="/" className={styles.homeLink} aria-label="Accueil" title="Accueil">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" /></svg>
          </Link>
        </div>
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
