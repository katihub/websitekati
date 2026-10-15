'use client'

import { useEffect } from 'react'

import { garderParrainage, noterClic } from '@/lib/parrainage'

/**
 * SUR TOUTES LES PAGES : un lien `?p=CODE` est garde pour le futur compte du
 * visiteur, le clic est note, et le parametre disparait de l'adresse pour
 * qu'un lien partage ensuite ne porte pas le code d'un autre.
 */
export function CaptureParrainage() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('p')
    if (!code || !/^[A-Za-z0-9-]{4,40}$/.test(code)) return
    url.searchParams.delete('p')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    const garde = garderParrainage(code)
    if (garde) void noterClic(garde)
  }, [])
  return null
}
