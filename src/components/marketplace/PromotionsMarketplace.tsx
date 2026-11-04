'use client'

import { useState } from 'react'
import Link from 'next/link'

import type { OffreMarketplace } from '@/lib/marketplace-data'
import { CatalogueProductCard } from './CatalogueProductCard'
import { ShopIcon } from './ShopIcon'
import styles from './promotions.module.css'

type LotPromotions = { offres: OffreMarketplace[]; pageSuivante: number | null }

export function PromotionsMarketplace({
  offresInitiales,
  pageInitiale,
  indisponible,
}: {
  offresInitiales: OffreMarketplace[]
  pageInitiale: number | null
  indisponible: boolean
}) {
  const [offres, setOffres] = useState(offresInitiales)
  const [pageSuivante, setPageSuivante] = useState(pageInitiale)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [catalogueIndisponible, setCatalogueIndisponible] = useState(indisponible)

  async function chargerSuite() {
    if (pageSuivante === null || chargement) return
    setChargement(true)
    setErreur('')
    try {
      const reponse = await fetch(`/api/promotions?page=${pageSuivante}`, { headers: { Accept: 'application/json' } })
      if (!reponse.ok) {
        const resultat = await reponse.json() as { erreur?: string }
        if (reponse.status === 502) setCatalogueIndisponible(true)
        throw new Error(resultat.erreur ?? 'Les promotions suivantes sont momentanément indisponibles.')
      }
      const lot = await reponse.json() as LotPromotions
      setOffres((actuelles) => [...actuelles, ...lot.offres])
      setPageSuivante(lot.pageSuivante)
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'Les promotions suivantes n’ont pas pu être chargées.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
          <Link href="/">Accueil</Link><span>›</span><span aria-current="page">Promotions</span>
        </nav>
        <header className={styles.hero}>
          <ShopIcon name="tag" />
          <div>
            <p className={styles.eyebrow}>Les offres des boutiques</p>
            <h1>Promotions</h1>
            <p>Profitez des prix réduits proposés par les boutiques KatiMarket.</p>
          </div>
        </header>

        {catalogueIndisponible && !offres.length ? (
          <section className={styles.empty} role="alert">
            <ShopIcon name="info" />
            <h2>Les offres sont momentanément indisponibles</h2>
            <p>Réessayez dans un instant pour découvrir les promotions des boutiques.</p>
          </section>
        ) : offres.length ? (
          <>
            <p className={styles.count}>{offres.length} offre{offres.length > 1 ? 's' : ''} en promotion</p>
            <section className={styles.grid} aria-label="Offres en promotion">
              {offres.map((offre) => <CatalogueProductCard key={offre.id} offer={offre} />)}
            </section>
          </>
        ) : (
          <section className={styles.empty}>
            <ShopIcon name="tag" />
            <h2>Aucune promotion trouvée pour le moment</h2>
            <p>Continuez à parcourir les offres des boutiques pour vérifier les suivantes.</p>
          </section>
        )}

        {erreur ? <p className={styles.error} role="alert">{erreur}</p> : null}
        {pageSuivante !== null ? (
          <button className={styles.more} type="button" onClick={() => void chargerSuite()} disabled={chargement}>
            {chargement ? 'Recherche des promotions…' : offres.length ? 'Voir plus de promotions' : 'Chercher les promotions suivantes'}
          </button>
        ) : !catalogueIndisponible && offres.length ? (
          <p className={styles.end}>Vous avez vu toutes les promotions disponibles.</p>
        ) : null}
      </div>
    </main>
  )
}
