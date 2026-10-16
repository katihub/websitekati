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
 * super admin dans le panel (Contenu > Bannieres), dans leur ordre. Deux par
 * vue sur grand ecran, une sur telephone ; defilement automatique, suspendu au
 * survol, au focus et au toucher, et absent quand le visiteur demande moins
 * d'animations.
 */

const INTERVALLE_MS = 5000

export function PromosCarrousel({ promos, afficherLibelles = false }: { promos: PublishedBanner[]; afficherLibelles?: boolean }) {
  const piste = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(Math.ceil(promos.length / 2))
  const [suspendu, setSuspendu] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)

  const parVue = useCallback(() => {
    const element = piste.current
    const carte = element?.firstElementChild as HTMLElement | null
    return element && carte ? Math.max(1, Math.round(element.clientWidth / carte.offsetWidth)) : 2
  }, [])

  const allerA = useCallback((cible: number) => {
    const element = piste.current
    const carte = element?.children[Math.min(cible * parVue(), promos.length - 1)] as HTMLElement | undefined
    if (!element || !carte) return
    element.scrollTo({ left: carte.offsetLeft - element.offsetLeft, behavior: mouvementReduit ? 'auto' : 'smooth' })
  }, [parVue, promos.length, mouvementReduit])

  useEffect(() => {
    const element = piste.current
    if (!element) return
    const mesurer = () => setPages(Math.ceil(promos.length / parVue()))
    const suivre = () => {
      const carte = element.firstElementChild as HTMLElement | null
      if (!carte) return
      const pas = carte.offsetWidth + parseFloat(getComputedStyle(element).columnGap || '0')
      setPage(Math.round(element.scrollLeft / (pas * parVue())))
    }
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(element)
    element.addEventListener('scroll', suivre, { passive: true })
    return () => { observateur.disconnect(); element.removeEventListener('scroll', suivre) }
  }, [parVue, promos.length])

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

  return <section className={styles.promos} aria-roledescription="carrousel" aria-label="Promotions KatiHub" data-testid="promos-accueil">
    <div
      ref={piste}
      className={styles.piste}
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSuspendu(false) }}
      onTouchStart={() => setSuspendu(true)}
    >
      {promos.map((promo, index) => <Link key={promo.id} href={promo.href} className={styles.promo} aria-label={promo.label} role="group" aria-roledescription="diapositive">
        <Image src={promo.large.url} alt={promo.alt} fill sizes="(max-width: 850px) 100vw, 30vw" priority={index < 2} style={{ objectPosition: `center ${promo.focus}%` }} />
        {afficherLibelles ? <span className={styles.promoCopy}><b>{promo.label}</b><small>Découvrir <span aria-hidden="true">→</span></small></span> : null}
      </Link>)}
    </div>
    {pages > 1 ? <div className={styles.controles}>
      <button type="button" className={styles.fleche} aria-label="Promotions précédentes" onClick={() => allerA((page - 1 + pages) % pages)}>‹</button>
      <div className={styles.points}>{Array.from({ length: pages }, (_, index) => <button key={index} type="button" aria-label={`Afficher les promotions ${index + 1} sur ${pages}`} aria-current={index === page} onClick={() => allerA(index)} />)}</div>
      <button type="button" className={styles.fleche} aria-label="Promotions suivantes" onClick={() => allerA((page + 1) % pages)}>›</button>
    </div> : null}
  </section>
}
