import { ProductCard } from './ProductCard'
import type { CarteProduit } from '@/types/catalogue'

/**
 * A grid of product cards, separated by space alone.
 *
 * The vertical gap is twice the horizontal one. Only the picture carries an
 * edge, so the cells themselves are still grouped by proximity alone, and with
 * equal gaps the eye groups in both directions at once and the grid reads as a
 * field of parts. Wide rows and tight columns say "these four belong together,
 * the next four are the next four".
 *
 * Column counts are a prop rather than a variant because the same grid serves
 * the homepage, a category page and a related-products strip, and those differ
 * only in how much room they have.
 *
 * The empty state is written for the one way this actually goes empty in
 * practice: a filter combination the stock does not cover. It says what to do
 * next rather than apologising, and it names the shop's own escape hatch,
 * because the counter genuinely holds stock the export does not.
 */
/**
 * CE QUE LA CARTE DOIT ANNONCER AU NAVIGATEUR, PAR NOMBRE DE COLONNES.
 *
 * La carte portait une seule valeur, celle d'une grille a quatre colonnes, et
 * la grille en dessine desormais jusqu'a cinq : le navigateur telechargeait
 * alors une image d'un quart de l'ecran pour une case qui en fait un
 * cinquieme. Les paliers suivent ceux de `COLUMNS`, faute de quoi la mesure
 * annoncee et la case dessinee se contredisent entre deux ruptures.
 */
const LARGEURS = {
  5: '(max-width: 767px) 45vw, (max-width: 1279px) 30vw, 18vw',
  4: '(max-width: 767px) 45vw, (max-width: 1279px) 30vw, 23vw',
  3: '(max-width: 767px) 45vw, 30vw',
  2: '45vw',
} as const

/** Les colonnes de chaque grille : a la base, a partir de `md`, a partir de `xl`. */
const PALIERS = {
  5: [2, 3, 5],
  4: [2, 3, 4],
  3: [2, 3, 3],
  2: [2, 2, 2],
} as const

/**
 * UNE SELECTION NE LAISSE PAS DE RANGEE ENTAMEE.
 *
 * Le backend rend douze produits par selection, et douze tombaient juste a
 * deux, trois et quatre colonnes. A cinq, cela fait cinq, cinq et deux : une
 * rangee a moitie vide qui ressemble a un oubli. Plutot que de demander au
 * backend un nombre divisible par tout (trente), chaque palier montre le plus
 * grand nombre de rangees pleines qu'il peut remplir, et cache le reste. Rien
 * n'est cache sur une liste paginee : cette option n'est que pour les vitrines
 * choisies, jamais pour un resultat.
 */
function affichageEnRangees(position: number, total: number, colonnes: keyof typeof PALIERS): string {
  const [base, moyen, large] = PALIERS[colonnes]
  // Moins de produits qu'une rangee : on montre tout plutot que rien.
  const cachee = (par: number) => total >= par && position >= Math.floor(total / par) * par
  const [b, m, l] = [cachee(base), cachee(moyen), cachee(large)]
  return [
    b ? 'hidden' : 'flex',
    m === b ? '' : m ? 'md:hidden' : 'md:flex',
    l === m ? '' : l ? 'xl:hidden' : 'xl:flex',
  ].join(' ').trim()
}

const COLUMNS = {
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  3: 'grid-cols-2 md:grid-cols-3',
  2: 'grid-cols-2',
} as const

/**
 * LA GRILLE NE LIT RIEN, ET C'EST DÉLIBÉRÉ. Toutes les listes passent par
 * elle, mais `Selections` est un composant client — les onglets de l'accueil
 * ont besoin d'un état — et un composant client ne peut ni rendre un composant
 * serveur asynchrone, ni tirer `server-only` dans son graphe sans casser la
 * compilation entière. Les cartes arrivent donc déjà lues, avec leur prix du
 * jour, depuis `@/lib/catalogue-en-direct`.
 */
export function ProductGrid({
  products,
  columns = 5,
  priorityCount = 0,
  rangeesCompletes = false,
}: {
  products: readonly CarteProduit[]
  columns?: keyof typeof COLUMNS
  /** How many images to load eagerly. Only ever the ones above the fold. */
  priorityCount?: number
  /** Cache la rangee entamee a chaque palier. Pour les vitrines choisies, jamais une liste. */
  rangeesCompletes?: boolean
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-well bg-space px-6 py-12 text-center text-body text-ink-2">
        Aucun produit ne correspond pour l’instant. Élargissez les filtres, ou appelez le comptoir :
        le stock atelier n’est pas toujours en ligne.
      </p>
    )
  }

  return (
    <div className={`grid gap-x-6 gap-y-12 ${COLUMNS[columns]}`}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          priority={index < priorityCount}
          sizes={LARGEURS[columns]}
          affichage={rangeesCompletes ? affichageEnRangees(index, products.length, columns) : undefined}
        />
      ))}
    </div>
  )
}
