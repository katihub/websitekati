'use client'

import { useEffect, useState } from 'react'
import { defileAutomatiquement, indiceSuivant, INTERVALLE_DEFILEMENT_MS } from '@/lib/carrousel-accueil'

/**
 * Le defilement partage par le grand bandeau et la zone promo.
 *
 * Il s'arrete tant que la souris survole le carrousel, qu'un de ses elements a
 * le focus clavier ou qu'un doigt le touche, et ne demarre jamais quand le
 * visiteur a demande moins d'animations a son systeme.
 */
export function useDefilement(nombre: number, intervalle = INTERVALLE_DEFILEMENT_MS) {
  const [active, setActive] = useState(0)
  const [enPause, setEnPause] = useState(false)
  const [mouvementReduit, setMouvementReduit] = useState(false)

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)')
    const lire = () => setMouvementReduit(requete.matches)
    lire()
    requete.addEventListener('change', lire)
    return () => requete.removeEventListener('change', lire)
  }, [])

  const defile = defileAutomatiquement(nombre, mouvementReduit) && !enPause
  useEffect(() => {
    if (!defile) return
    const minuterie = window.setInterval(() => setActive((valeur) => indiceSuivant(valeur, 1, nombre)), intervalle)
    return () => window.clearInterval(minuterie)
  }, [defile, nombre, intervalle])

  const courant = nombre > 0 ? Math.min(active, nombre - 1) : 0
  const pause = {
    onMouseEnter: () => setEnPause(true),
    onMouseLeave: () => setEnPause(false),
    onFocus: () => setEnPause(true),
    onBlur: () => setEnPause(false),
    onTouchStart: () => setEnPause(true),
    onTouchEnd: () => setEnPause(false),
  }
  return {
    active: courant,
    aller: (indice: number) => setActive(indice),
    changer: (sens: number) => setActive(indiceSuivant(courant, sens, nombre)),
    pause,
  }
}
