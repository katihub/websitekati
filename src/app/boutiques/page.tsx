import type { Metadata } from 'next'
import { lireAccueilMarketplace, lireBoutiquesMarketplace } from '@/lib/marketplace-data'
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

type Parametres = { page?: string | string[]; q?: string | string[]; ville?: string | string[] }
const premier = (valeur: string | string[] | undefined) => (Array.isArray(valeur) ? valeur[0] : valeur)?.trim() || undefined

/**
 * TOUTES LES BOUTIQUES VISIBLES, TRENTE PAR PAGE.
 *
 * La page lisait la liste de l'accueil, limitee a vingt : les boutiques
 * validees au-dela n'apparaissaient nulle part. Elle lit desormais l'annuaire
 * pagine ; la recherche et le filtre par ville passent par l'adresse et sont
 * appliques par le serveur, sur toutes les boutiques et non sur la seule page
 * affichee.
 */
export default async function BoutiquesPage({ searchParams }: { searchParams: Promise<Parametres> }) {
  const parametres = await searchParams
  const page = Math.max(1, Number.parseInt(premier(parametres.page) ?? '1', 10) || 1)
  const q = premier(parametres.q)
  const ville = premier(parametres.ville)

  // Les apercus de l'accueil (deja en cache) evitent un appel par carte quand ils existent.
  const [annuaire, { offres }] = await Promise.all([
    lireBoutiquesMarketplace({ page, q, ville }),
    lireAccueilMarketplace(),
  ])
  const cartes = annuaire.boutiques.map((shop) => ({
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
      .slice(0, 5),
  }))
  return (
    <div className={styles.page}>
      <div className={styles.head}><span>BOUTIQUES KATIMARKET</span><h1>Des vendeurs locaux, vérifiés et proches de vous</h1><p>Explorez chaque boutique, comparez ses offres et choisissez votre mode de livraison.</p></div>
      <GrilleBoutiques
        boutiques={cartes}
        villes={annuaire.villes}
        pagination={annuaire.pagination}
        recherche={q ?? ''}
        ville={ville ?? ''}
        indisponible={annuaire.indisponible === true}
      />
    </div>
  )
}
