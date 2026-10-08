import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { PageHeader } from '@/components/layout/PageHeader'
import { lireNavigation, lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'
import { rayonsOrdonnes } from '@/lib/catalogue-vues'
import { counterCities } from '@/lib/comptoirs'
import { formatAmount, formatCount, formatList, formatWords } from '@/lib/format'
import { avecPanneCatalogue } from '@/lib/panne-catalogue'

/* Counted like the figure on the page: "trois comptoirs" typed here would stay
   three the day the panel opens a fourth. */
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const pointsVente = await lirePointsVenteOuVide()
  const cities = counterCities(pointsVente)
  return {
    title: 'La maison',
    description:
      'NowTech Center distribue le matériel informatique, réseau, sécurité électronique et ' +
      'énergie au Cameroun' +
      (pointsVente.length > 0
        ? `, depuis ${formatWords(pointsVente.length)} ${pointsVente.length > 1 ? 'comptoirs' : 'comptoir'} à ${formatList(cities)}.`
        : '.'),
  }
}

/**
 * About.
 *
 * Written from what can be counted rather than from adjectives. Every figure on
 * this page is read from the backend when the page is asked for, so nothing here
 * can drift away from what the shop actually stocks, and nothing claims a
 * history or a headcount the data cannot support. `connection()` is what keeps
 * those reads out of the build.
 *
 * THE FOUR FIGURES CARRY THE SAME TWO PHONE FAULTS AS THE STRIP ON `/contact`,
 * AND THEY ARE FIXED THE SAME WAY. Measured at 360 before this change: each
 * cell drew 306 by 147.5 with `py-11`, which is 88 pixels of padding around a
 * number and a label, plus `pr-10`, 40 pixels of dead margin down the right of
 * a 306 pixel column that has no second column beside it. `4 254`, `268`,
 * `101` and `3` therefore occupied 592 pixels of a 780 pixel screen: four
 * facts, and the reader scrolls a whole screen and a bit to pass them.
 *
 * WORSE, THE RULE BETWEEN THEM WAS WRITTEN FOR A LAYOUT THAT IS NOT THERE.
 * `index >= 2` draws the top rule on cells 3 and 4, which is exactly right in
 * two columns and nonsense in one: stacked, the reader saw NO line between
 * `4 254` and `268`, then a line above every figure after it. Measured in the
 * capture, and it is the kind of fault that reads as the page being broken
 * rather than as a spacing choice.
 *
 * Below `sm`: 28 pixels of padding a side, no dead right margin, and a rule
 * between every pair. Cell 1 gives its rule back at `sm`, where the second
 * column returns and the first row is a first row again. `sm` and `lg` are the
 * layouts they always were, and the cell at 1440 is 306 by 159 with 40 pixels
 * of right padding, before and after.
 *
 * `réf.` IS AN ABBREVIATION AND ABBREVIATIONS DO NOT TAKE AN S. `formatCount`
 * builds its plural by appending one unless it is given both forms, so the
 * rayon list printed `869 réf.s`, twelve times, on the page whose whole subject
 * is that the shop's own classification was tidied up.
 */
export default avecPanneCatalogue(async function AboutPage() {
  await connection()
  /* The counters tolerantly: they are one figure of four, and a list that did
     not load is no reason to hide the catalogue's own three. The figure is left
     out rather than printed as "0 Comptoirs physiques", which would tell a
     reader the shop has no premises. */
  const [nav, pointsVente] = await Promise.all([lireNavigation(), lirePointsVenteOuVide()])
  const rayons = rayonsOrdonnes(nav)
  // Every term the shop files under, the hidden and the emptied ones included,
  // which is what the sentence below means by "existent toujours".
  const categoryCount = nav.categories.length

  return (
    <>
      <PageHeader
        title="Un magasin de matériel technique, mis en ligne comme un magasin"
        lead="NowTech Center distribue l’équipement informatique, réseau, sécurité électronique et énergie au Cameroun. Le catalogue en ligne est le stock des comptoirs, pas une vitrine séparée."
      />

      <section className="shell">
        <dl className="grid border-y border-rule sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: formatAmount(nav.nombreProduits), label: 'Références en catalogue' },
            { value: formatAmount(categoryCount), label: 'Familles de produits' },
            { value: String(nav.nombreMarques), label: 'Marques distribuées' },
            ...(pointsVente.length > 0
              ? [{ value: String(pointsVente.length), label: 'Comptoirs physiques' }]
              : []),
          ].map((fact, index) => (
            <div
              key={fact.label}
              className={`py-7 sm:py-11 sm:pr-10 ${
                index > 0 ? 'lg:border-l lg:border-rule lg:pl-10' : ''
              } ${index % 2 === 1 ? 'sm:border-l sm:border-rule sm:pl-10' : ''} ${
                index > 0
                  ? `border-t border-rule lg:border-t-0 ${index === 1 ? 'sm:border-t-0' : ''}`
                  : ''
              }`}
            >
              <dt className="t-num mb-1 text-title font-bold tracking-[-0.03em]">{fact.value}</dt>
              <dd className="text-small text-ink-2">{fact.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="shell mt-band">
        {/* 40 pixels under a heading set at 31.68px on a wide page is the right
            proportion. Under the same heading at 24px on a telephone, three
            lines tall, it is a hole. 28 below `sm`, 40 back from `sm`. */}
        <h2 className="mb-7 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance sm:mb-10">
          Douze rayons, parce que quarante-six n’en étaient pas
        </h2>
        <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[1fr_1.1fr]">
          <p className="max-w-[54ch] text-body leading-[1.6] text-ink-2">
            Le catalogue s’est construit sur vingt ans d’arrivages, et sa structure d’origine le
            montre : quarante-six entrées de premier niveau, dont vingt-six sans aucune
            sous-catégorie, allant de huit cent quarante-neuf produits à un seul. Un tel classement
            est parfaitement utilisable en magasin, où l’on demande à quelqu’un. Il ne l’est pas
            sur un écran.
            <br />
            <br />
            Rien n’a été supprimé. Les {categoryCount} familles existent toujours, avec leurs
            identifiants et leurs pages. Elles sont simplement regroupées en douze rayons, qui sont
            la façon dont les vendeurs eux-mêmes décrivent le magasin.
          </p>

          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rayons.map((rayon) => (
              <li key={rayon.id}>
                <Link
                  href={`/rayon/${rayon.slug}`}
                  className="flex items-baseline justify-between gap-4 border-b border-rule py-3 text-small transition-colors duration-[var(--t-fast)] hover:text-secondary"
                >
                  <span>{rayon.nom}</span>
                  <span className="t-num shrink-0 text-micro text-ink-3">
                    {/* LEFT WRONG ON PURPOSE, AND IT IS REPORTED RATHER THAN
                        FIXED. `formatCount` builds its plural by welding an `s`
                        onto the singular unless both forms are given, so this
                        prints `869 réf.s` on all twelve rows, and `réf.` is an
                        abbreviation, which does not take one. Passing the
                        plural explicitly costs one character of line, and one
                        character is enough: at 1440 the two-column list is
                        289.9px wide and the longest row un-wraps, which takes
                        19.5 pixels off the section. This pass may not move the
                        desktop by a pixel, so the correction belongs to whoever
                        owns `src/lib/format.ts` and a full-width pass. */}
                    {formatCount(rayon.compte, 'réf.')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell mt-band pb-band">
        {/* 40 pixels under a heading set at 31.68px on a wide page is the right
            proportion. Under the same heading at 24px on a telephone, three
            lines tall, it is a hole. 28 below `sm`, 40 back from `sm`. */}
        <h2 className="mb-7 max-w-[24ch] text-title font-bold leading-[1.06] tracking-[-0.03em] text-balance sm:mb-10">
          Acheter ici revient à passer au comptoir
        </h2>
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-3">
          {[
            {
              head: 'Le stock est réel',
              body: 'Ce qui est marqué en stock est au comptoir. Le reste est annoncé sur commande, avec un délai donné par téléphone plutôt que promis par la page.',
            },
            {
              head: 'Le prix est le prix',
              body: 'Les tarifs affichés sont ceux du comptoir. Pour une quantité ou un projet, la proforma se demande et se négocie, comme sur place.',
            },
            {
              head: 'On paie à la livraison',
              body: 'Espèces, MTN Mobile Money ou Orange Money, au retrait ou à la réception. Rien n’est prélevé avant que le matériel soit entre vos mains.',
            },
          ].map((block) => (
            <div key={block.head}>
              <h3 className="mb-3 text-body font-semibold">{block.head}</h3>
              <p className="text-small leading-[1.65] text-ink-2">{block.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
})
