import { NextResponse } from 'next/server'

import { CatalogueIndisponible, lireListe } from '@/lib/catalogue-en-direct'
import type { CarteProduit } from '@/types/catalogue'

/**
 * LES PREMIERS PRODUITS D'UN RAYON, POUR LA CARTE DE L'OUVERTURE.
 *
 * POURQUOI UNE ROUTE ET PAS DOUZE LECTURES AU RENDU. L'accueil montre les
 * premiers produits du rayon pointe dans le rail, et le rail en compte douze.
 * Les charger tous au rendu, c'est douze appels au backend et quatre-vingt-seize
 * cartes dans le document pour n'en montrer que huit : la page grossit d'autant
 * sur une connexion qui se paie au mega-octet. La page rend donc le premier
 * rayon, deja lu pour elle, et cette route sert les autres au moment ou le
 * curseur les demande.
 *
 * `vitrine` ET NON `visiteur` : l'appel part du serveur de la vitrine vers le
 * backend, comme les lectures de page, et il est commun a tous les visiteurs —
 * c'est la meme reponse pour tout le monde. Le quota par adresse du backend
 * n'a rien a compter ici (voir `Payeur`).
 */

/** Huit : deux rangees pleines a quatre colonnes, une a deux sur un telephone. */
export const PREMIERS_PRODUITS = 8

export interface ProduitsDuRayon {
  readonly rayon: string
  readonly produits: readonly CarteProduit[]
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/

export async function GET(requete: Request) {
  const rayon = new URL(requete.url).searchParams.get('rayon')?.trim() ?? ''
  if (!SLUG.test(rayon)) {
    return NextResponse.json({ erreur: 'rayon invalide' }, { status: 400 })
  }

  try {
    const liste = await lireListe({ rayons: [rayon], parPage: PREMIERS_PRODUITS }, 'vitrine')
    if (!liste) return NextResponse.json({ erreur: 'rayon inconnu' }, { status: 404 })

    const reponse: ProduitsDuRayon = { rayon, produits: liste.produits }
    /* Une minute au navigateur, la meme fraicheur que les lectures de page :
       pointer douze rayons de suite ne doit pas couter douze allers-retours a
       chaque passage de souris. */
    return NextResponse.json(reponse, {
      headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  } catch (erreur) {
    if (erreur instanceof CatalogueIndisponible) {
      return NextResponse.json({ erreur: 'catalogue indisponible' }, { status: 503 })
    }
    throw erreur
  }
}
