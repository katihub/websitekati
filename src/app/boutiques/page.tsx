import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { lireAccueilMarketplace } from '@/lib/marketplace-data'
import styles from './shops.module.css'

export const metadata: Metadata = { title: 'Boutiques vérifiées' }

export default async function BoutiquesPage() {
  const { boutiques, offres } = await lireAccueilMarketplace()
  return (
    <div className={styles.page}>
      <div className={styles.head}><span>BOUTIQUES KATIMARKET</span><h1>Des vendeurs locaux, vérifiés et proches de vous</h1><p>Explorez chaque boutique, comparez ses offres et choisissez votre mode de livraison.</p></div>
      <div className={styles.grid}>{boutiques.map((shop, index) => {
        const miniatures = offres
          .filter((offre) => offre.boutique.slug === shop.slug)
          .flatMap((offre) => offre.produit.images ?? [])
          .filter((image, imageIndex, images) => images.findIndex((candidate) => candidate.url === image.url) === imageIndex)
          .slice(0, 4)
        return (
          <Link href={`/boutiques/${shop.slug}`} key={shop.id} className={styles.card} prefetch={false}>
            <div className={`${styles.cover} ${shop.banniereUrl ? styles.coverBanner : ''}`}>
              {shop.banniereUrl ? <Image src={shop.banniereUrl} alt="" fill sizes="(max-width: 440px) 100vw, (max-width: 700px) 50vw, 25vw" className={styles.banner} loading="lazy" /> : null}
              {shop.logoUrl
                ? <span className={styles.logo}><Image src={shop.logoUrl} alt={`Logo de ${shop.nom}`} fill sizes="62px" loading="lazy" /></span>
                : <span style={{'--hue': `${(index * 43) % 360}`} as React.CSSProperties}>{shop.nom.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className={styles.body}>
              <small>✓ BOUTIQUE VÉRIFIÉE</small>
              <h2>{shop.nom}</h2>
              <p>{shop.description || 'Découvrez les offres disponibles dans cette boutique.'}</p>
              <div className={styles.location}>⌖ {shop.villesLivraison.join(' · ') || 'Livraison selon disponibilité'}</div>
              <div className={styles.thumbnails} role="group" aria-label={`Quelques produits de ${shop.nom}`}>
                {miniatures.length ? miniatures.map((image, imageIndex) => (
                  <span className={styles.thumbnail} key={`${image.url}-${imageIndex}`}>
                    <Image src={image.url} alt="" fill sizes="54px" loading="lazy" />
                  </span>
                )) : <span className={styles.noThumbnails}>Produits à découvrir en boutique</span>}
              </div>
              <b>Visiter la boutique →</b>
            </div>
          </Link>
        )
      })}</div>
    </div>
  )
}
