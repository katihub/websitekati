import type { Metadata } from 'next'
import Link from 'next/link'
import { lireAccueilMarketplace } from '@/lib/marketplace-data'
import styles from './shops.module.css'

export const metadata: Metadata = { title: 'Boutiques vérifiées' }

export default async function BoutiquesPage() {
  const { boutiques } = await lireAccueilMarketplace()
  return (
    <div className={styles.page}>
      <div className={styles.head}><span>BOUTIQUES KATIMARKET</span><h1>Des vendeurs locaux, vérifiés et proches de vous</h1><p>Explorez chaque boutique, comparez ses offres et choisissez votre mode de livraison.</p></div>
      <div className={styles.grid}>{boutiques.map((shop, index) => (
        <Link href={`/boutiques/${shop.slug}`} key={shop.id} className={styles.card}>
          <div className={styles.cover}><span style={{'--hue': `${(index * 43) % 360}`} as React.CSSProperties}>{shop.nom.slice(0,2).toUpperCase()}</span></div>
          <div className={styles.body}><small>✓ BOUTIQUE VÉRIFIÉE</small><h2>{shop.nom}</h2><p>{shop.description}</p><div>⌖ {shop.villesLivraison.join(' · ')}</div><b>Visiter la boutique →</b></div>
        </Link>
      ))}</div>
    </div>
  )
}
