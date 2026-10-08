import type { Conditions, FicheConditions } from '@/lib/catalogue-en-direct'

/**
 * LES CONDITIONS DE LA MAISON, AU MOMENT DE COMMANDER.
 *
 * Livraison, garantie, paiement : les trois questions qu'un client se pose
 * avant de valider, et que la maison a déjà écrites dans sa base de
 * connaissances. Ce bloc les montre sans les recopier : ce qui s'affiche ici
 * est ce que la direction a écrit dans le panel, et une correction faite là-bas
 * apparaît ici sans redéploiement.
 *
 * CHAQUE FICHE S'OUVRE SUR SON DÉBUT. Le résumé est tiré du texte lui-même —
 * ses premières lignes — plutôt que d'une phrase écrite dans le code, qui
 * contredirait la fiche le jour où la maison changerait sa garantie. Le texte
 * entier se déplie au clic.
 *
 * ABSENT QUAND IL N'Y A RIEN. Une fiche illisible vaut `null` (voir
 * `lireConditions`) ; sans aucune fiche, le bloc ne s'affiche pas plutôt que de
 * titrer un vide.
 */

/** Assez pour une phrase complète sur une ligne de téléphone, pas plus. */
const LONGUEUR_RESUME = 180

function resume(corps: string): { debut: string; coupe: boolean } {
  const propre = corps.replace(/\s+/g, ' ').trim()
  if (propre.length <= LONGUEUR_RESUME) return { debut: propre, coupe: false }
  /* On coupe sur un espace, pour ne pas laisser un mot à moitié. */
  const tranche = propre.slice(0, LONGUEUR_RESUME)
  const espace = tranche.lastIndexOf(' ')
  return { debut: `${tranche.slice(0, espace > 80 ? espace : LONGUEUR_RESUME)}…`, coupe: true }
}

function Fiche({ fiche }: { fiche: FicheConditions }) {
  const { debut, coupe } = resume(fiche.corps)
  return (
    <div className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-small font-semibold text-ink">{fiche.titre}</h3>
      {coupe ? (
        <details className="group mt-1">
          <summary className="cursor-pointer list-none text-small leading-[1.6] text-ink-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{debut}</span>{' '}
            <span className="font-semibold text-secondary group-open:hidden">Lire la suite</span>
            <span className="hidden font-semibold text-secondary group-open:inline">Réduire</span>
          </summary>
          <p className="mt-2 max-w-[68ch] text-small leading-[1.7] whitespace-pre-line text-ink-2">{fiche.corps}</p>
        </details>
      ) : (
        <p className="mt-1 max-w-[68ch] text-small leading-[1.6] whitespace-pre-line text-ink-2">{debut}</p>
      )}
    </div>
  )
}

export function BlocConditions({ conditions }: { conditions: Conditions }) {
  const fiches = [conditions.livraison, conditions.garantie, conditions.paiement].filter(
    (f): f is FicheConditions => f !== null,
  )
  if (fiches.length === 0) return null

  return (
    <section className="rounded-well border border-rule bg-paper p-4">
      <h2 className="t-label mb-3 text-ink-3">Livraison, garantie et paiement</h2>
      <div className="flex flex-col gap-3">
        {fiches.map((fiche) => (
          <Fiche key={fiche.cle} fiche={fiche} />
        ))}
      </div>
    </section>
  )
}
