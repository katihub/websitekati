'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { PublishedBanner } from '@/lib/banners'
import styles from './marketplace-campaigns.module.css'

type Campaign = {
  id: string
  image: string
  alt: string
  title: string
  accent?: string
  text: string
  action: string
  href: string
  tone: 'navy' | 'light' | 'orange'
  focus?: string
}

function campaignsFrom(promos: PublishedBanner[]): Campaign[] {
  return promos.map((promo): Campaign => ({
    id: String(promo.id),
    image: promo.large.url,
    alt: promo.alt,
    title: promo.label,
    text: promo.description,
    action: promo.action,
    href: promo.href,
    tone: promo.tonalite,
    focus: `center ${promo.focus}%`,
  }))
}

export function MarketplaceHeroCarousel({ promos }: { promos: PublishedBanner[] }) {
  const viewport = useRef<HTMLDivElement>(null)
  const campaigns = campaignsFrom(promos)
  const [active, setActive] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoNext, setCanGoNext] = useState(campaigns.length > 1)

  const updatePosition = useCallback(() => {
    const node = viewport.current
    const first = node?.firstElementChild as HTMLElement | null
    if (!node || !first) return
    const gap = Number.parseFloat(getComputedStyle(node).columnGap || '0')
    const step = first.offsetWidth + gap
    setActive(Math.min(campaigns.length - 1, Math.max(0, Math.round(node.scrollLeft / step))))
    setCanGoBack(node.scrollLeft > 4)
    setCanGoNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 4)
  }, [campaigns.length])

  useEffect(() => {
    const node = viewport.current
    if (!node) return
    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(node)
    node.addEventListener('scroll', updatePosition, { passive: true })
    return () => { observer.disconnect(); node.removeEventListener('scroll', updatePosition) }
  }, [updatePosition])

  const move = (direction: -1 | 1) => {
    const node = viewport.current
    const first = node?.firstElementChild as HTMLElement | null
    if (!node || !first) return
    const gap = Number.parseFloat(getComputedStyle(node).columnGap || '0')
    node.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: 'smooth' })
  }

  return <section className={styles.section} aria-label="Les offres du moment">
    <div className={styles.carousel}>
      <div ref={viewport} className={styles.viewport} data-testid="campaign-rail" tabIndex={0}>
        {campaigns.map((campaign, index) => <Link
          key={campaign.id}
          href={campaign.href}
          className={styles.card}
          data-tone={campaign.tone}
          aria-label={`${campaign.title}${campaign.accent ? ` ${campaign.accent}` : ''} — ${campaign.action}`}
        >
          <Image src={campaign.image} alt={campaign.alt} fill priority={index < 3} sizes="(max-width: 560px) 84vw, (max-width: 1050px) 46vw, 24vw" className={styles.image} style={{ objectPosition: campaign.focus }} />
          <span className={styles.scrim} />
          <span className={styles.copy}>
            {index === 0
              ? <h1>{campaign.title} <strong>{campaign.accent}</strong></h1>
              : <h2>{campaign.title} {campaign.accent ? <strong>{campaign.accent}</strong> : null}</h2>}
            <span className={styles.description}>{campaign.text}</span>
            <span className={styles.action}>{campaign.action}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></span>
          </span>
        </Link>)}
      </div>
      <button type="button" className={`${styles.arrow} ${styles.previous}`} onClick={() => move(-1)} disabled={!canGoBack} aria-label="Voir les campagnes précédentes"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
      <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => move(1)} disabled={!canGoNext} aria-label="Voir les campagnes suivantes"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
    </div>
    <div className={styles.progress} aria-hidden="true">
      {campaigns.map((campaign, index) => <span key={campaign.id} data-active={index === active} />)}
    </div>
    <div className={styles.benefits} aria-label="Les engagements KatiHub">
      <span><i aria-hidden="true">✓</i><span><b>Achats sécurisés</b><small>Des vendeurs vérifiés</small></span></span>
      <span><i aria-hidden="true">⌁</i><span><b>Livraison suivie</b><small>Partout au Cameroun</small></span></span>
      <span><i aria-hidden="true">24</i><span><b>Service client</b><small>Une équipe locale à vos côtés</small></span></span>
      <span><i aria-hidden="true">K</i><span><b>Gagnez des Kati</b><small>À chaque commande éligible</small></span></span>
    </div>
  </section>
}
