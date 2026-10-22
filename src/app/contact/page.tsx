import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { OuvrirKati } from '@/components/assistant/OuvrirKati'
import { IconPhone, IconPin } from '@/components/brand/Icons'
import { PageHeader } from '@/components/layout/PageHeader'
import { dialable } from '@/constants/site'
import { lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'

export const metadata: Metadata = {
  title: 'Nous contacter',
  description:
    'Une question sur un produit, une commande, une livraison ou un paiement ? Kati vous répond tout de suite, ' +
    'et l’équipe KatiMarket reprend votre demande si besoin.',
}

/**
 * CONTACT, POUR UNE MARKETPLACE ET NON POUR UN MAGASIN.
 *
 * La page etait celle de la boutique NowTech : « les conseillers ont le stock
 * atelier sous les yeux », une proforma « le jour meme », un taux de TVA, et
 * des comptoirs comme seul moyen de joindre quelqu'un. Sur KatiMarket, le
 * client parle a la plateforme, qui suit sa commande aupres de la boutique
 * qui vend. Chaque canal ci-dessous existe vraiment sur le site :
 *
 * - Kati, l'assistante, ouverte a toute heure et qui passe la main a un
 *   conseiller (le bouton declenche le lanceur flottant, meme conversation) ;
 * - « Mes demandes », ou une demande est rattachee a la commande et a la
 *   boutique concernees ;
 * - les points d'accueil et leurs numeros, tels que le panel les publie. Ils
 *   sont lus a chaque visite et tolerants : sans point publie, la section
 *   disparait au lieu d'annoncer des numeros « qui n'ont pas pu etre charges ».
 *
 * Aucun courriel, aucun numero n'est ecrit en dur : les mentions legales de la
 * plateforme laissent encore ces coordonnees « à compléter ».
 */
export default async function ContactPage() {
  await connection()
  const pointsVente = (await lirePointsVenteOuVide()).filter((point) => point.phones.length > 0 || point.directions)
  const toutWhatsapp = pointsVente.length > 0 && pointsVente.every((point) => point.phones.every((line) => line.whatsapp))

  const lien = 'inline-flex min-h-11 items-center text-small font-semibold text-secondary underline underline-offset-4 sm:min-h-0'

  return (
    <>
      <PageHeader
        title="Nous contacter"
        lead="L’équipe KatiMarket vous aide avant, pendant et après votre commande : un produit, une livraison, un paiement ou une boutique."
      />

      <div className="shell grid gap-x-14 gap-y-10 md:grid-cols-3">
        <section>
          <h2 className="t-label mb-4 text-ink-3">Tout de suite</h2>
          <p className="mb-2 text-body font-semibold">Écrire à Kati</p>
          <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
            L’assistante KatiMarket répond à toute heure : trouver un produit, connaître la livraison, le paiement ou la
            garantie, dépanner un appareil. Si elle ne peut pas répondre, elle transmet votre demande à un conseiller.
          </p>
          <OuvrirKati className="mt-4 min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface">
            Ouvrir la discussion
          </OuvrirKati>
        </section>

        <section>
          <h2 className="t-label mb-4 text-ink-3">Une commande</h2>
          <p className="mb-2 text-body font-semibold">Suivre ou signaler un problème</p>
          <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
            Ouvrez une demande depuis votre espace : elle est rattachée à votre commande et à la boutique concernée,
            et vous suivez la réponse au même endroit. Un article manquant, abîmé ou différent ? Joignez des photos.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6">
            <Link href="/compte/assistance" className={lien}>Mes demandes</Link>
            <Link href="/compte/commandes" className={lien}>Mes commandes</Link>
          </div>
        </section>

        <section>
          <h2 className="t-label mb-4 text-ink-3">Vous êtes une boutique</h2>
          <p className="mb-2 text-body font-semibold">Vendre sur KatiMarket</p>
          <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
            Présentez votre candidature : KatiMarket vérifie votre boutique avant l’ouverture de vos ventes. Déjà
            vendeur ? Retrouvez vos commandes, vos offres et vos paiements dans votre espace.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6">
            <Link href="/devenir-vendeur" className={lien}>Devenir vendeur</Link>
            <Link href="/connexion-vendeur" className={lien}>Espace vendeur</Link>
          </div>
        </section>
      </div>

      {pointsVente.length > 0 ? (
        <section className="shell mt-band">
          <h2 className="t-label mb-6 text-ink-3">Par téléphone et WhatsApp</h2>
          <ul className="grid gap-x-14 gap-y-7 md:grid-cols-2">
            {pointsVente.map((point) => (
              <li key={point.key} className="flex gap-4">
                <IconPin className="mt-1 shrink-0 text-[1.25rem] text-ink-3" />
                <span>
                  <span className="block text-body font-semibold">{point.label}, {point.city}</span>
                  {point.directions ? <span className="mt-1 block text-small text-ink-2">{point.directions}</span> : null}
                  <ul className="mt-1">
                    {point.phones.map((line) => (
                      <li key={line.number}>
                        <a
                          href={`tel:${dialable(line.number)}`}
                          className="flex min-h-11 items-center gap-3 text-body transition-colors duration-[var(--t-fast)] hover:text-secondary sm:min-h-0"
                        >
                          <IconPhone className="shrink-0 text-[1.125rem] text-ink-3" />
                          <span className="t-num">{line.number}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  {point.mapUrl ? (
                    <a href={point.mapUrl} target="_blank" rel="noopener noreferrer" className={`mt-1 ${lien}`}>
                      Itinéraire
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {toutWhatsapp ? <p className="mt-6 text-small text-ink-2">Tous ces numéros reçoivent WhatsApp.</p> : null}
        </section>
      ) : null}

      <section className="shell mt-band pb-band">
        <h2 className="t-label mb-6 text-ink-3">Avant de nous écrire</h2>
        <ul className="grid border-y border-rule sm:grid-cols-3">
          {[
            { href: '/livraison-retours', titre: 'Livraison et retours', detail: 'Modes de livraison, suivi, problème à la réception, retour.' },
            { href: '/securite', titre: 'Sécurité des achats', detail: 'Payer en toute sécurité et repérer une demande suspecte.' },
            { href: '/conditions-generales-vente', titre: 'Conditions de vente', detail: 'Prix, paiement, livraison, réclamation.' },
          ].map((page, index) => (
            <li
              key={page.href}
              className={`py-6 sm:pr-8 ${index > 0 ? 'border-t border-rule sm:border-t-0 sm:border-l sm:pl-8' : ''}`}
            >
              <Link href={page.href} className="group block">
                <span className="block text-body font-semibold transition-colors duration-[var(--t-fast)] group-hover:text-secondary">
                  {page.titre}
                </span>
                <span className="mt-1 block text-small text-ink-2">{page.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
