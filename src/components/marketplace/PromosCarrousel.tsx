'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { PublishedBanner } from '@/lib/banners'
import styles from './marketplace-promos.module.css'

/**
 * LE CARROUSEL DES PROMOTIONS, SOUS LA GRANDE BANNIERE DE L'ACCUEIL.
 *
 * Les images sont les bannieres de l'emplacement « promo », publiees par le
 * super admin dans le panel (Contenu > Bannieres), dans leur ordre.
 * Six blocs par vue (grille 3 x 2) ; defilement automatique, suspendu au survol,
 * au focus et au toucher, et absent si le visiteur reduit les animations.
 */

const INTERVALLE_MS = 5000
const PAR_LIGNE = 3
const PAR_VUE = PAR_LIGNE * 2

function grouperPromos(promos: PublishedBanner[]) {
  if (promos.length < PAR_VUE) return promos.length ? [promos] : []

  /* Une vue avance d'une ligne, et non de six cartes : avec les six campagnes
     de secours, les deux lignes permutent donc réellement au lieu de produire
     une page unique immobile. Chaque vue contient toujours six campagnes
     distinctes ; les répétitions ne se trouvent que hors écran, dans la vue
     suivante nécessaire à la boucle du carrousel. */
  const nombreVues = Math.ceil(promos.length / PAR_LIGNE)
  return Array.from({ length: nombreVues }, (_, vue) =>
    Array.from({ length: PAR_VUE }, (_, rang) => promos[(vue * PAR_LIGNE + rang) % promos.length]!),
  )
}

export function PromosCarrousel({ promos, afficherLibelles = false }: { promos: PublishedBanner[]; afficherLibelles?: boolean }) {
  const piste = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const groupes = grouperPromos(promos)
  const pages = groupes.length
  const [suspendu, setSuspendu] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)

  const allerA = useCallback((cible: number) => {
    const element = piste.current
    const vue = element?.children[cible] as HTMLElement | undefined
    if (!element || !vue) return
    element.scrollTo({ left: vue.offsetLeft - element.offsetLeft, behavior: mouvementReduit ? 'auto' : 'smooth' })
  }, [mouvementReduit])

  useEffect(() => {
    const element = piste.current
    if (!element) return
    const suivre = () => {
      const vue = element.firstElementChild as HTMLElement | null
      if (!vue) return
      const pas = vue.offsetWidth + parseFloat(getComputedStyle(element).columnGap || '0')
      setPage(Math.round(element.scrollLeft / pas))
    }
    const observateur = new ResizeObserver(suivre)
    observateur.observe(element)
    element.addEventListener('scroll', suivre, { passive: true })
    return () => { observateur.disconnect(); element.removeEventListener('scroll', suivre) }
  }, [promos.length])

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)')
    const appliquer = () => setMouvementReduit(requete.matches)
    requete.addEventListener('change', appliquer)
    const minuterie = window.setTimeout(appliquer, 0)
    return () => { requete.removeEventListener('change', appliquer); window.clearTimeout(minuterie) }
  }, [])

  useEffect(() => {
    if (suspendu || mouvementReduit || pages < 2) return
    const minuterie = window.setInterval(() => allerA((page + 1) % pages), INTERVALLE_MS)
    return () => window.clearInterval(minuterie)
  }, [suspendu, mouvementReduit, pages, page, allerA])

  return <section className={styles.promos} aria-roledescription="carrousel" aria-label="Promotions KatiMarket" data-testid="promos-accueil">
    <div
      ref={piste}
      className={styles.piste}
      data-testid="promos-track"
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuspendu(false) }}
      onTouchStart={() => setSuspendu(true)}
      onTouchEnd={() => setSuspendu(false)}
      onTouchCancel={() => setSuspendu(false)}
    >
      {groupes.map((groupe, index) => <div key={index} className={styles.vue} role="group" aria-roledescription="diapositive" aria-label={`Sélection ${index + 1} sur ${pages}`} data-testid="promo-page">
        {groupe.map((promo, rang) => <Link key={`${index}-${rang}-${promo.id}`} href={promo.href} className={styles.promo} aria-label={promo.label}>
          <Image src={promo.large.url} alt={promo.alt} fill sizes="(max-width: 850px) 48vw, 24vw" priority={index === 0} style={{ objectPosition: `center ${promo.focus}%` }} />
          {afficherLibelles ? <span className={styles.promoCopy}><b>{promo.label}</b><small>Découvrir <span aria-hidden="true">→</span></small></span> : null}
        </Link>)}
      </div>)}
    </div>
    {pages > 1 ? <div className={styles.controles}>
      <button type="button" className={styles.fleche} aria-label="Promotions précédentes" onClick={() => allerA((page - 1 + pages) % pages)}>‹</button>
      <div className={styles.points}>{Array.from({ length: pages }, (_, index) => <button key={index} type="button" aria-label={`Afficher les promotions ${index + 1} sur ${pages}`} aria-current={index === page} onClick={() => allerA(index)} />)}</div>
      <button type="button" className={styles.fleche} aria-label="Promotions suivantes" onClick={() => allerA((page + 1) % pages)}>›</button>
    </div> : null}
  </section>
}
