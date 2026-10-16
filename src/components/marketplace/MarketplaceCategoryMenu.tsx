import Link from 'next/link'

import type { RayonAccueil } from './RayonsAccueil'
import styles from './marketplace-home-v2.module.css'

const ENTREES = [
  ['▯', 'Électronique'],
  ['♙', 'Mode & Style'],
  ['⌂', 'Maison & Décoration'],
  ['✿', 'Beauté & Santé'],
  ['◉', 'Sports & Loisirs'],
  ['▱', 'Auto & Moto'],
  ['♧', 'Jardinage'],
  ['♙', 'Enfants & Jouets'],
  ['⌁', 'Alimentation'],
  ['▦', 'High-Tech'],
  ['⌕', 'Bricolage & Outillage'],
] as const

const normaliser = (valeur: string) => valeur
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()

function trouverRayon(rayons: RayonAccueil[], libelle: string) {
  const recherche = normaliser(libelle)
  const motPrincipal = recherche.split(' ')[0]
  return rayons.find((rayon) => normaliser(rayon.nom) === recherche)
    ?? rayons.find((rayon) => normaliser(rayon.nom).split(' ')[0] === motPrincipal)
}

export function MarketplaceCategoryMenu({ rayons }: { rayons: RayonAccueil[] }) {
  return <aside className={styles.categoryMenu} aria-label="Catégories de produits">
    <h2><span aria-hidden="true">☰</span>Toutes les catégories</h2>
    <ul className={styles.categoryList}>
      {ENTREES.map(([icone, libelle]) => {
        const rayon = trouverRayon(rayons, libelle)
        const href = rayon ? `/categories/${rayon.slug}` : `/recherche?q=${encodeURIComponent(libelle)}`
        const sousCategories = rayon?.sousCategories ?? []
        return <li className={styles.categoryItem} key={libelle}>
          <Link className={styles.categoryLink} href={href} aria-haspopup={sousCategories.length ? 'true' : undefined}>
            <span aria-hidden="true">{icone}</span>
            <span>{rayon?.nom ?? libelle}</span>
            <b aria-hidden="true">›</b>
          </Link>
          {rayon && sousCategories.length ? <section className={styles.categorySubmenu} aria-label={`Sous-catégories de ${rayon.nom}`}>
            <header>
              <div><small>Explorer le rayon</small><h3>{rayon.nom}</h3></div>
              <span>{sousCategories.length} sous-catégorie{sousCategories.length > 1 ? 's' : ''}</span>
            </header>
            <div className={styles.categorySubmenuGrid}>
              {sousCategories.map((sousCategorie) => <Link key={sousCategorie.slug} href={`/categories/${sousCategorie.slug}`}>
                <span>{sousCategorie.nom}</span><b aria-hidden="true">→</b>
              </Link>)}
            </div>
            <Link className={styles.categoryViewAll} href={`/categories/${rayon.slug}`}>Voir tous les produits <span aria-hidden="true">→</span></Link>
          </section> : null}
        </li>
      })}
      <li className={styles.categoryItem}>
        <Link className={styles.categoryLink} href="/categories"><span aria-hidden="true">▦</span><span>Plus de catégories</span><b aria-hidden="true">›</b></Link>
      </li>
    </ul>
  </aside>
}
