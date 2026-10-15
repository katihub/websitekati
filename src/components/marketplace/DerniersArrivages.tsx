import Image from 'next/image'
import Link from 'next/link'

import { imageProduit } from '@/lib/image-produit'
import { lireOffresMarketplace, type OffreMarketplace } from '@/lib/marketplace-data'
import { CATEGORY_ICON, money } from './ProductCardAccueil'
import styles from './marketplace-arrivages.module.css'

/**
 * « DERNIERS ARRIVAGES » : les trois rayons ou des offres ont ete publiees le
 * plus recemment, une colonne par rayon, avec ses quatre dernieres offres. Le
 * nombre d'offres d'une colonne est celui de tout le rayon, lu dans le
 * catalogue, et non celui des seules offres recentes.
 */

const COLONNES = 3
const PAR_COLONNE = 4

type Colonne = { slug: string; nom: string; parent: string | null; offres: OffreMarketplace[]; dernier: string | null }

const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** Les offres recentes, regroupees par rayon dans l'ordre de leur derniere publication. */
function colonnes(offres: OffreMarketplace[]): Colonne[] {
  const parRayon = new Map<string, Colonne>()
  for (const offre of offres) {
    const ref = offre.produit.categorieRef
    const slug = ref?.slug ?? offre.produit.categorie ?? 'autres'
    const colonne = parRayon.get(slug) ?? { slug, nom: ref?.nom ?? offre.produit.categorie ?? 'Autres produits', parent: ref?.parent?.nom ?? null, offres: [], dernier: offre.publieLe ?? null }
    if (colonne.offres.length < PAR_COLONNE) colonne.offres.push(offre)
    parRayon.set(slug, colonne)
  }
  return [...parRayon.values()].slice(0, COLONNES)
}

export async function DerniersArrivages() {
  const recentes = await lireOffresMarketplace({ tri: 'recent', taille: 60 })
  const choisies = colonnes(recentes.offres)
  if (!choisies.length) return null
  const totaux = await Promise.all(choisies.map((c) => lireOffresMarketplace({ categorieSlug: c.slug, taille: 1 }).then((r) => Math.max(r.pagination.total, c.offres.length))))
  const nombre = new Intl.NumberFormat('fr-FR')

  return <section className={styles.section} aria-labelledby="arrivages-titre">
    <header className={styles.entete}>
      <div>
        <h2 id="arrivages-titre">Derniers arrivages</h2>
        <p>Les trois rayons où les boutiques ont publié le plus récemment, avec leurs dernières offres.</p>
      </div>
      <Link href="/catalogue?tri=recent">Tout voir</Link>
    </header>
    <div className={styles.colonnes}>
      {choisies.map((colonne, index) => {
        const total = totaux[index] ?? colonne.offres.length
        return <article key={colonne.slug} className={styles.colonne}>
          <header>
            <h3><Link href={`/categories/${encodeURIComponent(colonne.slug)}`}>{colonne.nom}</Link></h3>
            <span>{nombre.format(total)} offre{total > 1 ? 's' : ''}</span>
          </header>
          <p className={styles.contexte}>{colonne.parent ?? 'Tout le rayon'}{colonne.dernier ? ` · arrivage ${mois.format(new Date(colonne.dernier))}` : ''}</p>
          <ul>
            {colonne.offres.map((offre) => {
              const image = imageProduit(offre.produit)
              return <li key={offre.id}>
                <Link href={`/marketplace/produits/${offre.produit.slug}`} className={styles.ligne}>
                  <span className={styles.vignette}>{image
                    ? <Image src={image.url} alt={image.alt} fill sizes="80px" />
                    : <span aria-hidden="true">{CATEGORY_ICON[offre.produit.categorie ?? ''] ?? '📦'}</span>}</span>
                  <span className={styles.texte}>
                    <b>{offre.titre ?? offre.produit.nom}</b>
                    {offre.prixReferenceFcfa && offre.prixFcfa !== null && offre.prixReferenceFcfa > offre.prixFcfa ? <del>{money(offre.prixReferenceFcfa)}</del> : null}
                    <strong>{money(offre.prixFcfa)}</strong>
                  </span>
                </Link>
              </li>
            })}
          </ul>
        </article>
      })}
    </div>
  </section>
}
