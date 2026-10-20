'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

import { api } from '@/lib/api'
import type { ListeOffresMarketplace, OffreMarketplace } from '@/lib/marketplace-data'
import { CATEGORY_ICON, ProductCard } from './ProductCardAccueil'
import styles from './marketplace-home-v2.module.css'

/**
 * « EXPLOREZ NOS RAYONS » : les rayons KatiMarket a gauche, leurs sous-categories
 * en onglets au-dessus, et huit offres du choix courant, avec les cartes produit
 * de l'accueil. Le premier rayon affiche est le mieux fourni, lu cote serveur ;
 * les autres se chargent au clic et restent en memoire le temps de la visite.
 */

export type RayonAccueil = { nom: string; slug: string; nombre: number; sousCategories: Array<{ nom: string; slug: string }> }

const TAILLE = 8

export function RayonsAccueil({ rayons, initial }: { rayons: RayonAccueil[]; initial: { slug: string; offres: OffreMarketplace[] } }) {
  const [rayon, setRayon] = useState(initial.slug)
  const [sous, setSous] = useState<string | null>(null)
  const [offres, setOffres] = useState(initial.offres)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(false)
  // La cle d'affichage relance l'animation d'entree des cartes a chaque changement.
  const [vue, setVue] = useState(0)
  const memoire = useRef(new Map<string, OffreMarketplace[]>([[initial.slug, initial.offres]]))
  const demande = useRef(0)

  const actif = rayons.find((r) => r.slug === rayon) ?? rayons[0]!

  async function afficher(slug: string, sousSlug: string | null) {
    setRayon(slug)
    setSous(sousSlug)
    setErreur(false)
    const cle = sousSlug ?? slug
    const connu = memoire.current.get(cle)
    if (connu) { setOffres(connu); setVue((v) => v + 1); return }
    const numero = ++demande.current
    setChargement(true)
    try {
      const liste = await api<ListeOffresMarketplace>(`/marketplace/offres?categorieSlug=${encodeURIComponent(cle)}&page=1&taille=${TAILLE}`, { anonyme: true })
      if (numero !== demande.current) return
      memoire.current.set(cle, liste.offres)
      setOffres(liste.offres)
      setVue((v) => v + 1)
    } catch {
      if (numero === demande.current) setErreur(true)
    } finally {
      if (numero === demande.current) setChargement(false)
    }
  }

  const lienTout = `/categories/${encodeURIComponent(sous ?? actif.slug)}`

  return <section className={`${styles.shell} ${styles.section} ${styles.rayons}`} aria-labelledby="rayons-titre">
    <header className={styles.sectionHead}><h2 id="rayons-titre">Explorez nos rayons</h2><Link href="/catalogue">Tout le catalogue<span>→</span></Link></header>
    <div className={styles.rayonsCorps}>
      <nav className={styles.rayonsListe} aria-label="Rayons">
        {rayons.map((r) => <button key={r.slug} type="button" aria-pressed={r.slug === rayon} disabled={chargement && r.slug !== rayon} onClick={() => void afficher(r.slug, null)} data-vide={r.nombre === 0 || undefined}>
          <span aria-hidden="true">{CATEGORY_ICON[r.nom] ?? '📦'}</span>{r.nom}<b aria-hidden="true">›</b>
        </button>)}
      </nav>
      <div className={styles.rayonsContenu}>
        <div className={styles.rayonsOnglets} role="group" aria-label={`Sous-catégories ${actif.nom}`}>
          <button type="button" aria-pressed={sous === null} onClick={() => void afficher(actif.slug, null)}>Tout {actif.nom}</button>
          {actif.sousCategories.map((s) => <button key={s.slug} type="button" aria-pressed={sous === s.slug} onClick={() => void afficher(actif.slug, s.slug)}>{s.nom}</button>)}
        </div>
        <div className={styles.rayonsGrille} aria-busy={chargement} aria-live="polite" data-chargement={chargement || undefined}>
          {erreur ? <p className={styles.rayonsVide}>Les offres de ce rayon ne se chargent pas pour le moment. <button type="button" onClick={() => void afficher(rayon, sous)}>Réessayer</button></p>
            : offres.length ? offres.map((offre, index) => <div key={`${vue}-${offre.id}`} className={styles.rayonsCarte} style={{ '--i': index } as React.CSSProperties}><ProductCard offre={offre} /></div>)
              : <p className={styles.rayonsVide}>Pas encore d’offre dans {sous ? 'cette sous-catégorie' : 'ce rayon'}. Les boutiques y arrivent bientôt.</p>}
        </div>
        <Link className={styles.rayonsTout} href={lienTout}>Voir tout le rayon {sous ? actif.sousCategories.find((s) => s.slug === sous)?.nom : actif.nom}<span>→</span></Link>
      </div>
    </div>
  </section>
}
