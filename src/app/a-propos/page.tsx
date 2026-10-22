import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { formatAmount } from '@/lib/format'
import { lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'

/** Ecrites en entier : Tailwind ne genere pas une classe composee a l'execution. */
const COLONNES: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }

export const metadata: Metadata = {
  title: 'À propos de KatiMarket',
  description:
    'KatiMarket réunit des boutiques indépendantes et vérifiées du Cameroun : comparez leurs offres, ' +
    'commandez, payez et suivez votre livraison sur un seul site.',
}

/**
 * A PROPOS, DE LA PLATEFORME ET NON D'UN MAGASIN.
 *
 * La page racontait la boutique NowTech : « un magasin mis en ligne », ses
 * comptoirs, « douze rayons » tires de son ancien catalogue. Elle lisait ses
 * chiffres dans ce catalogue historique, absent d'une base marketplace, et
 * basculait alors sur l'ecran de panne. Elle dit maintenant ce qu'est
 * KatiMarket, avec les mots des pages qui engagent la plateforme (conditions
 * de vente, livraison et retours, securite des achats).
 *
 * LES CHIFFRES SONT LUS EN DIRECT, ET TOLERANTS. Produits en vente, marques et
 * categories viennent de la meme lecture que le catalogue du site. Si elle
 * echoue, les chiffres disparaissent ; le reste de la page tient. Pas de nombre
 * de boutiques : la seule liste publique s'arrete a vingt, et un chiffre faux
 * vaut moins qu'aucun.
 */
export default async function AboutPage() {
  await connection()
  const [catalogue, categories] = await Promise.all([
    lireOffresMarketplace({ taille: 1 }),
    lireCategoriesMarketplace(),
  ])
  const enVente = !catalogue.indisponible && catalogue.pagination.total > 0
  const parCategorie = new Map((catalogue.facettes?.categories ?? []).map((c) => [c.nom, c.nombre]))
  const chiffres = enVente
    ? [
        { valeur: formatAmount(catalogue.pagination.total), libelle: 'Produits en vente' },
        { valeur: formatAmount(catalogue.facettes?.marques.length ?? 0), libelle: 'Marques' },
        ...(categories.length ? [{ valeur: String(categories.length), libelle: 'Grandes catégories' }] : []),
      ]
    : []

  return (
    <>
      <PageHeader
        title="Les boutiques du Cameroun, au même endroit"
        lead="KatiMarket est une marketplace camerounaise : des boutiques indépendantes y présentent leurs produits, et vous comparez, commandez, payez et suivez votre livraison sur un seul site."
      />

      {chiffres.length ? (
        <section className="shell">
          <dl className={`grid border-y border-rule ${COLONNES[chiffres.length] ?? 'sm:grid-cols-3'}`}>
            {chiffres.map((fait, index) => (
              <div
                key={fait.libelle}
                className={`py-7 sm:py-10 sm:pr-10 ${index > 0 ? 'border-t border-rule sm:border-t-0 sm:border-l sm:pl-10' : ''}`}
              >
                <dt className="t-num mb-1 text-title font-bold tracking-[-0.03em]">{fait.valeur}</dt>
                <dd className="text-small text-ink-2">{fait.libelle}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="shell mt-band">
        <h2 className="mb-7 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance sm:mb-10">
          Acheter sur KatiMarket
        </h2>
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              titre: 'Des boutiques vérifiées',
              texte: 'Une boutique ne vend qu’après vérification de son dossier par KatiMarket. Elle s’engage sur l’exactitude de ses offres, la conformité de ses produits et le suivi après-vente.',
            },
            {
              titre: 'Chaque offre dit qui vend',
              texte: 'La fiche produit et votre commande indiquent toujours la boutique, son prix, sa garantie et ses conditions de livraison. Un même produit peut être proposé par plusieurs boutiques.',
            },
            {
              titre: 'Un paiement encadré',
              texte: 'Vous réglez un acompte par Orange Money ou MTN Mobile Money, puis le solde à la livraison. Votre code secret reste dans l’application de votre opérateur, jamais dans un message.',
            },
            {
              titre: 'La livraison qui vous convient',
              texte: 'Kati Express, livraison par la boutique, retrait gratuit à la boutique ou expédition en agence : les options possibles s’affichent pendant la commande, avec leurs frais.',
            },
          ].map((bloc) => (
            <div key={bloc.titre}>
              <h3 className="mb-3 text-body font-semibold">{bloc.titre}</h3>
              <p className="text-small leading-[1.65] text-ink-2">{bloc.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {categories.length ? (
        <section className="shell mt-band">
          <h2 className="mb-7 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance sm:mb-10">
            Ce que vous y trouvez
          </h2>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((categorie) => (
              <li key={categorie.id}>
                <Link
                  href={`/categories/${encodeURIComponent(categorie.slug)}`}
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-3 text-small transition-colors duration-[var(--t-fast)] hover:text-secondary"
                >
                  <span>{categorie.nom}</span>
                  {parCategorie.get(categorie.nom) ? (
                    <span className="t-num shrink-0 text-micro text-ink-3">
                      {formatAmount(parCategorie.get(categorie.nom)!)} produit{parCategorie.get(categorie.nom)! > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="shell mt-band pb-band">
        <div className="grid gap-x-14 gap-y-8 border-t border-rule pt-10 md:grid-cols-2">
          <div>
            <h2 className="mb-3 text-title font-bold leading-[1.06] tracking-[-0.03em]">Vous avez une boutique ?</h2>
            <p className="max-w-[54ch] text-body leading-[1.6] text-ink-2">
              Rejoignez KatiMarket pour présenter vos produits à des acheteurs de tout le Cameroun. Vous gérez vos
              offres, vos stocks et vos commandes depuis votre espace vendeur.
            </p>
            <Link href="/devenir-vendeur" className="mt-5 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">
              Devenir vendeur
            </Link>
          </div>
          <div>
            <h2 className="mb-3 text-title font-bold leading-[1.06] tracking-[-0.03em]">Une question ?</h2>
            <p className="max-w-[54ch] text-body leading-[1.6] text-ink-2">
              Kati, l’assistante KatiMarket, répond à toute heure, et l’équipe reprend votre demande si besoin.
            </p>
            <Link href="/contact" className="mt-5 inline-flex min-h-11 items-center text-small font-semibold text-secondary underline underline-offset-4">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
