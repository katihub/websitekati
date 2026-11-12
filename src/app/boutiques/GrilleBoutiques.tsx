'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type CSSProperties } from 'react'

import { ShopIcon } from '@/components/marketplace/ShopIcon'
import { BarreChargement } from '@/components/ui/BarreChargement'
import { adresseAnnuaire, numerosDePage } from '@/lib/annuaire-boutiques'
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

export interface PaginationBoutiques {
  page: number
  taille: number
  total: number
  pages: number
}

/** Cinq cartes, une rangee sur grand ecran : les images arrivent rangee par rangee. */
const LOT = 5
/** Une image lente n'arrete pas la suite : l'optimiseur peut y passer plusieurs secondes. */
const ATTENTE_LOT_MS = 4000
/**
 * UNE IMAGE QUI NE REPOND JAMAIS NE BLOQUE PAS LA BARRE. L'optimiseur peut ne
 * jamais rendre une variante (une conversion AVIF bloquee, le 7 novembre 2026,
 * laissait la barre a 9/10 indefiniment) : passe ce delai, ses images comptent
 * comme terminees.
 */
const ATTENTE_IMAGE_MS = 8000
const NOMBRE_APERCUS = 5
/** Le temps de laisser finir la frappe avant de relancer la recherche cote serveur. */
const DELAI_RECHERCHE_MS = 400

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
 * TOUTES LES CARTES DE LA PAGE SONT DANS LE HTML, SEULES LEURS IMAGES ATTENDENT.
 * Le nom et le lien de chaque boutique restent lisibles tout de suite et par les
 * moteurs de recherche. Une carte peut charger sa couverture, son logo et cinq
 * aperçus : un lot ne les demande que lorsque le precedent est termine et que
 * le lot arrive pres de l'ecran, pour ne pas faire payer au client les images
 * qu'il ne verra jamais.
 */
function Grille({ boutiques, decalage }: { boutiques: CarteBoutique[]; decalage: number }) {
  const [autorisees, setAutorisees] = useState(LOT)
  const [terminees, setTerminees] = useState<ReadonlySet<string>>(() => new Set())
  const [delaiEcoulePour, setDelaiEcoulePour] = useState(0)
  const grille = useRef<HTMLDivElement>(null)
  const total = boutiques.length
  const estPrete = (carte: CarteBoutique) => imagesDe(carte).every((url) => terminees.has(url))
  const pretes = boutiques.filter(estPrete).length
  const enCours = total > 0 && !boutiques.slice(0, autorisees).every(estPrete)
  const lotLibere = !enCours || delaiEcoulePour === autorisees

  useEffect(() => {
    if (!enCours || delaiEcoulePour === autorisees) return
    const minuterie = window.setTimeout(() => setDelaiEcoulePour(autorisees), ATTENTE_LOT_MS)
    return () => window.clearTimeout(minuterie)
  }, [enCours, autorisees, delaiEcoulePour])

  useEffect(() => {
    const urls = boutiques.slice(0, autorisees).flatMap(imagesDe)
    const minuterie = window.setTimeout(() => setTerminees((avant) => {
      const manquantes = urls.filter((url) => !avant.has(url))
      return manquantes.length ? new Set([...avant, ...manquantes]) : avant
    }), ATTENTE_IMAGE_MS)
    return () => window.clearTimeout(minuterie)
  }, [boutiques, autorisees])

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
        <Carte key={carte.id} carte={carte} index={decalage + index} images={index < autorisees} prete={estPrete(carte)} onImage={marquer} />
      ))}
    </div>
  </>
}

/**
 * L'ANNUAIRE, TRENTE BOUTIQUES PAR PAGE.
 *
 * La recherche et la ville sont dans l'adresse et appliquees par le serveur :
 * filtrer dans le navigateur ne chercherait que dans la page affichee. Changer
 * de filtre revient a la premiere page.
 */
export function GrilleBoutiques({ boutiques, villes, pagination, recherche: rechercheInitiale, ville, indisponible }: {
  boutiques: CarteBoutique[]
  villes: string[]
  pagination: PaginationBoutiques
  recherche: string
  ville: string
  indisponible: boolean
}) {
  const router = useRouter()
  const chemin = usePathname()
  const [recherche, setRecherche] = useState(rechercheInitiale)
  const [chargement, demarrer] = useTransition()
  const { page, pages, total, taille } = pagination

  const aller = (cible: { recherche?: string; ville?: string }) => demarrer(() => {
    router.replace(adresseAnnuaire(chemin, { recherche: cible.recherche ?? recherche, ville: cible.ville ?? ville }), { scroll: false })
  })

  useEffect(() => {
    if (recherche.trim() === rechercheInitiale.trim()) return
    const minuterie = window.setTimeout(() => aller({ recherche }), DELAI_RECHERCHE_MS)
    return () => window.clearTimeout(minuterie)
    // `aller` change a chaque rendu ; seule la frappe doit relancer la minuterie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, rechercheInitiale])

  const premier = total ? (page - 1) * taille + 1 : 0
  const dernier = Math.min(page * taille, total)
  const numeros = numerosDePage(page, pages)
  const filtre = Boolean(rechercheInitiale || ville)
  const lien = (numero: number) => adresseAnnuaire(chemin, { page: numero, recherche: rechercheInitiale, ville })

  return <>
    <div className={styles.filters}>
      <label className={styles.search}>
        <ShopIcon name="search" />
        <input aria-label="Rechercher une boutique ou une ville" type="search" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher une boutique ou une ville" />
      </label>
      <label className={styles.cityFilter}>
        <ShopIcon name="pin" />
        <select aria-label="Filtrer par ville" value={ville} onChange={(event) => aller({ ville: event.target.value })}>
          <option value="">Toutes les villes</option>
          {villes.map((nom) => <option key={nom} value={nom}>{nom}</option>)}
        </select>
      </label>
      <p className={styles.resultCount} aria-live="polite">{chargement ? 'Recherche…' : `${total} boutique${total > 1 ? 's' : ''}`}</p>
    </div>
    {indisponible
      ? <div className={styles.noResults} role="status"><ShopIcon name="info" /><strong>Les boutiques sont momentanément indisponibles</strong><span>Réessayez dans quelques instants.</span></div>
      : boutiques.length
        ? <>
          <Grille key={`${page}|${rechercheInitiale}|${ville}`} boutiques={boutiques} decalage={premier ? premier - 1 : 0} />
          {pages > 1 ? <div className={styles.bas}>
            <nav className={styles.pagination} aria-label="Pagination des boutiques">
              {page > 1 ? <Link href={lien(page - 1)} aria-label="Page précédente">‹</Link> : null}
              {numeros.map((numero, index) => <span key={numero}>
                {index && numero - (numeros[index - 1] ?? numero) > 1 ? <i>…</i> : null}
                <Link aria-current={numero === page ? 'page' : undefined} href={lien(numero)}>{numero}</Link>
              </span>)}
              {page < pages ? <Link href={lien(page + 1)} aria-label="Page suivante">›</Link> : null}
            </nav>
            <p>{premier}–{dernier} sur {total} boutiques</p>
          </div> : null}
        </>
        : <div className={styles.noResults} role="status"><ShopIcon name="search" /><strong>Aucune boutique trouvée</strong><span>Essayez un autre nom ou choisissez une autre ville.</span>{filtre ? <button type="button" onClick={() => { setRecherche(''); demarrer(() => router.replace(chemin, { scroll: false })) }}>Effacer les filtres</button> : null}</div>}
  </>
}
