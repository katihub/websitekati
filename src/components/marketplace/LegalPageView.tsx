import Link from 'next/link'

import { LocalizedText } from '@/lib/language'
import { LegalFilAriane, LegalPageCorps, type VersionAffichee } from './LegalPageCorps'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import { legalPages, type LegalPage, type LegalSlug } from './legal-content'
import styles from './legal-page.module.css'

const links: { href: `/${LegalSlug}`; fr: string; en: string; icon: ShopIconName }[] = [
  { href: '/conditions-generales-vente', fr: 'Conditions générales de vente', en: 'General terms of sale', icon: 'bag' },
  { href: '/mentions-legales', fr: 'Mentions légales', en: 'Legal notice', icon: 'info' },
  { href: '/politique-confidentialite', fr: 'Politique de confidentialité', en: 'Privacy policy', icon: 'shield' },
  { href: '/cookies', fr: 'Politique de cookies', en: 'Cookie policy', icon: 'grid' },
  { href: '/conditions', fr: 'Conditions d’utilisation', en: 'Terms of use', icon: 'bookmark' },
  { href: '/contrat-vendeurs', fr: 'Contrat avec les vendeurs', en: 'Seller agreement', icon: 'package' },
  { href: '/livraison-retours', fr: 'Livraison et retours', en: 'Delivery and returns', icon: 'truck' },
  { href: '/securite', fr: 'Sécurité des achats', en: 'Shopping safely', icon: 'check' },
]

/**
 * UNE PAGE LEGALE. Son texte vient du panel (version publiee, FR et EN) ; sans
 * reponse de l'API, celui du code (`legal-content.ts`) sert de secours.
 */
export function LegalPageView({ slug, fr, en = null, version = null }: { slug: LegalSlug; fr: LegalPage; en?: LegalPage | null; version?: VersionAffichee | null }) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <LegalFilAriane fr={fr.title} en={en?.title ?? null} />
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Aide et informations">
            <h2><ShopIcon name="info" /> <LocalizedText fr="Aide & informations" en="Help & information" /></h2>
            <nav aria-label="Pages d’information">
              {links.map(link => <Link key={link.href} href={link.href} aria-current={link.href === `/${slug}` ? 'page' : undefined}><ShopIcon name={link.icon} /><span><LocalizedText fr={link.fr} en={link.en} /></span><span aria-hidden="true">›</span></Link>)}
              <Link href="/contact"><ShopIcon name="headphones" /><span><LocalizedText fr="Nous contacter" en="Contact us" /></span><span aria-hidden="true">›</span></Link>
            </nav>
          </aside>
          <div className={styles.content}>
            <LegalPageCorps slug={slug} fr={fr} en={en} version={version} />
            <div className={styles.help}><div><strong><LocalizedText fr="Une question sur ces informations ?" en="A question about this information?" /></strong><p><LocalizedText fr="Notre équipe peut vous orienter sur une commande, un compte ou une boutique." en="Our team can help with an order, an account or a shop." /></p></div><Link href="/contact"><LocalizedText fr="Nous contacter" en="Contact us" /> <ShopIcon name="arrow" /></Link></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { legalPages }
export type { LegalPage }
