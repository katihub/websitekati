import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { BRAND_MARK_BY_NAME } from '@/constants/brand-marks'
import { imageProduit } from '@/lib/image-produit'
import { libelleDelaiMarketplace } from '@/lib/marketplace-delivery'
import { lireAccueilMarketplace, lireOffresMarketplace, type OffreMarketplace } from '@/lib/marketplace-data'
import { productCardSpecs } from '@/lib/product-card-specs'
import styles from './marques.module.css'

export const metadata: Metadata = {
  title: 'Toutes les marques | KatiMarket',
  description: 'Explorez les marques proposées par les vendeurs KatiMarket et découvrez leurs offres disponibles au Cameroun.',
}

interface PageProps {
  searchParams: Promise<{ q?: string | string[]; lettre?: string | string[] }>
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const nombre = new Intl.NumberFormat('fr-FR')
const money = (prix: number | null) => prix === null ? 'Prix sur demande' : `${nombre.format(prix)} FCFA`

function parametre(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function initiales(nom: string) {
  const mots = nom.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return (mots.length > 1 ? `${mots[0]?.[0] ?? ''}${mots[1]?.[0] ?? ''}` : (mots[0] ?? '?').slice(0, 2)).toUpperCase()
}

function marqueHref(marque: string) {
  return `/catalogue?marque=${encodeURIComponent(marque)}`
}

function MarqueVisuel({ nom }: { nom: string }) {
  const logo = BRAND_MARK_BY_NAME.get(nom.toUpperCase())
  return <span className={styles.brandVisual} aria-hidden="true">{logo
    ? <span className={styles.brandLogo} style={{ '--mark-src': `url(/brands/${logo.file}.svg)`, '--mark-ink': logo.paint } as CSSProperties} />
    : <span className={styles.brandInitials}>{initiales(nom)}</span>}
  </span>
}

function OffreCard({ offre, index }: { offre: OffreMarketplace; index: number }) {
  const visuel = imageProduit(offre.produit)
  const specs = productCardSpecs(offre, 2)
  const href = `/marketplace/produits/${offre.produit.slug}?boutique=${encodeURIComponent(offre.boutique.slug)}`
  return <article className={styles.offerCard} style={{ '--delay': `${Math.min(index, 5) * 55}ms` } as CSSProperties}>
    <Link href={href} className={styles.offerImage} aria-label={`Voir ${offre.titre ?? offre.produit.nom}`}>
      {visuel ? <Image src={visuel.url} alt={visuel.alt} fill sizes="(max-width: 700px) 76vw, 260px" /> : <span>{initiales(offre.produit.marque ?? offre.produit.nom)}</span>}
      {offre.produit.marque ? <b>{offre.produit.marque}</b> : null}
    </Link>
    <div className={styles.offerBody}>
      <small>Vendu par {offre.boutique.nom}</small>
      <h3><Link href={href}>{offre.titre ?? offre.produit.nom}</Link></h3>
      {specs.length ? <ul aria-label="Caractéristiques principales">{specs.map((spec) => <li key={spec}>{spec}</li>)}</ul> : null}
      <strong>{money(offre.prixFcfa)}</strong>
      <p><i />Disponible <span>· {libelleDelaiMarketplace(offre.delaiMaxJours)}</span></p>
    </div>
  </article>
}

export default async function MarquesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = parametre(params.q)
  const lettre = parametre(params.lettre).toUpperCase()
  const [catalogue, accueil] = await Promise.all([
    lireOffresMarketplace({ page: 1, taille: 100, tri: 'recent' }),
    lireAccueilMarketplace(),
  ])

  const offres = catalogue.offres.length ? catalogue.offres : accueil.offres
  const compteDerive = new Map<string, number>()
  for (const offre of offres) {
    const marque = offre.produit.marque?.trim()
    if (marque) compteDerive.set(marque, (compteDerive.get(marque) ?? 0) + 1)
  }
  const marques = (catalogue.facettes?.marques?.length
    ? catalogue.facettes.marques
    : [...compteDerive].map(([nom, n]) => ({ nom, nombre: n })))
    .filter((marque) => marque.nom && marque.nombre > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }))

  const terme = q.toLocaleLowerCase('fr')
  const filtrees = marques.filter((marque) => {
    const correspondRecherche = !terme || marque.nom.toLocaleLowerCase('fr').includes(terme)
    const correspondLettre = !lettre || lettre === 'TOUTES' || marque.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().startsWith(lettre)
    return correspondRecherche && correspondLettre
  })
  const groupes = new Map<string, typeof filtrees>()
  for (const marque of filtrees) {
    const cle = marque.nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase() || '#'
    groupes.set(cle, [...(groupes.get(cle) ?? []), marque])
  }
  const populaires = [...marques].sort((a, b) => b.nombre - a.nombre || a.nom.localeCompare(b.nom, 'fr')).slice(0, 12)
  const suggestions = offres.filter((offre) => offre.prixFcfa !== null).slice(0, 8)

  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span>/</span><b>Marques</b></nav>

    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>Explorer KatiMarket</span><h1>Trouvez vos produits par marque</h1><p>Des références proposées par des vendeurs locaux, avec stock, prix et livraison clairement annoncés.</p></div>
      <form className={styles.search} action="/marques" role="search">
        <label htmlFor="brand-search">Rechercher une marque</label>
        <div><input id="brand-search" name="q" defaultValue={q} placeholder="HP, Samsung, Lenovo…" /><button>Rechercher <span aria-hidden="true">→</span></button></div>
      </form>
    </section>

    {populaires.length ? <section className={styles.popular} aria-labelledby="popular-title">
      <header><div><span className={styles.eyebrow}>Les plus recherchées</span><h2 id="popular-title">Marques populaires</h2></div><p>{nombre.format(marques.length)} marques disponibles aujourd’hui</p></header>
      <ul>{populaires.map((marque, index) => <li key={marque.nom} style={{ '--delay': `${index * 35}ms` } as CSSProperties}><Link href={marqueHref(marque.nom)}><MarqueVisuel nom={marque.nom} /><span><b>{marque.nom}</b><small>{nombre.format(marque.nombre)} offre{marque.nombre > 1 ? 's' : ''}</small></span><i aria-hidden="true">→</i></Link></li>)}</ul>
    </section> : null}

    <section className={styles.directory} id="index" aria-labelledby="directory-title">
      <header><div><span className={styles.eyebrow}>Répertoire complet</span><h2 id="directory-title">Toutes les marques</h2></div><p>{nombre.format(filtrees.length)} résultat{filtrees.length > 1 ? 's' : ''}{q ? ` pour « ${q} »` : ''}</p></header>
      <nav className={styles.alphabet} aria-label="Filtrer par lettre">
        <Link href={q ? `/marques?q=${encodeURIComponent(q)}` : '/marques'} aria-current={!lettre ? 'page' : undefined}>Toutes</Link>
        {alphabet.map((caractere) => <Link key={caractere} href={`/marques?lettre=${caractere}${q ? `&q=${encodeURIComponent(q)}` : ''}`} aria-current={lettre === caractere ? 'page' : undefined}>{caractere}</Link>)}
      </nav>
      {groupes.size ? <div className={styles.groups}>{[...groupes].map(([cle, liste]) => <section key={cle} className={styles.group}><h3>{cle}</h3><ul>{liste.map((marque) => <li key={marque.nom}><Link href={marqueHref(marque.nom)}><span><b>{marque.nom}</b><small>{nombre.format(marque.nombre)} offre{marque.nombre > 1 ? 's' : ''}</small></span><i aria-hidden="true">→</i></Link></li>)}</ul></section>)}</div> : <div className={styles.empty}><b>Aucune marque ne correspond à votre recherche.</b><p>Essayez une autre orthographe ou revenez à l’index complet.</p><Link href="/marques">Afficher toutes les marques</Link></div>}
    </section>

    {suggestions.length ? <section className={styles.offers} aria-labelledby="offers-title">
      <header><div><span className={styles.eyebrow}>À découvrir maintenant</span><h2 id="offers-title">Les nouveautés de nos vendeurs</h2><p>Des produits disponibles, choisis parmi les dernières offres publiées.</p></div><Link href="/catalogue">Voir tout le catalogue <span aria-hidden="true">→</span></Link></header>
      <div className={styles.offerRail}>{suggestions.map((offre, index) => <OffreCard key={offre.id} offre={offre} index={index} />)}</div>
    </section> : null}

    {!marques.length ? <section className={styles.unavailable}><h2>Les marques se mettent à jour.</h2><p>Le répertoire est momentanément vide, mais vous pouvez continuer à explorer les produits disponibles.</p><Link href="/catalogue">Explorer le catalogue →</Link></section> : null}
  </main>
}
