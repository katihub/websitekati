import Link from 'next/link'
import { CartButton } from '@/components/layout/CartButton'
import { SUPPORT_WHATSAPP_NUMBERS } from '@/constants/contact-marketplace'
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
  const annoncesSansAssistance = announcements.filter((annonce) =>
    !annonce.texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').includes('equipe a votre ecoute 24/7'),
  )
  return (
    <header className={styles.header} data-marketplace-header>
      <CaptureParrainage />
      <div className={styles.topbar} data-marketplace-topbar><div className={`${styles.shell} ${styles.topbarInner}`}>
        <KatiAnnouncementTicker announcements={annoncesSansAssistance} />
        <div className={styles.supportContacts} role="group" aria-label="Support WhatsApp">
          {SUPPORT_WHATSAPP_NUMBERS.map((numero) => (
            <a
              key={numero}
              className={styles.supportWhatsApp}
              href={`https://wa.me/${numero.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contacter le support WhatsApp au ${numero}`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.6 8.6 0 0 1-12.7 7.5L3 20.5l1.2-4.6a8.6 8.6 0 1 1 16.3-4.1Z" /><path d="M8.2 7.8c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4 0 .6l-.5.7c-.2.2-.2.4 0 .7.6 1 1.4 1.8 2.4 2.3.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .3-.2 1.3-.9 1.8-.6.5-1.3.7-2.1.5-.8-.2-1.8-.6-3-1.4-1.5-1-2.6-2.4-3-3.1-.4-.7-.9-1.7-.9-2.4 0-.8.4-1.3.7-1.5Z" /></svg>
              <span>{numero}</span>
            </a>
          ))}
        </div>
        <span className={styles.serviceNotice}><span aria-hidden="true">🎧</span>Une équipe à votre écoute 24/7</span>
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
