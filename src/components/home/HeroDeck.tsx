'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import { DEPARTMENT_ICON, IconArrowRight, IconChevronRight } from '@/components/brand/Icons'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductMedia } from '@/components/product/ProductMedia'
import { Action } from '@/components/ui/Action'
import type { CarteProduit, HeroPanel } from '@/types/catalogue'

/**
 * The opening: a rail of twelve departments, and the deck they drive.
 *
 * WHY THE RAIL DRIVES THE DECK. The rail used to open a floating panel over the
 * card, which meant a visitor pointing at `Stockage` got a list of families
 * covering the thing they were trying to look at, in a different visual register
 * from everything around it. Two surfaces answering one gesture is one surface
 * too many. There is one card now and the rail chooses which department is in
 * it: twelve doors, twelve rooms, and pointing at a door shows you the room.
 *
 * HOW A CARD BECOMES THE NEXT ONE. It is redrawn in place: the card wipes in
 * from the leading edge, its heading rises from behind its own baseline, its
 * sentence resolves out of blur and its picture is uncovered by a shutter. Four
 * gestures, the same four the rest of the page arrives with, spaced 80ms apart.
 *
 * A horizontal track was tried and taken back out. With twelve slides the whole
 * strip travels, so pointing at `Bureautique` from `Sécurité` sweeps nine cards
 * past the reader at speed and throws the one they were reading off the screen.
 * The strip also has to walk back at the ends, which makes the direction of the
 * movement mean something it does not mean. Redrawing in place is the quieter
 * description, and the more accurate one: the department changed, the page did
 * not move.
 *
 * WHAT IT COSTS. One card in the DOM at a time, keyed on its department, so
 * React remounts it and the keyframes in `globals.css` run as the switch. Only
 * the department on screen is fetched. The aspect ratio is reserved, so an image
 * that has not decoded leaves white space on a white surface rather than a jump.
 */
/**
 * LA VISITE AUTOMATIQUE : UN RAYON TOUTES LES SIX SECONDES ET DEMIE.
 *
 * Le proprietaire veut que l'ouverture passe d'elle-meme d'un rayon a l'autre,
 * et que le lecteur reprenne la main par un clic. Elle ne tourne que la ou on
 * peut la suivre et l'arreter : un pointeur fin, et pas de preference pour le
 * mouvement reduit. Sur un telephone la carte n'existe pas, et un lecteur qui
 * a demande moins de mouvement ne voit pas la page changer sous ses yeux.
 */
const ADVANCE_MS = 6500
const REDUCED = '(prefers-reduced-motion: reduce)'
const POINTER = '(hover: hover) and (pointer: fine)'

function useTourAllowed(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const queries = [window.matchMedia(REDUCED), window.matchMedia(POINTER)]
    for (const query of queries) query.addEventListener('change', onChange)
    return () => {
      for (const query of queries) query.removeEventListener('change', onChange)
    }
  }, [])

  return useSyncExternalStore(
    subscribe,
    () => !window.matchMedia(REDUCED).matches && window.matchMedia(POINTER).matches,
    () => false,
  )
}

export function HeroDeck({
  panels,
  produitsInitiaux,
}: {
  panels: readonly HeroPanel[]
  /** Les premiers produits du rayon d'ouverture, lus par la page pour le premier rendu. */
  produitsInitiaux: readonly CarteProduit[]
}) {
  const [index, setIndex] = useState(0)
  /** La souris sur la carte, ou le clavier dedans : la visite attend. */
  const [paused, setPaused] = useState(false)
  const tours = useTourAllowed() && panels.length > 1
  /**
   * CE QUI A DEJA ETE LU NE SE RELIT PAS. Le rail se parcourt a la souris, et
   * un aller-retour entre deux rayons rappellerait la meme liste. La memoire
   * vit dans un etat plutot que dans une ref, parce que son contenu s'affiche.
   */
  const [parRayon, setParRayon] = useState<Record<string, readonly CarteProduit[]>>(() =>
    panels[0] ? { [panels[0].slug]: produitsInitiaux } : {},
  )
  const [enAttente, setEnAttente] = useState(false)
  const active = panels[index] ?? panels[0]

  /**
   * LA LECTURE PART DU GESTE, PAS DU RENDU. Le depot interdit de poser un etat
   * depuis un effet, et c'est la bonne regle ici : ces produits sont demandes
   * parce que quelqu'un a clique sur un rayon. Un evenement, jamais un rendu.
   *
   * LA MEMOIRE DES RAYONS DEJA DEMANDES VIT DANS UNE REF, pas dans l'etat : elle
   * ne s'affiche pas, elle empeche seulement de redemander deux fois la meme
   * liste.
   */
  const demandes = useRef<Set<string>>(new Set(panels[0] ? [panels[0].slug] : []))
  const lire = useCallback((rayon: string) => {
    if (demandes.current.has(rayon)) return
    demandes.current.add(rayon)
    setEnAttente(true)
    fetch(`/api/rayon-produits?rayon=${encodeURIComponent(rayon)}`)
      .then((reponse) => (reponse.ok ? reponse.json() : null))
      .then((donnees: { produits?: readonly CarteProduit[] } | null) => {
        if (donnees?.produits) setParRayon((lues) => ({ ...lues, [rayon]: donnees.produits! }))
        // Une lecture qui echoue se retente au prochain passage plutot que de
        // laisser ce rayon vide pour toujours.
        else demandes.current.delete(rayon)
      })
      .catch(() => demandes.current.delete(rayon))
      .finally(() => setEnAttente(false))
  }, [])

  /**
   * UN MINUTEUR PAR RAYON, PAS UN INTERVALLE POUR TOUTE LA VISITE. Un clic
   * change `index`, ce qui relance le minuteur : le rayon choisi a la main a
   * ses six secondes et demie entieres, puis la visite repart de lui. Les
   * produits du rayon suivant sont demandes au moment ou il s'affiche.
   */
  useEffect(() => {
    if (!tours || paused) return
    const minuteur = window.setTimeout(() => {
      const suivant = (index + 1) % panels.length
      setIndex(suivant)
      const rayon = panels[suivant]?.slug
      if (rayon) lire(rayon)
    }, ADVANCE_MS)
    return () => window.clearTimeout(minuteur)
  }, [tours, paused, index, panels, lire])

  if (panels.length === 0) return null

  const produits = parRayon[active.slug] ?? produitsInitiaux

  /**
   * LA MAIN SE REPREND AU CLIC, JAMAIS AU SURVOL.
   *
   * La carte changeait au simple passage du curseur sur le rail, et le lecteur
   * voyait le rayon lui echapper en allant cliquer ailleurs. Le proprietaire a
   * tranche : la visite automatique continue, mais seul un clic choisit un
   * rayon, et la liste devient ce qu'elle etait deja pour un doigt, une rangee
   * d'onglets.
   */
  const take = (position: number) => {
    setIndex(position)
    const rayon = panels[position]?.slug
    if (rayon) lire(rayon)
  }

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[17.5rem_1fr]">
      {/* ON A PHONE THE RAIL COMES FIRST, AND THAT IS THE ANSWER TO A MEASURED
          FAULT. The tour only runs where there is a fine pointer, so on a
          touchscreen the card never changes and the rail is the only way into
          the other eleven departments. It was sitting 656 pixels below the top
          of the card, which is a full screen of scrolling past a panel the
          reader cannot steer. Above the card it is the shop's directory,
          reached in one flick under the artwork. The order is restored at sm,
          so every screen from 640 up is untouched. */}
      <nav
        role="tablist"
        aria-label="Rayons"
        /* A SHELF ON A PHONE, THE SAME ONE THE CATALOGUE USES FOR THE
            SAME TWELVE ROOMS. Stacked two-by-two the rail was 336 pixels of
            links before the card it drives, which is half a screen spent on a
            table of contents. Rolled sideways it is one row: the reader sees
            where the shop begins, and the ones off the right edge announce
            themselves by being cut rather than by being scrolled to.
            The negative gutter margins let it run edge to edge, which is what
            tells a thumb it moves. From sm it is the grid it always was. */
        className="no-scrollbar order-1 mx-[calc(var(--gutter)*-1)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-3 overflow-x-auto overscroll-x-contain px-[var(--gutter)] pb-1 sm:order-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:order-1 lg:grid-cols-1 lg:gap-x-0"
      >
        {panels.map((panel, position) => {
          const Icon = DEPARTMENT_ICON[panel.id]
          const isActive = position === index
          return (
            <button
              key={panel.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => take(position)}
              onKeyDown={(event) => {
                const pas = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
                if (pas === 0) return
                event.preventDefault()
                take((position + pas + panels.length) % panels.length)
              }}
              // The active row states itself with its own hairline. A separate
              // marker bar would have to live in the page gutter to clear the
              // icon, and the rule is already there, already the right weight,
              // and already the language the rest of the page answers in.
              // A TILE ON A PHONE, A ROW FROM `sm`, AND THE TILE IS THE
              // CATALOGUE'S OWN. That page shows the same twelve rooms as
              // photographs on a plate, and a reader who meets them as icons on
              // the home page and as pictures on the catalogue meets two
              // different shops. Below `sm` this is the catalogue's tile, to the
              // class: plate, sheen, ProductMedia, name underneath. From `sm`
              // the rail is the row it has always been, because from `sm` it is
              // beside a card it drives rather than being the content itself.
              className={`group/row group flex w-[9.75rem] shrink-0 snap-start flex-col text-left text-small transition-colors duration-[var(--t-fast)] sm:h-14 sm:w-auto sm:shrink sm:flex-row sm:items-center sm:gap-3 sm:border-b sm:py-0 ${
                isActive
                  ? 'text-secondary sm:border-secondary'
                  : 'text-ink-2 hover:text-secondary sm:border-rule'
              }`}
            >
              <span className="plate mb-2.5 block sm:hidden">
                <span className="sheen relative block overflow-hidden rounded-well">
                  <ProductMedia
                    src={panel.image}
                    // The department is named in type immediately under the
                    // picture; naming the hero product here would make a screen
                    // reader announce a switch model before the word "Réseaux".
                    alt=""
                    sizes="156px"
                    priority={position < 3}
                  />
                </span>
              </span>

              <Icon
                className={`hidden shrink-0 text-[1.25rem] transition-transform duration-[var(--t-base)] ease-brand sm:block ${
                  isActive ? 'scale-110' : 'group-hover/row:scale-110'
                }`}
              />
              <span className="clamp-1 flex-1">{panel.shortName}</span>
              <IconChevronRight
                className={`hidden shrink-0 text-[0.875rem] transition-transform duration-[var(--t-base)] ease-brand lg:block ${
                  isActive ? 'translate-x-1' : 'text-ink-3 group-hover/row:translate-x-1'
                }`}
              />
            </button>
          )
        })}
      </nav>

      {/* The deck sets the height and the rail divides it. The other way round,
          twelve 60px rows made a 720px column beside a 510px card and the
          opening ended on 200px of nothing. */}
      {/* `min-w-0` is load-bearing, not tidiness. The track is twelve slides
          wide, and a grid item's automatic minimum size is its content's
          min-content: without this the `1fr` column sized itself to the whole
          strip, 3 011px instead of 944, and the square picture inside it grew to
          match. The clip below hides the overflow; this is what stops it
          claiming the space first. */}
      <div
        /* THE CARD DOES NOT EXIST ON A PHONE, AND THAT IS THE ARCHITECTURE,
           NOT A CUT. The deck is a rail that drives a card: point at a door,
           see the room. A phone has no pointer, so the tour is already disabled
           there and the card can only ever show one department, chosen for the
           reader, under a list that already offers all twelve. Measured at 390
           it cost 660 pixels, more than two thirds of a screen, to advertise one
           of twelve rooms whose door was 300 pixels above it. The rail alone is
           the honest phone version: twelve doors, no anteroom. From `sm` the
           card returns and the desktop is untouched. */
        className="order-2 hidden min-w-0 sm:order-1 sm:block lg:order-2"
        // On ne tourne pas la page sous les yeux de quelqu'un qui lit : la
        // souris sur la carte, ou le clavier dedans, arrete la visite. Un doigt
        // ne peut pas lever ce frein, d'ou le seul pointeur souris.
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setPaused(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setPaused(false)
        }}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div>
          {/* LA CARTE MONTRE LE RAYON, PLUTOT QUE D'EN PARLER.
              Elle tenait un titre, un paragraphe et une photographie de mise en
              scene : trois facons de dire « voici les ordinateurs » sans en
              montrer un seul, sur l'ecran ou le visiteur decide s'il reste. Le
              proprietaire a tranche : on garde la porte du rayon et ses
              sous-categories, et le reste de la place va aux premiers produits,
              dans la carte que tout le site utilise deja.

              LE TITRE ET LE TEXTE PARTENT, PAS LEUR ROLE. Le rayon est nomme par
              la ligne active du rail a gauche et par le libelle du bouton ; le
              nombre de references, lui, se lit sur les cartes elles-memes. */}
          <article key={active.id} className="switch-in flex h-full flex-col">
            {/* LES SOUS-CATEGORIES EN TETE, LA PORTE DU RAYON A LA FIN.
                Le bouton ouvrait la carte : il proposait de quitter la page
                avant d'avoir montre un seul produit. Il ferme desormais le
                bloc, la ou un lecteur qui a parcouru les huit cartes se demande
                ce que le rayon contient d'autre. Les sous-categories, elles,
                restent en tete : elles disent tout de suite la profondeur. */}
            {/* LA COLONNE DE DROITE COMMENCE A LA HAUTEUR DE LA PREMIERE
                RANGEE DU RAIL. Les sous-categories se posaient tout en haut
                tandis que le premier onglet, lui, a 56 pixels a remplir : la
                carte paraissait demarrer plus haut que le menu qui la pilote.
                La rangee prend donc la meme hauteur qu'un onglet et centre son
                texte dedans, ce qui aligne les deux premieres lignes. */}
            <ul className="e-item flex flex-wrap gap-x-6 gap-y-1 text-small text-ink-3 sm:min-h-14 sm:items-center">
              {active.families.map((family, rank) => (
                <li key={family.slug} className={rank > 2 ? 'hidden lg:list-item' : undefined}>
                  <Link
                    href={`/categorie/${family.slug}`}
                    className="draw-under inline-block py-2 underline decoration-1 underline-offset-4 transition-colors duration-[var(--t-fast)] hover:text-secondary sm:py-0 sm:no-underline"
                  >
                    {family.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* LA GRILLE GARDE SA PLACE PENDANT QU'ELLE CHANGE. Les produits du
                rayon pointe arrivent par le reseau ; vider la grille en les
                attendant ferait sauter toute la page sous le curseur. Les
                anciennes cartes restent, legerement effacees, jusqu'a ce que les
                nouvelles soient la. */}
            <div
              className={`mt-6 transition-opacity duration-[var(--t-base)] ${
                enAttente ? 'opacity-60' : 'opacity-100'
              }`}
              aria-busy={enAttente || undefined}
            >
              <ProductGrid products={produits} columns={4} priorityCount={4} rangeesCompletes />
            </div>

            <div className="mt-7">
              <Action href={active.href} className="group/cta e-item">
                {active.cta}
                <IconArrowRight className="text-[1.125rem] transition-transform duration-[var(--t-base)] ease-brand group-hover/action:translate-x-1" />
              </Action>
            </div>
          </article>
        </div>

      </div>
    </div>
  )
}
