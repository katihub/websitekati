'use client'

import Image from 'next/image'
import Link from 'next/link'

import type { PublishedBanner } from '@/lib/banners'
import styles from './marketplace-home-v2.module.css'
import { useDefilement } from './useDefilement'

/**
 * LA ZONE PROMO DE L'ACCUEIL, en haut de la colonne de droite.
 *
 * Elle affiche les bannieres « Pub accueil KatiMarket » publiees dans le panel
 * (Contenu), dans leur ordre. Une seule image reste fixe ; a partir de deux,
 * elles defilent. Sans publicite publiee, la place invite les marchands a
 * ouvrir leur boutique plutot que de rester vide.
 */
export function PubAccueil({ pubs }: { pubs: readonly PublishedBanner[] }) {
  const { active, aller, pause } = useDefilement(pubs.length)

  if (pubs.length === 0) {
    return <Link href="/devenir-vendeur" className={styles.pubAccueil} data-testid="pub-accueil" data-defaut>
      <Image src="/home-pub-vendeuse-beaute.png" alt="Une commerçante camerounaise organise les produits de sa boutique" fill sizes="(max-width: 1200px) 50vw, 248px" />
      <span className={styles.pubDefaut}><b>Vendez sur KatiMarket</b><small>Ouvrez votre boutique en quelques minutes →</small></span>
    </Link>
  }

  const pub = pubs[active]!
  return <div className={styles.pubAccueil} data-testid="pub-accueil" aria-roledescription="carrousel" aria-label="Publicité" {...pause}>
    <Link key={pub.id} href={pub.href} className={styles.pubLien} aria-label={pub.label || pub.alt}>
      <Image src={pub.large.url} alt={pub.alt} fill sizes="(max-width: 1200px) 50vw, 248px" style={{ objectPosition: `center ${pub.focus}%` }} />
    </Link>
    <span className={styles.pubMention}>Publicité</span>
    {pubs.length > 1 && <div className={styles.pubPoints}>{pubs.map((item, index) => <button type="button" key={item.id} aria-label={`Afficher la publicité ${index + 1}`} aria-current={index === active} onClick={() => aller(index)} />)}</div>}
  </div>
}
