import Link from 'next/link'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import { legalPages, type LegalPage, type LegalSlug } from './legal-content'
import styles from './legal-page.module.css'

const links: { href: `/${LegalSlug}`; label: string; icon: ShopIconName }[] = [
  { href: '/conditions-generales-vente', label: 'Conditions générales de vente', icon: 'bag' },
  { href: '/mentions-legales', label: 'Mentions légales', icon: 'info' },
  { href: '/politique-confidentialite', label: 'Politique de confidentialité', icon: 'shield' },
  { href: '/cookies', label: 'Politique de cookies', icon: 'grid' },
  { href: '/conditions', label: 'Conditions d’utilisation', icon: 'bookmark' },
  { href: '/contrat-vendeurs', label: 'Contrat avec les vendeurs', icon: 'package' },
  { href: '/livraison-retours', label: 'Livraison et retours', icon: 'truck' },
  { href: '/securite', label: 'Sécurité des achats', icon: 'check' },
]

export function LegalPageView({ slug, page }: { slug: LegalSlug; page: LegalPage }) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav aria-label="Fil d’Ariane" className={styles.breadcrumb}>
          <Link href="/"><ShopIcon name="home" /> Accueil</Link><span aria-hidden="true">›</span><span>{page.title}</span>
        </nav>
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Aide et informations">
            <h2><ShopIcon name="info" /> Aide & informations</h2>
            <nav aria-label="Pages d’information">
              {links.map(link => <Link key={link.href} href={link.href} aria-current={link.href === `/${slug}` ? 'page' : undefined}><ShopIcon name={link.icon} /><span>{link.label}</span><span aria-hidden="true">›</span></Link>)}
              <Link href="/contact"><ShopIcon name="headphones" /><span>Nous contacter</span><span aria-hidden="true">›</span></Link>
            </nav>
          </aside>
          <div className={styles.content}>
            <header className={styles.hero}>
              <div className={styles.heroText}><span>{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div>
              <div className={styles.heroArt} aria-hidden="true"><ShopIcon name="shield" /><span>§</span></div>
            </header>
            <div className={styles.notice}><ShopIcon name="info" /><p>Version de travail du 11 octobre 2026. Cette page ne vaut pas validation juridique : l’identité de l’exploitant, les mentions « à compléter » et les conditions financières doivent être confirmées dans le procès-verbal de clôture P0 avant tout pilote réel.</p></div>
            <div className={styles.cards}>
              {page.sections.map((section, index) => <section className={styles.card} key={section.title}>
                <div className={styles.cardHeading}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><h2>{section.title}</h2></div>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul> : null}
              </section>)}
            </div>
            <div className={styles.help}><div><strong>Une question sur ces informations ?</strong><p>Notre équipe peut vous orienter sur une commande, un compte ou une boutique.</p></div><Link href="/contact">Nous contacter <ShopIcon name="arrow" /></Link></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { legalPages }
