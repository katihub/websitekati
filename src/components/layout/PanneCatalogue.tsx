'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { dialable } from '@/constants/site'
import { useAccount } from '@/lib/account'
import { shopPhone, shopWhatsapp, whatsappHref } from '@/lib/comptoirs'

/**
 * CE QUE VOIT LE CLIENT QUAND LE CATALOGUE NE REPOND PAS.
 *
 * Le catalogue est lu en direct depuis le backend, et il n'y a plus de fichier
 * compile sur lequel retomber. Une page qui s'afficherait quand meme, avec une
 * grille vide ou un prix d'hier, mentirait au client : « zero reference » sous
 * un rayon qui en compte sept cents, ou un montant que la caisse ne facturera
 * pas.
 *
 * DEUX PORTES Y MENENT, ET C'EST POURQUOI LE BLOC EST ICI ET NON DANS
 * `error.tsx`. Une page leve rarement : `@/lib/panne-catalogue` attrape la panne
 * et dessine ce bloc DANS LE HTML DU SERVEUR, avec l'en-tete, le pied de page
 * et un titre. `error.tsx` le dessine pour ce qui leve malgre tout. Il n'est
 * rendu que par le navigateur : constate, le serveur envoyait alors un document
 * vide, sans titre, et le message n'apparaissait qu'une seconde plus tard, une
 * fois le JavaScript charge. Sur un telephone en 3G, c'etait une page blanche.
 *
 * LE MESSAGE NE REPREND PAS `error.message`. En production Next le remplace par
 * un texte generique, et en developpement il contient l'adresse du backend :
 * ni l'un ni l'autre ne s'adresse a un client. Le detail part dans les journaux
 * du serveur.
 *
 * LE COMPTOIR EST PROPOSE A COTE DU BOUTON. Une panne du VPS peut durer plus
 * longtemps que la patience d'un acheteur ; le telephone et WhatsApp, eux,
 * repondent quand le site ne repond pas. Les numeros sont ceux des comptoirs que
 * le layout a lus, en lecture tolerante : quand le backend est tombe avant
 * qu'ils soient en cache, la liste est vide et la page ne propose que de
 * reessayer, plutot qu'un numero que personne n'a saisi dans le panel.
 *
 * « REESSAYER » RELIT LE BACKEND. Depuis `error.tsx`, c'est son `retry` ; depuis
 * une page rendue en panne, `router.refresh()` redemande la page au serveur.
 * Ni l'un ni l'autre ne se contente de redessiner ce qui a deja echoue.
 */
export function PanneCatalogue({ retry }: { retry?: () => void }) {
  const router = useRouter()
  const { pointsVente } = useAccount()
  const whatsapp = shopWhatsapp(pointsVente)
  const phone = shopPhone(pointsVente)

  return (
    /* Une `div` et non un `main` : le layout en pose deja un autour de chaque page. */
    <div className="mx-auto w-full max-w-[36rem] px-4 pt-16 pb-band text-center md:pt-24">
      {/* React place cette balise dans l'en-tete du document. Elle couvre la page
          dont les metadonnees ont ete lues avant la panne : /rayon/<slug> garde
          alors son titre, et un robot ne doit pas indexer ce message a sa place. */}
      <meta name="robots" content="noindex" />
      <p className="t-label text-ink-3">Catalogue indisponible</p>
      <h1 className="mt-2 text-h3 font-semibold tracking-[-0.01em] text-ink text-balance">
        Le catalogue ne répond pas
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-small text-ink-2">
        Les références, les prix et les stocks n’ont pas pu être chargés. C’est souvent passager :
        réessayez dans un instant. Le comptoir, lui, reste joignable.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => (retry ? retry() : router.refresh())}
          className="press inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-semibold text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary"
        >
          Réessayer
        </button>
        {whatsapp ? (
          <a
            href={whatsappHref(
              whatsapp,
              'Bonjour, le site nowtechcenter.com ne charge pas le catalogue. Pouvez-vous me renseigner ?',
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-11 items-center rounded-control border border-rule px-5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Écrire sur WhatsApp
          </a>
        ) : null}
      </div>
      <p className="mt-6 text-micro text-ink-3">
        {phone ? (
          <>
            Ou appelez le{' '}
            <a href={`tel:${dialable(phone)}`} className="t-num text-ink-2 underline underline-offset-4">
              {phone}
            </a>
            {' · '}
          </>
        ) : null}
        <Link href="/" className="underline underline-offset-4">
          Accueil
        </Link>
      </p>
    </div>
  )
}
