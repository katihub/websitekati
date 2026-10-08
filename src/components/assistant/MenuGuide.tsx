'use client'

import type { EntreeMenu, NoeudMenu } from '@/lib/assistant'

/**
 * LES PORTES DE L'ASSISTANT, EN BOUTONS.
 *
 * DES BOUTONS EMPILÉS, PAS DES PASTILLES QUI DÉFILENT — et la distinction
 * est le fond du sujet. Les pastilles de suggestion, sous une réponse, sont
 * des PHRASES que le visiteur aurait pu taper : on en propose trois, et on
 * accepte qu'elles se perdent. Le menu offre des PORTES : neuf entrées sous
 * « Un appareil ne fonctionne pas », dont aucune ne doit être cachée hors de
 * l'écran d'un téléphone.
 *
 * « RETOUR » ET « ACCUEIL » NE SONT PAS DES ENTRÉES DU MENU. Le document du
 * client les écrit dans chaque tableau, mais ce sont des affordances
 * d'interface, pas du contenu : ici elles se déduisent de `retour` et de la
 * racine. Les inscrire dans les données obligerait à les traduire, les styler
 * et les tester comme des boutons ordinaires.
 *
 * RIEN ICI NE TOUCHE LE RÉSEAU sauf les actions terminales. Ouvrir un
 * sous-menu, revenir, rentrer : le parent s'en charge sans requête. C'est
 * imposé par le plafond du backend — une question toutes les deux secondes —
 * et c'est aussi ce qui rend la navigation instantanée.
 */
export function MenuGuide({
  noeud,
  racine,
  occupe,
  onEntree,
  onNaviguer,
}: {
  noeud: NoeudMenu
  racine: string
  occupe: boolean
  onEntree: (entree: EntreeMenu, noeud: NoeudMenu) => void
  onNaviguer: (id: string) => void
}) {
  return (
    <div className="mt-1 flex flex-col gap-1.5" data-menu={noeud.id}>
      <p className="t-label px-0.5 text-ink-3">{noeud.titre}</p>

      {noeud.entrees.map((entree) => (
        <button
          key={`${entree.action}-${entree.cible ?? entree.libelle}`}
          type="button"
          disabled={occupe}
          onClick={() => onEntree(entree, noeud)}
          className="press flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-rule bg-paper px-3.5 text-left text-small text-ink transition-colors duration-[var(--t-fast)] hover:border-secondary hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="min-w-0">{entree.libelle}</span>
          {entree.action === 'menu' ? (
            <span aria-hidden className="shrink-0 text-ink-3">
              ›
            </span>
          ) : null}
        </button>
      ))}

      {noeud.retour || noeud.id !== racine ? (
        <div className="mt-1 flex gap-2 border-t border-rule pt-2">
          {noeud.retour ? (
            <button
              type="button"
              disabled={occupe}
              onClick={() => onNaviguer(noeud.retour!)}
              className="press min-h-9 rounded-control px-2.5 text-micro font-semibold text-ink-2 transition-colors hover:text-secondary disabled:opacity-50"
            >
              ← Retour
            </button>
          ) : null}
          {noeud.id !== racine ? (
            <button
              type="button"
              disabled={occupe}
              onClick={() => onNaviguer(racine)}
              className="press min-h-9 rounded-control px-2.5 text-micro font-semibold text-ink-2 transition-colors hover:text-secondary disabled:opacity-50"
            >
              Accueil
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
