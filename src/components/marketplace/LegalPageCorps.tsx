'use client'

import Link from 'next/link'

import { useMarketplaceLanguage } from '@/lib/language'
import { ShopIcon } from './ShopIcon'
import { TexteRiche } from './TexteRiche'
import type { LegalPage, LegalSlug } from './legal-content'
import styles from './legal-page.module.css'

export interface VersionAffichee {
  numero: number
  publieLe: string
  enVigueur: boolean
}

const dateLongue = (iso: string, en: boolean) => new Intl.DateTimeFormat(en ? 'en-GB' : 'fr-FR', { dateStyle: 'long' }).format(new Date(iso))

/**
 * LE CORPS D'UNE PAGE LEGALE, DANS LA LANGUE DU VISITEUR. Le francais et
 * l'anglais sont lus ensemble par le serveur ; sans anglais publie et a jour,
 * le visiteur anglophone lit le francais, qui fait foi, avec une mention.
 */
export function LegalPageCorps({ slug, fr, en, version }: { slug: LegalSlug; fr: LegalPage; en: LegalPage | null; version: VersionAffichee | null }) {
  const { locale } = useMarketplaceLanguage()
  const anglais = locale === 'en'
  const page = anglais && en ? en : fr
  return <>
    <header className={styles.hero}>
      <div className={styles.heroText}>{page.eyebrow ? <span>{page.eyebrow}</span> : null}<h1>{page.title}</h1><p><TexteRiche texte={page.intro} /></p></div>
      <div className={styles.heroArt} aria-hidden="true"><ShopIcon name="shield" /><span>§</span></div>
    </header>
    {anglais && !en ? <div className={styles.notice} data-testid="anglais-a-venir"><ShopIcon name="info" /><p>English version coming soon. The French text below is the version in force.</p></div> : null}
    <div className={styles.notice} data-testid="version-page-legale"><ShopIcon name="info" /><p>{version
      ? version.enVigueur
        ? <>{anglais ? `Version ${version.numero}, in force since ${dateLongue(version.publieLe, true)}. ` : `Version ${version.numero}, en vigueur depuis le ${dateLongue(version.publieLe, false)}. `}<Link href={`/${slug}/versions`}>{anglais ? 'Previous versions' : 'Versions précédentes'}</Link></>
        : <>{anglais ? `Archived version ${version.numero} of ${dateLongue(version.publieLe, true)}, no longer in force. ` : `Version ${version.numero} du ${dateLongue(version.publieLe, false)}, archivée : elle ne s’applique plus. `}<Link href={`/${slug}`}>{anglais ? 'Read the version in force' : 'Lire la version en vigueur'}</Link></>
      : 'Version de travail du 11 octobre 2026. Cette page ne vaut pas validation juridique : l’identité de l’exploitant, les mentions « à compléter » et les conditions financières doivent être confirmées dans le procès-verbal de clôture P0 avant tout pilote réel.'}</p></div>
    <div className={styles.cards}>
      {page.sections.map((section, index) => <section className={styles.card} key={`${index}-${section.title}`}>
        <div className={styles.cardHeading}><span className={styles.number}>{String(index + 1).padStart(2, '0')}</span><h2>{section.title}</h2></div>
        {section.paragraphs.map((paragraph, i) => <p key={i}><TexteRiche texte={paragraph} /></p>)}
        {section.bullets ? <ul>{section.bullets.map((bullet, i) => <li key={i}><TexteRiche texte={bullet} /></li>)}</ul> : null}
      </section>)}
    </div>
  </>
}

/** Le fil d’Ariane, au-dessus de la page, avec le titre dans la langue du visiteur. */
export function LegalFilAriane({ fr, en }: { fr: string; en: string | null }) {
  const { locale } = useMarketplaceLanguage()
  const anglais = locale === 'en'
  return <nav aria-label={anglais ? 'Breadcrumb' : 'Fil d’Ariane'} className={styles.breadcrumb}>
    <Link href="/"><ShopIcon name="home" /> {anglais ? 'Home' : 'Accueil'}</Link><span aria-hidden="true">›</span><span>{anglais && en ? en : fr}</span>
  </nav>
}
