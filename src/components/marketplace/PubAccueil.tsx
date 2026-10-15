import Image from 'next/image'
import Link from 'next/link'

import type { PublishedBanner } from '@/lib/banners'
import styles from './marketplace-home-v2.module.css'

/**
 * L'EMPLACEMENT PUBLICITAIRE DE L'ACCUEIL, en haut de la colonne de droite.
 *
 * Le super admin y choisit l'image du moment dans le panel (Contenu >
 * Bannieres, emplacement « Pub accueil KatiHub ») : la premiere banniere active
 * de cet emplacement s'affiche ici, avec son lien. Sans publicite publiee, la
 * place invite les marchands a ouvrir leur boutique plutot que de rester vide.
 */
export function PubAccueil({ pub }: { pub: PublishedBanner | null }) {
  if (!pub) {
    return <Link href="/devenir-vendeur" className={styles.pubAccueil} data-testid="pub-accueil" data-defaut>
      <Image src="/marchande-katihub-cameroun.png" alt="Une commerçante camerounaise dans sa boutique" fill sizes="(max-width: 1200px) 50vw, 248px" />
      <span className={styles.pubDefaut}><b>Vendez sur KatiHub</b><small>Ouvrez votre boutique en quelques minutes →</small></span>
    </Link>
  }
  return <Link href={pub.href} className={styles.pubAccueil} data-testid="pub-accueil" aria-label={pub.label}>
    <Image src={pub.large.url} alt={pub.alt} fill sizes="(max-width: 1200px) 50vw, 248px" style={{ objectPosition: `center ${pub.focus}%` }} />
    <span className={styles.pubMention}>Publicité</span>
  </Link>
}
