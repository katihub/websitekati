'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { ShopIcon } from '@/components/marketplace/ShopIcon'
import { BarreChargement } from '@/components/ui/BarreChargement'
import styles from './shops.module.css'

export interface CarteBoutique {
  id: string
  slug: string
  nom: string
  description: string
  villes: string
  logoUrl: string | null
  banniereUrl: string | null
  miniatures: string[]
}

/** Cinq cartes, une rangee sur grand ecran : les images arrivent rangee par rangee. */
const LOT = 5
/** Une image lente n'arrete pas la suite : l'optimiseur peut y passer plusieurs secondes. */
const ATTENTE_LOT_MS = 4000
const NOMBRE_APERCUS = 3

const imagesDe = (carte: CarteBoutique) => [carte.banniereUrl, carte.logoUrl, ...carte.miniatures].filter((url): url is string => Boolean(url))

function Carte({ carte, index, images, prete, onImage }: { carte: CarteBoutique; index: number; images: boolean; prete: boolean; onImage: (url: string) => void }) {
  const [miniatures, setMiniatures] = useState(carte.miniatures.slice(0, NOMBRE_APERCUS))
  const [miniaturesTraitees, setMiniaturesTraitees] = useState(carte.miniatures.length >= NOMBRE_APERCUS)
  const [erreurMiniatures, setErreurMiniatures] = useState(false)
  const suivi = (url: string) => ({ onLoad: () => onImage(url), onError: () => onImage(url), loading: 'eager' as const })

  useEffect(() => {
    if (!images || miniaturesTraitees) return
    const controleur = new AbortController()
    const query = new URLSearchParams({ boutique: carte.slug, page: '1' })

    void fetch(`/api/boutique-offres?${query}`, { signal: controleur.signal, headers: { Accept: 'application/json' } })
      .then(async (reponse) => {
        if (!reponse.ok) throw new Error(`Impossible de charger les aperçus de ${carte.nom} (${reponse.status}).`)
        return await reponse.json() as { offres: Array<{ produit: { images?: Array<{ url: string }> } }> }
      })
      .then((resultat) => {
        if (controleur.signal.aborted) return
        const urls = [...new Set([
          ...miniatures,
          ...resultat.offres.flatMap((offre) => offre.produit.images?.map((image) => image.url) ?? []),
        ])].slice(0, NOMBRE_APERCUS)
        setMiniatures(urls)
        setMiniaturesTraitees(true)
      })
      .catch(() => {
        if (!controleur.signal.aborted) {
          setErreurMiniatures(true)
          setMiniaturesTraitees(true)
        }
      })

    return () => controleur.abort()
  }, [carte.nom, carte.slug, images, miniatures, miniaturesTraitees])

  return (
    <Link href={`/boutiques/${carte.slug}`} className={styles.card} prefetch={false} data-prete={prete}>
      <div className={`${styles.cover} ${carte.banniereUrl ? styles.coverBanner : ''}`}>
        {carte.banniereUrl && images ? <Image src={carte.banniereUrl} alt="" fill sizes="(max-width: 440px) 100vw, (max-width: 700px) 50vw, 25vw" className={styles.banner} {...suivi(carte.banniereUrl)} /> : null}
        {carte.logoUrl
          ? <span className={styles.logo}>{images ? <Image src={carte.logoUrl} alt={`Logo de ${carte.nom}`} fill sizes="62px" {...suivi(carte.logoUrl)} /> : null}</span>
          : <span style={{ '--hue': `${(index * 43) % 360}` } as CSSProperties}>{carte.nom.slice(0, 2).toUpperCase()}</span>}
      </div>
      <div className={styles.body}>
        <small className={styles.verifiee}><ShopIcon name="check" />BOUTIQUE VÉRIFIÉE</small>
        <h2>{carte.nom}</h2>
        <p>{carte.description}</p>
        <div className={styles.location}><ShopIcon name="pin" /><span>{carte.villes}</span></div>
        <div className={styles.thumbnails} role="group" aria-label={`Quelques produits de ${carte.nom}`}>
          {Array.from({ length: NOMBRE_APERCUS }, (_, emplacement) => {
            const url = miniatures[emplacement]
            return (
            <span className={`${styles.thumbnail} ${url && images ? '' : styles.thumbnailPlaceholder}`} key={url ?? emplacement}>
              {url && images
                ? <Image src={url} alt="" fill sizes="38px" {...suivi(url)} />
                : <ShopIcon name={erreurMiniatures ? 'info' : 'package'} />}
            </span>
            )
          })}
        </div>
        <b className={styles.visiter}>Visiter la boutique<ShopIcon name="arrow" /></b>
      </div>
    </Link>
  )
}

/**
 * TOUTES LES CARTES SONT DANS LE HTML, SEULES LEURS IMAGES ATTENDENT. Le nom et le
 * lien de chaque boutique restent lisibles tout de suite et par les moteurs de
 * recherche. Une carte coute jusqu'a six images : un lot ne les demande que
 * lorsque le precedent est termine et que le lot arrive pres de l'ecran, pour ne
 * pas faire payer au client les images qu'il ne verra jamais.
 */
export function GrilleBoutiques({ boutiques }: { boutiques: CarteBoutique[] }) {
  const [autorisees, setAutorisees] = useState(LOT)
  const [terminees, setTerminees] = useState<ReadonlySet<string>>(() => new Set())
  const [delaiEcoulePour, setDelaiEcoulePour] = useState(0)
  const grille = useRef<HTMLDivElement>(null)
  const total = boutiques.length
  const estPrete = (carte: CarteBoutique) => imagesDe(carte).every((url) => terminees.has(url))
  const pretes = boutiques.filter(estPrete).length
  const enCours = !boutiques.slice(0, autorisees).every(estPrete)
  const lotLibere = !enCours || delaiEcoulePour === autorisees

  useEffect(() => {
    if (!enCours || delaiEcoulePour === autorisees) return
    const minuterie = window.setTimeout(() => setDelaiEcoulePour(autorisees), ATTENTE_LOT_MS)
    return () => window.clearTimeout(minuterie)
  }, [enCours, autorisees, delaiEcoulePour])

  useEffect(() => {
    const prochaine = grille.current?.children[autorisees]
    if (!lotLibere || !prochaine) return
    const observateur = new IntersectionObserver(([entree]) => {
      if (entree?.isIntersecting) setAutorisees((nombre) => nombre + LOT)
    }, { rootMargin: '300px' })
    observateur.observe(prochaine)
    return () => observateur.disconnect()
  }, [autorisees, lotLibere])

  const marquer = (url: string) => setTerminees((avant) => avant.has(url) ? avant : new Set(avant).add(url))

  return <>
    <div className={styles.zoneBarre}>
      {enCours ? <BarreChargement libelle="Chargement des boutiques" valeur={pretes} total={total} /> : null}
    </div>
    <div className={styles.grid} ref={grille}>
      {boutiques.map((carte, index) => (
        <Carte key={carte.id} carte={carte} index={index} images={index < autorisees} prete={estPrete(carte)} onImage={marquer} />
      ))}
    </div>
  </>
}
