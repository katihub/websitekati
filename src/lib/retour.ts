'use client'

import { useSyncExternalStore } from 'react'

/**
 * LE RETOUR APRES CONNEXION OU INSCRIPTION.
 *
 * `/connexion?retour=…` et `/inscription?retour=…` ramenent le client la ou il
 * etait (sa commande, son devis, une boutique). Seul un chemin INTERNE est
 * suivi : `/x` oui, `//site` et `/\site` non — un navigateur lit ces deux-la
 * comme une autre origine, et un lien piege ferait de KatiMarket une redirection
 * ouverte vers n'importe quel site.
 */
export function retourSur(valeur: string | null | undefined): string | null {
  return valeur && /^\/(?![/\\])/.test(valeur) ? valeur : null
}

const sAbonner = (rappel: () => void) => {
  window.addEventListener('popstate', rappel)
  return () => window.removeEventListener('popstate', rappel)
}

/** Le `?retour=` de la page courante, s'il est sur ; `null` sinon et au rendu serveur. */
export function useRetourDemande(): string | null {
  const recherche = useSyncExternalStore(sAbonner, () => window.location.search, () => '')
  return retourSur(new URLSearchParams(recherche).get('retour'))
}

/** La page courante, a passer en `?retour=` ; `null` au rendu serveur. */
export function useIci(): string | null {
  return useSyncExternalStore(sAbonner, () => `${window.location.pathname}${window.location.search}`, () => null)
}

/** Ajoute `?retour=` a un chemin quand il y a ou revenir. */
export function avecRetour(chemin: string, retour: string | null): string {
  return retour ? `${chemin}?retour=${encodeURIComponent(retour)}` : chemin
}
