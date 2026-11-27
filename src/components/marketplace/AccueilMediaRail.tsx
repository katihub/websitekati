import Link from 'next/link'
import type { PublishedBanner } from '@/lib/banners'
import styles from './AccueilMediaRail.module.css'

/**
 * Les mots éventuels appartiennent au fichier chargé par l’administration.
 * Ce composant ne superpose volontairement ni titre, ni légende, ni bouton.
 */
export function AccueilMediaRail({ medias }: { medias: readonly PublishedBanner[] }) {
  if (!medias.length) return null

  return <div className={styles.viewport} data-testid="home-media-rail">
    <div className={styles.track}>
      {medias.map((media) => <Link
        key={media.id}
        href={media.href}
        className={styles.card}
        aria-label={media.alt}
      >
        <picture>
          <source media="(max-width: 640px)" srcSet={media.mobile.url} />
          <img
            src={media.large.url}
            alt=""
            width={media.large.largeur}
            height={media.large.hauteur}
            loading="lazy"
            style={{ objectPosition: `${media.focus}% center` }}
          />
        </picture>
      </Link>)}
    </div>
  </div>
}
