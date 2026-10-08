import type { Metadata } from 'next'
import { Suspense } from 'react'
import { IBM_Plex_Mono, Poppins } from 'next/font/google'

import './globals.css'
import { AuthDialog } from '@/components/account/AuthDialog'
import { Assistant } from '@/components/assistant/Assistant'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { CartDrawer } from '@/components/layout/CartDrawer'
import { Reveal } from '@/components/ui/Reveal'
import { NavigationProgress } from '@/components/ui/NavigationProgress'
import { ScrollOnQuery } from '@/components/ui/ScrollOnQuery'
import { AccountProvider } from '@/lib/account'
import { CartProvider } from '@/lib/cart'
import { SessionProvider } from '@/lib/session'
import { lireNavigationOuNull, lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'
import { SITE } from '@/constants/site'
import { shopWhatsapp } from '@/lib/comptoirs'

/**
 * Poppins carries the text and the display sizes.
 *
 * It is the face of the reference the storefront was drawn from, identified off
 * the mockup rather than guessed: single-storey `a`, perfectly circular bowls on
 * `o`, `p` and `d`, monolinear strokes, a flat-barred `G`. That is a geometric
 * sans, and among the geometric sans on Google Fonts it is the one this family
 * of commercial templates uses.
 *
 * It changes the register on purpose. Archivo was a grotesque: neutral, tight,
 * engineering. Poppins is round and open, which is warmer and reads younger, and
 * it is what the brief asked for. Two consequences are handled rather than
 * fought: its x-height is large, so the fine end of the scale looks a step
 * bigger than the same numbers in Archivo did, and it sets wide, so measures in
 * `ch` come out shorter in characters than they did.
 *
 * Weights are the three the site actually asks for. `font-extrabold` appears
 * twice; 800 is loaded for it rather than letting the browser fake it, since
 * the body sets `font-synthesis-weight: none`.
 *
 * IBM Plex Mono carries every numeral the customer compares: price, port count,
 * VA rating, reference. Tabular figures are what let a column running from
 * 1 000 to 11 800 000 FCFA stay legible as a column.
 *
 * 400 and 700, not 400 and 500. Prices ask for `font-bold`, the body sets
 * `font-synthesis-weight: none` so nothing is faked, and 500 was the heaviest
 * weight in the file: every price on the site rendered at Medium while claiming
 * to be bold. Nothing asks for 500, so it is dropped rather than added to.
 */
const poppins = Poppins({
  // `subsets` governs preloading, not what the stylesheet contains: the
  // latin-ext faces stay declared with their own unicode-range and load on
  // demand. French needs none of them, and preloading both halves cost 50 380
  // bytes of the 105 432 the page spends on type before it can paint.
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${SITE.name}, matériel informatique, réseau, sécurité et énergie au Cameroun`,
    template: `%s · ${SITE.name}`,
  },
  description:
    'Distributeur d’équipement informatique, réseau, vidéosurveillance et énergie à Douala et Yaoundé. ' +
    'Plus de 4 000 références en stock, garanties, avec retrait le jour même.',
}

/**
 * SOIXANTE SECONDES AU PLUS POUR TOUTE PAGE STATIQUE, QUOI QUE RENDENT SES LECTURES.
 *
 * Une page qui ne lit le backend qu'a travers cet habillage herite de ce que
 * l'habillage a eu le temps d'annoncer, et l'habillage se replie en silence.
 * Constate : un build sans backend a fige /devis, /hors-ligne et
 * /compte/commandes sans rayons et sans expiration. Ces trois pages sont
 * desormais rendues a chaque requete (`connection()`), parce qu'une
 * regeneration faite PENDANT une panne etait elle aussi gardee comme valide. Il
 * reste la page 404, et toute page statique a venir : borner ici la route
 * entiere fait qu'une page abimee se refait dans la minute qui suit le retour du
 * backend. Le chiffre est ecrit en toutes lettres parce que Next doit pouvoir le
 * lire sans executer le module ; c'est celui des lectures du catalogue
 * (`FRAICHEUR_S`).
 */
export const revalidate = 60

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* LES DEUX LECTURES TOLERANTES, ET PAS LES STRICTES. `error.tsx` n'enveloppe
     pas ce layout : une lecture qui leverait ici remplacerait le site entier
     par la page d'erreur globale, sans en-tete ni pied de page. Le compteur se
     tait et la liste des comptoirs est vide ; la page, elle, dit la panne. La
     memoire de `cache` fait que l'en-tete et le pied de page relisent les memes
     reponses sans second appel. */
  const [nav, pointsVente] = await Promise.all([lireNavigationOuNull(), lirePointsVenteOuVide()])

  return (
    <html lang="fr" className={`${poppins.variable} ${plexMono.variable}`}>
      {/* `data-habillage` dit si le menu des rayons a pu etre lu. Le travailleur
          de service le lit avant de garder /hors-ligne : une copie sans rayons,
          prise pendant une panne, resterait sur le telephone du client. */}
      <body data-habillage={nav ? 'complet' : 'incomplet'}>
        {/* Both providers wrap the document rather than a subtree: the masthead
            reads them, the drawer and the dialog render at the root, and the
            controls that fill them are inside the page. Nothing below is a
            client component because of this; the providers are, and they render
            their children through.

            The account wraps the basket because the account names whoever the
            basket belongs to, and because its dialog is the one surface allowed
            to cover the drawer. The reference count and the counters are read
            here rather than inside the dialog: `lib/catalogue-en-direct` is
            `server-only`, so a client component cannot ask it anything. */}
        {/* LA SESSION ENVELOPPE LA FICHE, ET PAS L INVERSE. La fiche du comptoir
            existe sans compte et doit continuer a fonctionner pour qui ne se
            connectera jamais; la session vient s ajouter. */}
        <SessionProvider>
        <AccountProvider pointsVente={pointsVente}>
          <CartProvider>
            <Header />
            {/* L'ESPACE AVANT LE PIED DE PAGE APPARTIENT A LA DERNIERE SECTION DE
            CHAQUE PAGE, PAS A `main`. Pose ici, il s'ajoutait sous tout, y
            compris sous une bande pleine largeur qui porte deja son fond et son
            rembourrage : la bande des comptoirs de l'accueil flottait sur du
            blanc au lieu de rejoindre le pied de page. Chaque page donne donc
            `pb-band` a sa derniere section, et une bande de couleur n'en prend
            pas. Une page ajoutee demain doit y penser. */}
        <main>{children}</main>
            <Footer />
            <CartDrawer />
          </CartProvider>
          <AuthDialog referenceCount={nav?.nombreProduits ?? null} />
        </AccountProvider>
        {/* L'ASSISTANT LIT LA SESSION, DONC IL VIT DEDANS. Un client connecté
            confie sa question à l'équipe sans laisser de coordonnées : son
            compte les porte déjà. Hors du fournisseur, `useSession()` lève. */}
        <Assistant whatsapp={shopWhatsapp(pointsVente)} />
        </SessionProvider>
        <Reveal />
        {/* `useSearchParams` opts its whole subtree into client rendering unless
            it is wrapped, and this component renders nothing, so the boundary
            costs nothing and keeps the rest of the document static. */}
        <Suspense fallback={null}>
          <NavigationProgress />
          <ScrollOnQuery />
        </Suspense>
      </body>
    </html>
  )
}
