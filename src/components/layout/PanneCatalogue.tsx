'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

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
 * LE MESSAGE DISTINGUE CE QUE LE NAVIGATEUR SAIT VRAIMENT. `navigator.onLine`
 * sait constater l'absence de reseau, mais ne prouve pas que l'API repond :
 * en ligne, le texte garde donc les deux explications possibles au lieu
 * d'accuser le serveur ou le telephone sans preuve.
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
  const [connexion, setConnexion] = useState<'inconnue' | 'en_ligne' | 'hors_ligne'>('inconnue')
  const [verification, demarrerVerification] = useTransition()
  const { pointsVente } = useAccount()
  const whatsapp = shopWhatsapp(pointsVente)
  const phone = shopPhone(pointsVente)

  useEffect(() => {
    const actualiser = () => setConnexion(navigator.onLine ? 'en_ligne' : 'hors_ligne')
    actualiser()
    window.addEventListener('online', actualiser)
    window.addEventListener('offline', actualiser)
    return () => {
      window.removeEventListener('online', actualiser)
      window.removeEventListener('offline', actualiser)
    }
  }, [])

  const reessayer = () => {
    if (!navigator.onLine) {
      setConnexion('hors_ligne')
      return
    }
    setConnexion('en_ligne')
    demarrerVerification(() => (retry ? retry() : router.refresh()))
  }

  return (
    /* Une `div` et non un `main` : le layout en pose deja un autour de chaque page. */
    <div className="mx-auto w-full max-w-[36rem] px-4 pt-16 pb-band text-center md:pt-24">
      {/* React place cette balise dans l'en-tete du document. Elle couvre la page
          dont les metadonnees ont ete lues avant la panne : /rayon/<slug> garde
          alors son titre, et un robot ne doit pas indexer ce message a sa place. */}
      <meta name="robots" content="noindex" />
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-space text-secondary" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4.5 9.5a11 11 0 0 1 15 0M7.5 13a6.5 6.5 0 0 1 9 0M10.5 16.5a2.3 2.3 0 0 1 3 0" />
          <circle cx="12" cy="19" r="1" className="fill-current stroke-none" />
        </svg>
      </span>
      <p className="t-label mt-5 text-ink-3">Connexion au catalogue</p>
      <h1 className="mt-2 text-h3 font-semibold tracking-[-0.01em] text-ink text-balance">
        Impossible de charger le catalogue
      </h1>
      <p
        className="mx-auto mt-3 max-w-[46ch] text-small leading-[1.6] text-ink-2"
        role={connexion === 'hors_ligne' ? 'alert' : undefined}
      >
        {connexion === 'hors_ligne'
          ? 'Vous n’êtes pas connecté à Internet. Activez vos données mobiles ou le Wi-Fi, puis réessayez.'
          : 'Vérifiez que vos données mobiles ou votre Wi-Fi sont activés, puis réessayez. Si vous êtes déjà connecté, le service est peut-être momentanément indisponible.'}
      </p>
      {verification ? <p className="mt-3 text-micro text-ink-3" role="status">Vérification de la connexion…</p> : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reessayer}
          disabled={verification}
          className="press inline-flex min-h-12 items-center rounded-control bg-secondary px-6 text-small font-semibold text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary disabled:cursor-wait disabled:opacity-70"
        >
          {verification ? 'Vérification…' : 'Réessayer maintenant'}
        </button>
        {whatsapp ? (
          <a
            href={whatsappHref(
              whatsapp,
              'Bonjour, le catalogue de katimarket.com ne se charge pas. Pouvez-vous m’aider ?',
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-12 items-center rounded-control border border-rule px-5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Contacter l’assistance
          </a>
        ) : phone ? (
          <a
            href={`tel:${dialable(phone)}`}
            className="press inline-flex min-h-12 items-center rounded-control border border-rule px-5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Contacter l’assistance
          </a>
        ) : (
          <Link
            href="/contact"
            className="press inline-flex min-h-12 items-center rounded-control border border-rule px-5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Contacter l’assistance
          </Link>
        )}
      </div>
      <p className="mt-6 text-micro text-ink-3">
        {phone && whatsapp ? (
          <>
            Appelez le{' '}
            <a href={`tel:${dialable(phone)}`} className="t-num text-ink-2 underline underline-offset-4">
              {phone}
            </a>
            {' · '}
          </>
        ) : null}
        <Link href="/" className="underline underline-offset-4">
          Retour à l’accueil
        </Link>
      </p>
    </div>
  )
}
