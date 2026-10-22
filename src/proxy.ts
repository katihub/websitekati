import { NextResponse, type NextRequest } from 'next/server'

import { adresseMarketplace } from '@/lib/adresses-marketplace'

/**
 * LES ANCIENNES ADRESSES DU MAGASIN NOWTECH, REDIRIGEES POUR DE BON.
 *
 * `/categorie`, `/rayon`, `/marque` et `/produit` lisent l'ancien catalogue
 * NowTech, absent d'une base marketplace : une visite y tombait sur une page
 * vide ou sur l'ecran de panne. Les liens du site n'y menent plus, mais ceux
 * du dehors si — favoris, resultats de recherche, messages WhatsApp partages.
 *
 * 308 ET NON 307 : la redirection est permanente, les moteurs de recherche
 * reportent le referencement de l'ancienne page sur la nouvelle. La
 * traduction est celle des liens internes (`adresseMarketplace`, testee) :
 * rayon ou famille connus vers leur categorie, les autres vers le catalogue,
 * marque et produit vers la recherche.
 *
 * Les anciens fichiers de page restent en place, simplement inatteignables :
 * le `matcher` limite ce proxy a ces quatre prefixes, le reste du site ne le
 * traverse jamais.
 */
export function proxy(requete: NextRequest) {
  const cible = adresseMarketplace(requete.nextUrl.pathname)
  if (cible === requete.nextUrl.pathname) return NextResponse.next()
  return NextResponse.redirect(new URL(cible, requete.url), 308)
}

export const config = {
  matcher: ['/categorie/:slug*', '/rayon/:slug*', '/marque/:slug*', '/produit/:slug*'],
}
