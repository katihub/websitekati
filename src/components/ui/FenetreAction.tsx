'use client'

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

/**
 * UNE FENETRE POUR CHAQUE ACTION QUI DEMANDE UNE SAISIE.
 *
 * Elle remplace les `window.prompt` : un prompt ne dit pas ce qu'on attend
 * (combien de caracteres, quel format), ne garde pas la saisie quand le serveur
 * refuse, ne se lit pas a un lecteur d'ecran et s'affiche en anglais selon le
 * navigateur. Ici le formulaire est natif — contraintes `required`, `minLength`,
 * `pattern` verifiees avant l'envoi — et l'erreur du serveur s'affiche DANS la
 * fenetre, la saisie intacte.
 *
 * `<dialog>` NATIF, OUVERT EN MODAL. Le navigateur piege le focus, ferme sur
 * Echap et rend le reste de la page inerte : ce qu'une fenetre faite a la main
 * oublie toujours une fois.
 *
 * UNE DECISION IRREVERSIBLE SE CONFIRME EXPLICITEMENT. Avec `irreversible`, le
 * bouton reste inactif tant que la case de confirmation n'est pas cochee, et
 * le texte de la case dit ce qui ne pourra plus etre defait.
 */

export interface FenetreActionProps {
  ouverte: boolean
  titre: string
  description?: ReactNode
  libelleValider: string
  /** Rend la promesse rejetee pour garder la fenetre ouverte avec le message d'erreur. */
  onValider: (donnees: FormData) => Promise<void>
  onFermer: () => void
  irreversible?: string
  children?: ReactNode
}

export function FenetreAction({ ouverte, titre, description, libelleValider, onValider, onFermer, irreversible, children }: FenetreActionProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [confirme, setConfirme] = useState(false)

  useEffect(() => {
    const fenetre = ref.current
    if (!fenetre) return
    if (ouverte && !fenetre.open) {
      setErreur('')
      setConfirme(false)
      fenetre.showModal()
    }
    if (!ouverte && fenetre.open) fenetre.close()
  }, [ouverte])

  async function valider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (envoi || (irreversible && !confirme)) return
    setEnvoi(true)
    setErreur('')
    try {
      await onValider(new FormData(event.currentTarget))
    } catch (cause) {
      setErreur(cause instanceof Error && cause.message ? cause.message : 'L’action n’a pas pu être enregistrée.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-titre`}
      aria-describedby={description ? `${id}-description` : undefined}
      onClose={onFermer}
      onCancel={(event) => { if (envoi) event.preventDefault() }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-well bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/55"
    >
      <form onSubmit={(event) => void valider(event)} className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={`${id}-titre`} className="text-h4 font-semibold">{titre}</h2>
          <button type="button" onClick={onFermer} disabled={envoi} aria-label="Fermer" className="-m-2 grid min-h-11 min-w-11 place-items-center text-h4">×</button>
        </div>
        {description ? <div id={`${id}-description`} className="text-small text-ink-2">{description}</div> : null}
        {children}
        {irreversible ? (
          <label className="flex items-start gap-3 rounded-control border border-warn p-3 text-small">
            <input type="checkbox" checked={confirme} onChange={(event) => setConfirme(event.currentTarget.checked)} className="mt-0.5 size-5 shrink-0" />
            <span>{irreversible}</span>
          </label>
        ) : null}
        {erreur ? <p role="alert" className="rounded-control border border-warn p-3 text-small text-warn">{erreur}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onFermer} disabled={envoi} className="min-h-11 rounded-control border border-rule px-4 text-small font-semibold">Annuler</button>
          <button type="submit" disabled={envoi || Boolean(irreversible && !confirme)} className="min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface disabled:opacity-50">
            {envoi ? 'Envoi…' : libelleValider}
          </button>
        </div>
      </form>
    </dialog>
  )
}

/** Un champ de saisie avec son libelle et son aide, pour les fenetres d'action. */
export function ChampTexte({ nom, libelle, aide, multiligne, ...attributs }: {
  nom: string
  libelle: string
  aide?: string
  multiligne?: boolean
  minLength?: number
  maxLength?: number
  required?: boolean
  pattern?: string
  placeholder?: string
  defaultValue?: string
  inputMode?: 'text' | 'numeric'
}) {
  const id = useId()
  const classe = 'mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal'
  return (
    <label htmlFor={id} className="block text-small font-semibold">
      {libelle}
      {multiligne
        ? <textarea id={id} name={nom} rows={4} aria-describedby={aide ? `${id}-aide` : undefined} className={classe} {...attributs} />
        : <input id={id} name={nom} aria-describedby={aide ? `${id}-aide` : undefined} className={classe} {...attributs} />}
      {aide ? <span id={`${id}-aide`} className="mt-1 block text-micro font-normal text-ink-3">{aide}</span> : null}
    </label>
  )
}
