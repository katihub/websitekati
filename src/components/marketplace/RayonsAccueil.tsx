'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

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
const DELAI_CATEGORIE = 4_000

export function RayonsAccueil({ rayons, initial }: { rayons: RayonAccueil[]; initial: { slug: string; offres: OffreMarketplace[] } }) {
  const [rayon, setRayon] = useState(initial.slug)
  const [sous, setSous] = useState<string | null>(null)
  const [offres, setOffres] = useState(initial.offres)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(false)
  const [survol, setSurvol] = useState(false)
  const [interaction, setInteraction] = useState(0)
  const [mouvementReduit, setMouvementReduit] = useState(false)
  // La cle d'affichage relance l'animation d'entree des cartes a chaque changement.
  const [vue, setVue] = useState(0)
  const memoire = useRef(new Map<string, OffreMarketplace[]>([[initial.slug, initial.offres]]))
  const demande = useRef(0)
  const requete = useRef<AbortController | null>(null)
  const listeRayons = useRef<HTMLElement>(null)

  const actif = rayons.find((r) => r.slug === rayon) ?? rayons[0]!

  const afficher = useCallback(async (slug: string, sousSlug: string | null) => {
    const numero = ++demande.current
    requete.current?.abort()
    requete.current = null
    setRayon(slug)
    setSous(sousSlug)
    setErreur(false)
    const cle = sousSlug ?? slug
    const connu = memoire.current.get(cle)
    if (connu) { setChargement(false); setOffres(connu); setVue((v) => v + 1); return }
    const controleur = new AbortController()
    requete.current = controleur
    setChargement(true)
    try {
      const liste = await api<ListeOffresMarketplace>(`/marketplace/offres?categorieSlug=${encodeURIComponent(cle)}&page=1&taille=${TAILLE}`, { anonyme: true, signal: controleur.signal })
      if (numero !== demande.current) return
      memoire.current.set(cle, liste.offres)
      setOffres(liste.offres)
      setVue((v) => v + 1)
    } catch {
      if (numero === demande.current && !controleur.signal.aborted) setErreur(true)
    } finally {
      if (numero === demande.current) {
        requete.current = null
        setChargement(false)
      }
    }
  }, [])

  function afficherManuellement(slug: string, sousSlug: string | null) {
    setInteraction((numero) => numero + 1)
    void afficher(slug, sousSlug)
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const appliquer = () => setMouvementReduit(media.matches)
    appliquer()
    media.addEventListener('change', appliquer)
    return () => media.removeEventListener('change', appliquer)
  }, [])

  useEffect(() => () => {
    demande.current += 1
    requete.current?.abort()
  }, [])

  useEffect(() => {
    const disponibles = rayons.filter((item) => item.nombre > 0)
    if (survol || mouvementReduit || chargement || disponibles.length < 2) return
    const minuterie = window.setTimeout(() => {
      const index = disponibles.findIndex((item) => item.slug === rayon)
      const prochain = disponibles[(Math.max(index, 0) + 1) % disponibles.length]
      if (prochain && prochain.slug !== rayon) void afficher(prochain.slug, null)
    }, DELAI_CATEGORIE)
    return () => window.clearTimeout(minuterie)
  }, [afficher, chargement, interaction, mouvementReduit, rayon, rayons, survol])

  useEffect(() => {
    const liste = listeRayons.current
    const bouton = liste?.querySelector<HTMLElement>(`[data-rayon="${CSS.escape(rayon)}"]`)
    if (!liste || !bouton || liste.scrollWidth <= liste.clientWidth) return
    const gauche = bouton.offsetLeft
    const droite = gauche + bouton.offsetWidth
    if (gauche < liste.scrollLeft || droite > liste.scrollLeft + liste.clientWidth) {
      liste.scrollTo({ left: Math.max(0, gauche - 8), behavior: mouvementReduit ? 'auto' : 'smooth' })
    }
  }, [mouvementReduit, rayon])

  const lienTout = `/categories/${encodeURIComponent(sous ?? actif.slug)}`

  return <section className={`${styles.shell} ${styles.section} ${styles.rayons}`} aria-labelledby="rayons-titre" onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}>
    <header className={styles.sectionHead}><h2 id="rayons-titre">Explorez nos rayons</h2><Link href="/catalogue">Tout le catalogue<span>→</span></Link></header>
    <div className={styles.rayonsCorps}>
      <nav ref={listeRayons} className={styles.rayonsListe} aria-label="Rayons">
        {rayons.map((r) => <button key={r.slug} type="button" aria-pressed={r.slug === rayon} onClick={() => afficherManuellement(r.slug, null)} data-vide={r.nombre === 0 || undefined} data-rayon={r.slug}>
          <span aria-hidden="true">{CATEGORY_ICON[r.nom] ?? '📦'}</span>{r.nom}<b aria-hidden="true">›</b>
        </button>)}
      </nav>
      <div className={styles.rayonsContenu}>
        <div className={styles.rayonsOnglets} role="group" aria-label={`Sous-catégories ${actif.nom}`}>
          <button type="button" aria-pressed={sous === null} onClick={() => afficherManuellement(actif.slug, null)}>Tout {actif.nom}</button>
          {actif.sousCategories.map((s) => <button key={s.slug} type="button" aria-pressed={sous === s.slug} onClick={() => afficherManuellement(actif.slug, s.slug)}>{s.nom}</button>)}
        </div>
        <div className={styles.rayonsGrille} aria-busy={chargement} aria-live="polite" data-chargement={chargement || undefined}>
          {erreur ? <p className={styles.rayonsVide}>Les offres de ce rayon ne se chargent pas pour le moment. <button type="button" onClick={() => afficherManuellement(rayon, sous)}>Réessayer</button></p>
            : offres.length ? offres.map((offre, index) => <div key={`${vue}-${offre.id}`} className={styles.rayonsCarte} style={{ '--i': index } as React.CSSProperties}><ProductCard offre={offre} /></div>)
              : <p className={styles.rayonsVide}>Pas encore d’offre dans {sous ? 'cette sous-catégorie' : 'ce rayon'}. Les boutiques y arrivent bientôt.</p>}
        </div>
        <Link className={styles.rayonsTout} href={lienTout}>Voir tout le rayon {sous ? actif.sousCategories.find((s) => s.slug === sous)?.nom : actif.nom}<span>→</span></Link>
      </div>
    </div>
  </section>
}
