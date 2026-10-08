import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

import { ETIQUETTES_FIXES, etiquetteProduit } from '@/lib/catalogue-en-direct'

/**
 * LA PORTE PAR LAQUELLE LE COMPTOIR DIT A LA VITRINE QUE QUELQUE CHOSE A CHANGE.
 *
 * LE DEFAUT QU'ELLE REPARE, ET IL ETAIT SIGNALE PAR LE CLIENT. Un prix corrige
 * dans le panel n'apparaissait pas sur le site apres rechargement. La cause
 * n'etait pas une lecture figee au build — la vitrine lit le backend a la
 * demande — mais le cache de `fetch` : soixante secondes de
 * validite, et une politique « servir le perime, rafraichir derriere ». La
 * PREMIERE visite apres la correction montre donc encore l'ancien prix, et la
 * seconde le nouveau. Un commercant qui corrige un tarif recharge une fois,
 * voit l'ancien montant et conclut, a raison, que le panel ne sert a rien.
 *
 * LES ETIQUETTES SONT POSEES PAR `@/lib/catalogue-en-direct`, ET LA LISTE AUSSI.
 * Toute lecture du catalogue y porte `catalogue`, et une fiche porte en plus
 * `produit` et `produit:<slug>`. Sans route d'invalidation, une etiquette n'est
 * qu'un commentaire ; et une etiquette ajoutee la-bas mais oubliee ici en est un
 * aussi. La route lit donc `ETIQUETTES_FIXES` au lieu de les recopier.
 *
 * SOIXANTE SECONDES RESTENT, COMME FILET. L'invalidation poussee est le chemin
 * normal ; le delai est ce qui rattrape un appel perdu — un reseau coupe entre
 * Francfort et Vercel, un secret mal recopie. Sans lui, une seule requete
 * manquee figerait un prix jusqu'au prochain deploiement.
 *
 * LE SECRET EST OBLIGATOIRE, ET SON ABSENCE FERME LA PORTE. Une route
 * d'invalidation ouverte est un moyen gratuit de faire recalculer un site
 * entier a la demande. Si la variable n'est pas configuree, on refuse tout
 * plutot que de laisser passer tout : une configuration incomplete doit se
 * traduire par un site qui rafraichit lentement, jamais par un site exposé.
 */

export const runtime = 'nodejs'

/* AUCUN CACHE ICI, EVIDEMMENT : c'est la route qui en supprime. */
export const dynamic = 'force-dynamic'

const SECRET = process.env.REVALIDATION_SECRET ?? ''

/** Perime tout de suite, plutot que « perime au prochain passage ». */
const EXPIRER = { expire: 0 } as const

/** Ce que le backend peut demander d'oublier. */
interface Demande {
  /** Les fiches a rafraichir nommement, quand l'appelant sait lesquelles. */
  readonly slugs?: readonly string[]
}

/**
 * Comparaison a duree constante. Le secret est court et l'attaquant peut
 * reessayer sans limite : un `===` fuirait le nombre de caracteres justes par
 * le temps de reponse. Le cout est nul, l'habitude est bonne a prendre.
 */
function memeSecret(recu: string): boolean {
  if (recu.length !== SECRET.length) return false
  let ecart = 0
  for (let i = 0; i < recu.length; i += 1) ecart |= recu.charCodeAt(i) ^ SECRET.charCodeAt(i)
  return ecart === 0
}

export async function POST(request: Request) {
  if (!SECRET) {
    console.error('[revalidation] REVALIDATION_SECRET absent : la porte reste fermee')
    return NextResponse.json({ erreur: 'revalidation non configuree' }, { status: 503 })
  }

  if (!memeSecret(request.headers.get('x-revalidation-secret') ?? '')) {
    return NextResponse.json({ erreur: 'secret invalide' }, { status: 401 })
  }

  /* UN CORPS ILLISIBLE N'EST PAS UNE ERREUR. L'appelant qui veut tout
     rafraichir n'a rien a dire : `fetch` sans corps est la forme la plus
     simple de « j'ai touche au catalogue, oublie ce que tu sais ». */
  let demande: Demande = {}
  try {
    const brut: unknown = await request.json()
    if (brut && typeof brut === 'object') demande = brut as Demande
  } catch {
    demande = {}
  }

  /* TOUT LE CATALOGUE A CHAQUE APPEL, ET PAS SEULEMENT LA FICHE ECRITE. Un
     prix apparait aussi dans les listes, la recherche, les suggestions et
     l'accueil : n'expirer que `produit:<slug>` laisserait la grille d'un rayon
     annoncer l'ancien montant a cote d'une fiche qui porte le nouveau.

     `expire: 0` ET SURTOUT PAS `'max'`. Le profil recommande par la
     documentation marque l'etiquette comme perimee et applique
     « servir le perime, rafraichir derriere » : la visite SUIVANTE verrait
     encore l'ancien prix, c'est-a-dire exactement le defaut qu'on repare.
     Ici la lecture doit attendre la base une fois, pour que le commercant
     qui recharge apres avoir corrige son tarif voie son tarif.

     LE PRIX DE CE CHOIX, MESURE. Sans ecriture, un backend arrete laisse le
     site servir ses copies : / et /rayon/stockage-disques-nas repondaient 200
     en 0,07 et 0,12 s avec des entrees vieilles de plus d'une minute. Juste
     apres une ecriture, ces copies n'existent plus : backend fige, les memes
     pages ont attendu leurs six secondes et affiche la panne. Toute page que
     personne n'a revisitee entre l'ecriture et la panne est donc
     indisponible jusqu'au retour du backend.

     LA SORTIE EST COTE BACKEND. N'expirer en dur que ce qui montre le produit
     ecrit (sa fiche, les listes de son rayon, de ses familles et de sa
     marque, la recherche) et laisser le reste en « servir le perime » demande
     que l'appel nomme ce rayon, ces familles et cette marque : il n'envoie
     aujourd'hui que des slugs de produits. C'est aussi une decision du
     proprietaire, puisqu'elle rouvre, sur les pages non nommees, la visite
     qui montre encore l'ancien prix. */
  const fixes = [...ETIQUETTES_FIXES]
  for (const etiquette of fixes) revalidateTag(etiquette, EXPIRER)

  /* PUIS LES FICHES NOMMEES. Leur etiquette est plus fine et ne coute rien a
     tirer en plus : le backend sait quel produit il vient d'ecrire. */
  const slugs = Array.isArray(demande.slugs)
    ? demande.slugs.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    : []
  const nommees = slugs.slice(0, 200).map(etiquetteProduit)
  for (const etiquette of nommees) revalidateTag(etiquette, EXPIRER)

  return NextResponse.json({ revalide: [...fixes, ...nommees] })
}
