'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './marketplace-home-v2.module.css'

const slides = [
  { image: '/marketplace-hero-douala.png', title: <>Tout ce dont vous avez besoin,<br /><strong>au même endroit !</strong></>, text: 'Des boutiques locales, des prix clairs et une livraison suivie au Cameroun.', href: '/catalogue', action: 'Découvrir maintenant' },
  { image: '/marketplace-mode-cameroun.png', title: <>Le style camerounais,<br /><strong>livré chez vous.</strong></>, text: 'Mode, beauté et accessoires proposés par des vendeurs vérifiés.', href: '/recherche?q=Mode', action: 'Explorer la mode' },
]

export function MarketplaceHeroCarousel() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500)
    return () => window.clearInterval(timer)
  }, [])
  const slide = slides[active]!
  const change = (direction: number) => setActive((active + direction + slides.length) % slides.length)

  return <section className={styles.hero} aria-roledescription="carrousel" aria-label="Offres KatiHub">
    <Image key={slide.image} src={slide.image} alt="" fill priority sizes="(max-width: 900px) 100vw, 70vw" className={styles.heroImage} />
    <div className={styles.heroCopy}><span className={styles.heroEyebrow}>La marketplace qui vous connecte</span><h1>{slide.title}</h1><p>{slide.text}</p><Link href={slide.href}>{slide.action}<span>→</span></Link></div>
    <button className={`${styles.heroArrow} ${styles.heroPrev}`} onClick={() => change(-1)} aria-label="Publicité précédente"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
    <button className={`${styles.heroArrow} ${styles.heroNext}`} onClick={() => change(1)} aria-label="Publicité suivante"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
    <div className={styles.heroDots}>{slides.map((item, index) => <button key={item.image} aria-label={`Afficher la publicité ${index + 1}`} aria-current={index === active} onClick={() => setActive(index)} />)}</div>
  </section>
}
