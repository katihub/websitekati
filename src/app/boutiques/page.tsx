import type { Metadata } from 'next'
import { lireAccueilMarketplace } from '@/lib/marketplace-data'
import { GrilleBoutiques } from './GrilleBoutiques'
import styles from './shops.module.css'

export const metadata: Metadata = { title: 'Boutiques vérifiées' }

/** Assez pour deux lignes de carte : au-dela, le texte serait coupe de toute facon. */
const LONGUEUR_DESCRIPTION = 90

function resume(description: string | null) {
  const texte = description?.replace(/\s+/g, ' ').trim()
  if (!texte) return 'Découvrez les offres disponibles dans cette boutique.'
  if (texte.length <= LONGUEUR_DESCRIPTION) return texte
  return `${texte.slice(0, LONGUEUR_DESCRIPTION).replace(/\s+\S*$/, '')}…`
}

export default async function BoutiquesPage() {
  const { boutiques, offres } = await lireAccueilMarketplace()
  const cartes = boutiques.map((shop) => ({
    id: shop.id,
    slug: shop.slug,
    nom: shop.nom,
    description: resume(shop.description),
    villes: shop.villesLivraison.join(' · ') || 'Livraison selon disponibilité',
    logoUrl: shop.logoUrl ?? null,
    banniereUrl: shop.banniereUrl ?? null,
    miniatures: [...new Set(offres
      .filter((offre) => offre.boutique.slug === shop.slug)
      .flatMap((offre) => offre.produit.images ?? [])
      .map((image) => image.url))]
      .slice(0, 4),
  }))
  return (
    <div className={styles.page}>
      <div className={styles.head}><span>BOUTIQUES KATIMARKET</span><h1>Des vendeurs locaux, vérifiés et proches de vous</h1><p>Explorez chaque boutique, comparez ses offres et choisissez votre mode de livraison.</p></div>
      <GrilleBoutiques boutiques={cartes} />
    </div>
  )
}
