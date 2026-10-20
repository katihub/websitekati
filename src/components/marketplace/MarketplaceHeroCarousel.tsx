'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useMarketplaceLanguage } from '@/lib/language'
import styles from './marketplace-home-v2.module.css'

export function MarketplaceHeroCarousel() {
  const { text } = useMarketplaceLanguage()
  const slides = [
    { image: '/marketplace-hero-douala.png', title: <>{text('heroTitleOne')}<br /><strong>{text('heroTitleTwo')}</strong></>, text: text('heroTextOne'), href: '/catalogue', action: text('discoverNow') },
    { image: '/marketplace-mode-cameroun.png', title: <>{text('heroFashionTitle')}<br /><strong>{text('heroFashionTitleTwo')}</strong></>, text: text('heroFashionText'), href: '/recherche?q=Mode', action: text('exploreFashion') },
  ]
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500)
    return () => window.clearInterval(timer)
  }, [])
  const slide = slides[active]!
  const change = (direction: number) => setActive((active + direction + slides.length) % slides.length)

  return <section className={styles.hero} aria-roledescription="carrousel" aria-label={text('promotions')}>
    <Image key={slide.image} src={slide.image} alt="" fill priority sizes="(max-width: 900px) 100vw, 70vw" className={styles.heroImage} />
    <div className={styles.heroCopy}><span className={styles.heroEyebrow}>{text('heroTagline')}</span><h1>{slide.title}</h1><p>{slide.text}</p><Link href={slide.href}>{slide.action}<span>→</span></Link></div>
    <button type="button" className={`${styles.heroArrow} ${styles.heroPrev}`} onClick={() => change(-1)} aria-label={text('previousAd')}><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
    <button type="button" className={`${styles.heroArrow} ${styles.heroNext}`} onClick={() => change(1)} aria-label={text('nextAd')}><svg viewBox="0 0 24 24"><path d="m9 18-6-6 6-6" /></svg></button>
    <div className={styles.heroDots}>{slides.map((item, index) => <button type="button" key={item.image} aria-label={text('showAd', { number: index + 1 })} aria-current={index === active} onClick={() => setActive(index)} />)}</div>
  </section>
}
