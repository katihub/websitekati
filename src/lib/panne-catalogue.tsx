import 'server-only'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { PanneCatalogue } from '@/components/layout/PanneCatalogue'
import { CatalogueIndisponible } from '@/lib/catalogue-en-direct'

/**
 * UNE PAGE DU CATALOGUE EN PANNE SE DESSINE COTE SERVEUR.
 *
 * LE DEFAUT CONSTATE. Backend arrete, /produit/<slug> et /catalogue?page=8
 * repondaient 500 avec `<html id="__next_error__">` : pas de titre, pas de texte,
 * pas d'en-tete. `error.tsx` est un composant client, et une page qui leve avant
 * que la coquille parte n'a que lui : le message apparaissait apres 0,8 a 1,2 s
 * sur un poste de developpement, le temps de charger le JavaScript, et jamais
 * sans lui.
 *
 * LA PANNE EST DONC ATTRAPEE DANS LA PAGE, ET SEULEMENT ELLE.
 * `CatalogueIndisponible` devient `PanneCatalogue`, rendu avec le layout ; tout
 * le reste — `notFound()`, une redirection, `connection()` au build, une vraie
 * erreur — est relance tel quel, et Next le traite comme avant.
 *
 * LE PRIX : UN STATUT 200. Une page de l'App Router ne peut pas choisir un 503,
 * et le 500 de Next ne sort qu'avec son document vide. Les metadonnees de panne
 * portent donc `noindex`, pour qu'un robot qui passe pendant la panne n'indexe
 * pas « Le catalogue ne répond pas » a la place d'une fiche. Les journaux, eux,
 * gardent la trace de chaque lecture en echec (`[catalogue] ...`).
 *
 * CES PAGES SONT DYNAMIQUES. Le rendu de panne n'entre dans aucun cache de
 * page : chacune lit `searchParams`, un segment dynamique ou `connection()`.
 */
export function avecPanneCatalogue<P>(page: (props: P) => Promise<ReactNode>) {
  return async function PageOuPanne(props: P): Promise<ReactNode> {
    try {
      return await page(props)
    } catch (erreur) {
      if (!(erreur instanceof CatalogueIndisponible)) throw erreur
      return <PanneCatalogue />
    }
  }
}

const METADONNEES_PANNE: Metadata = {
  title: 'Catalogue indisponible',
  robots: { index: false, follow: false },
}

/** Les metadonnees d'une page du catalogue, ou celles de la panne. */
export function metadonneesAvecPanne<P>(generer: (props: P) => Promise<Metadata>) {
  return async function MetadonneesOuPanne(props: P): Promise<Metadata> {
    try {
      return await generer(props)
    } catch (erreur) {
      if (!(erreur instanceof CatalogueIndisponible)) throw erreur
      return METADONNEES_PANNE
    }
  }
}
