import Link from 'next/link'

import type { OffreMarketplace } from '@/lib/marketplace-data'
import styles from './marketplace-home-v2.module.css'

/**
 * LA CARTE PRODUIT DE L'ACCUEIL KATIHUB : partagee par les sections de la page
 * (meilleures ventes, nouveautes, rayons), pour qu'un produit se presente
 * partout de la meme facon.
 */
export const CATEGORY_ICON: Record<string, string> = { 'Électronique': '📱', Informatique: '💻', 'Électroménager': '🍳', 'Maison & Déco': '🛋️', 'Maison et énergie': '💡', 'Sports & Loisirs': '👟', 'Mode & Style': '👜', 'Beauté & Santé': '🧴', 'Auto & Moto': '🚗', Puériculture: '🧸' }
export const money = (value: number | null) => value === null ? 'Prix sur demande' : `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

export function ProductCard({ offre, fresh = false }: { offre: Pick<OffreMarketplace, 'id' | 'titre' | 'prixFcfa' | 'prixReferenceFcfa' | 'disponible' | 'produit' | 'boutique'>; fresh?: boolean }) {
  const icon = CATEGORY_ICON[offre.produit.categorie ?? ''] ?? '📦'
  return <article className={styles.productCard}>
    <Link href={`/marketplace/produits/${offre.produit.slug}`} className={styles.productVisual}><span>{icon}</span><small>{offre.produit.categorie ?? 'Marketplace'}</small>{fresh ? <b>Nouveau</b> : null}</Link>
    <div className={styles.productBody}><small>Par {offre.boutique.nom}</small><h3><Link href={`/marketplace/produits/${offre.produit.slug}`}>{offre.titre ?? offre.produit.nom}</Link></h3><p className={styles.rating}>★★★★★ <span>({Math.max(12, offre.disponible * 3)})</span></p><div className={styles.productBuy}><span><strong>{money(offre.prixFcfa)}</strong>{offre.prixReferenceFcfa ? <del>{money(offre.prixReferenceFcfa)}</del> : null}</span><Link href={`/marketplace/produits/${offre.produit.slug}`} aria-label={`Voir ${offre.produit.nom}`}>＋</Link></div></div>
  </article>
}
