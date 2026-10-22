import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { lireContenuBilingue } from '@/lib/catalogue-en-direct'
import { formatAmount } from '@/lib/format'
import { LocalizedText } from '@/lib/language'
import { lireCategoriesMarketplace, lireOffresMarketplace } from '@/lib/marketplace-data'
import type { PageContenu } from '@/lib/pages-contenu'
import { AProposBlocs, AProposParagraphes, AProposTextes, AProposTitre, AProposValeur } from './AProposTextes'

/** Ecrites en entier : Tailwind ne genere pas une classe composee a l'execution. */
const COLONNES: Record<number, string> = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }
const TITRE_SECTION = 'mb-7 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance sm:mb-10'

export const metadata: Metadata = {
  title: 'À propos de KatiMarket',
  description:
    'KatiMarket réunit des boutiques indépendantes et vérifiées du Cameroun : comparez leurs offres, ' +
    'commandez, payez et suivez votre livraison sur un seul site.',
}

/**
 * A PROPOS, DE LA PLATEFORME ET NON D'UN MAGASIN.
 *
 * LES TEXTES SE REDIGENT DEPUIS LE PANEL (contenu `a-propos`, FR et EN), avec
 * leur structure fixee ici : un redacteur change les mots, pas la mise en page.
 * Le texte du code reste le secours tant que l'API ne repond pas.
 *
 * LES CHIFFRES SONT LUS EN DIRECT, ET TOLERANTS. Produits en vente, marques et
 * categories viennent de la meme lecture que le catalogue du site. Si elle
 * echoue, les chiffres disparaissent ; le reste de la page tient. Pas de nombre
 * de boutiques : la seule liste publique s'arrete a vingt, et un chiffre faux
 * vaut moins qu'aucun.
 */
export default async function AboutPage() {
  await connection()
  const [catalogue, categories, textes] = await Promise.all([
    lireOffresMarketplace({ taille: 1 }),
    lireCategoriesMarketplace(),
    lireContenuBilingue<PageContenu>('a-propos'),
  ])
  const enVente = !catalogue.indisponible && catalogue.pagination.total > 0
  const parCategorie = new Map((catalogue.facettes?.categories ?? []).map((c) => [c.nom, c.nombre]))
  const chiffres = enVente
    ? [
        { valeur: formatAmount(catalogue.pagination.total), fr: 'Produits en vente', en: 'Products for sale' },
        { valeur: formatAmount(catalogue.facettes?.marques.length ?? 0), fr: 'Marques', en: 'Brands' },
        ...(categories.length ? [{ valeur: String(categories.length), fr: 'Grandes catégories', en: 'Main categories' }] : []),
      ]
    : []

  return (
    <AProposTextes fr={textes.fr?.contenu ?? null} en={textes.en?.contenu ?? null}>
      <PageHeader title={<AProposValeur champ="titre" />} lead={<AProposValeur champ="intro" />} />

      {chiffres.length ? (
        <section className="shell">
          <dl className={`grid border-y border-rule ${COLONNES[chiffres.length] ?? 'sm:grid-cols-3'}`}>
            {chiffres.map((fait, index) => (
              <div
                key={fait.fr}
                className={`py-7 sm:py-10 sm:pr-10 ${index > 0 ? 'border-t border-rule sm:border-t-0 sm:border-l sm:pl-10' : ''}`}
              >
                <dt className="t-num mb-1 text-title font-bold tracking-[-0.03em]">{fait.valeur}</dt>
                <dd className="text-small text-ink-2"><LocalizedText fr={fait.fr} en={fait.en} /></dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="shell mt-band">
        <AProposTitre cle="acheter" className={TITRE_SECTION} />
        <AProposBlocs cle="acheter" />
      </section>

      {categories.length ? (
        <section className="shell mt-band">
          <AProposTitre cle="categories" className={TITRE_SECTION} />
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
            <AProposTitre cle="vendeur" className="mb-3 text-title font-bold leading-[1.06] tracking-[-0.03em]" />
            <AProposParagraphes cle="vendeur" className="max-w-[54ch] text-body leading-[1.6] text-ink-2" />
            <Link href="/devenir-vendeur" className="mt-5 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">
              <LocalizedText fr="Devenir vendeur" en="Become a seller" />
            </Link>
          </div>
          <div>
            <AProposTitre cle="question" className="mb-3 text-title font-bold leading-[1.06] tracking-[-0.03em]" />
            <AProposParagraphes cle="question" className="max-w-[54ch] text-body leading-[1.6] text-ink-2" />
            <Link href="/contact" className="mt-5 inline-flex min-h-11 items-center text-small font-semibold text-secondary underline underline-offset-4">
              <LocalizedText fr="Nous contacter" en="Contact us" />
            </Link>
          </div>
        </div>
      </section>
    </AProposTextes>
  )
}
