'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PublishedBanner } from '@/lib/banners'
import { texteBanniere } from '@/lib/carrousel-accueil'
import { useMarketplaceLanguage } from '@/lib/language'
import styles from './marketplace-home-v2.module.css'
import { useDefilement } from './useDefilement'

/**
 * LE GRAND BANDEAU DE L'ACCUEIL.
 *
 * Il affiche les bannieres « Bannière principale » publiees dans le panel
 * (Contenu), en image seule et cliquable vers leur lien. Une seule image reste
 * fixe ; a partir de deux, elles defilent. Sans banniere publiee, il garde son
 * contenu KatiMarket par defaut.
 */
export function MarketplaceHeroCarousel({ bannieres }: { bannieres: readonly PublishedBanner[] }) {
  return bannieres.length > 0 ? <BandeauPanel bannieres={bannieres} /> : <BandeauParDefaut />
}

function Commandes({ nombre, active, changer, aller }: { nombre: number; active: number; changer: (sens: number) => void; aller: (indice: number) => void }) {
  const { text } = useMarketplaceLanguage()
  if (nombre < 2) return null
  return <>
    <button type="button" className={`${styles.heroArrow} ${styles.heroPrev}`} onClick={() => changer(-1)} aria-label={text('previousAd')}><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
    <button type="button" className={`${styles.heroArrow} ${styles.heroNext}`} onClick={() => changer(1)} aria-label={text('nextAd')}><svg viewBox="0 0 24 24"><path d="m9 18-6-6 6-6" /></svg></button>
    <div className={styles.heroDots}>{Array.from({ length: nombre }, (_, index) => <button type="button" key={index} aria-label={text('showAd', { number: index + 1 })} aria-current={index === active} onClick={() => aller(index)} />)}</div>
  </>
}

function BandeauPanel({ bannieres }: { bannieres: readonly PublishedBanner[] }) {
  const { text } = useMarketplaceLanguage()
  const { active, aller, changer, pause } = useDefilement(bannieres.length)
  const banniere = bannieres[active]!
  const position = { objectPosition: `center ${banniere.focus}%` }
  const contenu = texteBanniere(banniere)

  return <section className={styles.hero} aria-roledescription="carrousel" aria-label={text('promotions')} data-testid="grand-bandeau" {...pause}>
    {/* Toute l'image mene au lien ; le bouton du texte porte le meme lien pour le clavier. */}
    <Link key={banniere.id} href={banniere.href} className={styles.heroLien} tabIndex={-1} aria-hidden="true">
      <Image src={banniere.large.url} alt={banniere.alt} fill priority={active === 0} sizes="(max-width: 900px) 100vw, 70vw" className={`${styles.heroImage} ${styles.heroLarge}`} style={position} />
      <Image src={banniere.mobile.url} alt="" fill sizes="100vw" className={`${styles.heroImage} ${styles.heroMobile}`} style={position} />
    </Link>
    <div className={`${styles.heroCopy} ${styles.heroCopyPanel}`}>
      <h1>{contenu.titre}</h1>
      {contenu.description && <p>{contenu.description}</p>}
      <Link href={banniere.href}>{contenu.action}<span>→</span></Link>
    </div>
    <Commandes nombre={bannieres.length} active={active} changer={changer} aller={aller} />
  </section>
}

function BandeauParDefaut() {
  const { text } = useMarketplaceLanguage()
  const slides = [
    { image: '/marketplace-hero-douala.png', title: <>{text('heroTitleOne')}<br /><strong>{text('heroTitleTwo')}</strong></>, text: text('heroTextOne'), href: '/catalogue', action: text('discoverNow') },
    { image: '/marketplace-mode-cameroun.png', title: <>{text('heroFashionTitle')}<br /><strong>{text('heroFashionTitleTwo')}</strong></>, text: text('heroFashionText'), href: '/recherche?q=Mode', action: text('exploreFashion') },
  ]
  const { active, aller, changer, pause } = useDefilement(slides.length)
  const slide = slides[active]!

  return <section className={styles.hero} aria-roledescription="carrousel" aria-label={text('promotions')} {...pause}>
    <Image key={slide.image} src={slide.image} alt="" fill priority sizes="(max-width: 900px) 100vw, 70vw" className={styles.heroImage} />
    <div className={styles.heroCopy}><span className={styles.heroEyebrow}>{text('heroTagline')}</span><h1>{slide.title}</h1><p>{slide.text}</p><Link href={slide.href}>{slide.action}<span>→</span></Link></div>
    <Commandes nombre={slides.length} active={active} changer={changer} aller={aller} />
  </section>
}
