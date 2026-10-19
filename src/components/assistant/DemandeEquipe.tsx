'use client'

import { useCallback, useId, useRef, useState, type FormEvent } from 'react'

import { classesAction } from '@/components/ui/Action'
import { transmettreDemande } from '@/lib/assistant'

/**
 * LA QUESTION CONFIÉE À UNE PERSONNE, SANS QUITTER LA CONVERSATION.
 *
 * POURQUOI PAS SEULEMENT WHATSAPP. Le lien WhatsApp suppose un téléphone, une
 * application installée, et de réécrire la question ailleurs. Ce formulaire
 * garde la question là où elle a été posée : l'équipe la lit dans le panel,
 * répond, et la réponse revient DANS CE FIL — et par e-mail. WhatsApp reste
 * proposé à côté, pour qui préfère parler tout de suite.
 *
 * DANS LE FIL, PAS DANS UNE FENÊTRE. Sur un téléphone le panneau est déjà une
 * feuille modale ; une seconde couche par-dessus perdrait la conversation de
 * vue, alors que c'est elle qu'on est en train de résumer.
 *
 * LA VALIDATION SE LIT AU RENDU. Rien n'est recopié dans un état « erreurs »
 * qu'un effet devrait tenir à jour : chaque message se déduit de ce qui est
 * saisi, et n'est MONTRÉ qu'après une première tentative d'envoi — personne ne
 * doit être grondé pour un champ qu'il n'a pas encore atteint.
 */

const QUESTION_MIN = 3
const QUESTION_MAX = 2000

const CHAMP =
  'field mt-1.5 flex items-stretch rounded-control border border-rule-2 bg-space ' +
  'transition-[border-color,box-shadow] duration-[var(--t-fast)]'
/* 16px sur un téléphone : en dessous, Safari zoome toute la page au focus et la
   feuille du panneau saute sous le pouce. */
const SAISIE =
  'min-h-11 min-w-0 flex-1 bg-transparent px-3 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small'
const LIBELLE = 'text-micro font-semibold tracking-[0.02em] text-ink-2'
const ERREUR = 'mt-1.5 text-micro leading-[1.5] text-warn'

/** Assez pour refuser « 6 » ; pas assez pour refuser un numéro étranger. */
const telephoneComplet = (t: string) => t.replace(/\D/g, '').length >= 8
const courrielComplet = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c)

export function DemandeEquipe({
  id,
  fil,
  questionInitiale,
  connecte,
  courriel,
  onTransmise,
  onAnnuler,
}: {
  /** L'identifiant du formulaire, que le bouton qui l'ouvre désigne par `aria-controls`. */
  id: string
  fil: string
  questionInitiale: string
  connecte: boolean
  courriel: string | null
  onTransmise: (reference: string, question: string) => void
  onAnnuler: () => void
}) {
  const ids = useId()
  /* Pré-remplie UNE FOIS, au montage : le formulaire est monté à l'ouverture,
     donc l'initialiseur suffit et aucun effet n'a à recopier la prop. */
  const [question, setQuestion] = useState(() => questionInitiale.trim().slice(0, QUESTION_MAX))
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [tente, setTente] = useState(false)
  /* UN CLIENT CONNECTÉ N'A PAS DE CHAMPS — tant que le backend le reconnaît.
     Si son jeton n'a pas passé (session expirée entre-temps), le backend lui
     réclame un contact : sans ce repli, il lirait « laissez un numéro » au-dessus
     d'un formulaire qui n'a nulle part où l'écrire. */
  const [contactExige, setContactExige] = useState(false)
  /* Le bouton désactivé ne suffit pas : deux « Entrée » rapprochées partent
     avant que le rendu qui le désactive n'ait eu lieu. */
  const enVol = useRef(false)

  const champQuestion = useRef<HTMLTextAreaElement>(null)
  const champTelephone = useRef<HTMLInputElement>(null)
  const champCourriel = useRef<HTMLInputElement>(null)

  /* AMENÉ SOUS LES YEUX ET SOUS LE CLAVIER À L'OUVERTURE. Une référence de
     rappel, stable, plutôt qu'un effet : elle s'exécute une fois, au montage,
     et ne réécrit aucun état. */
  const monte = useCallback((formulaire: HTMLFormElement | null) => {
    if (!formulaire) return
    formulaire.scrollIntoView({ block: 'nearest' })
    champQuestion.current?.focus({ preventScroll: true })
  }, [])

  const avecContact = !connecte || contactExige

  const q = question.trim()
  const tel = telephone.trim()
  const mail = adresse.trim()

  const erreurQuestion =
    q.length < QUESTION_MIN ? 'Écrivez votre question en quelques mots.' : null
  const erreurContact =
    avecContact && !tel && !mail
      ? 'Laissez un numéro de téléphone ou une adresse e-mail pour que l’équipe puisse vous répondre.'
      : null
  const erreurTelephone =
    avecContact && tel && !telephoneComplet(tel) ? 'Ce numéro semble incomplet.' : null
  const erreurCourriel =
    avecContact && mail && !courrielComplet(mail) ? 'Cette adresse e-mail semble incomplète.' : null
  const valide = !erreurQuestion && !erreurContact && !erreurTelephone && !erreurCourriel

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enVol.current) return

    if (!valide) {
      setTente(true)
      /* Le focus va au premier champ à reprendre : un lecteur d'écran y lit
         son erreur, et un clavier n'a pas à la chercher. */
      const cible = erreurQuestion
        ? champQuestion
        : erreurContact || erreurTelephone
          ? champTelephone
          : champCourriel
      cible.current?.focus()
      return
    }

    enVol.current = true
    setEnvoi(true)
    setErreur(null)

    const resultat = await transmettreDemande({
      fil,
      question: q,
      ...(avecContact && nom.trim() ? { nom: nom.trim() } : {}),
      ...(avecContact && tel ? { telephone: tel } : {}),
      ...(avecContact && mail ? { courriel: mail } : {}),
    })

    enVol.current = false
    if (resultat.ok) {
      /* Le parent referme le formulaire et relit le fil : la confirmation qui
         s'affiche est celle que le serveur a écrite, pas une copie locale. */
      onTransmise(resultat.reference, q)
      return
    }

    setEnvoi(false)
    setErreur(resultat.message)
    if (connecte && resultat.statut === 400) setContactExige(true)
  }

  const montrer = tente
  const idAide = `${ids}-aide`
  const idErreurQuestion = `${ids}-erreur-question`
  const idErreurContact = `${ids}-erreur-contact`
  const idErreurTelephone = `${ids}-erreur-telephone`
  const idErreurCourriel = `${ids}-erreur-courriel`

  return (
    <form
      id={id}
      ref={monte}
      onSubmit={envoyer}
      noValidate
      aria-labelledby={`${ids}-titre`}
      aria-busy={envoi}
      /* Le fil est une région `aria-live` : sans ceci, chaque libellé du
         formulaire serait lu d'un trait à son apparition. Le formulaire
         annonce lui-même ce qui compte, dans sa propre région ci-dessous. */
      aria-live="off"
      className="ml-9 flex flex-col gap-3 rounded-well border border-rule bg-paper p-3 md:p-3.5"
    >
      <div>
        <p id={`${ids}-titre`} className="text-small font-semibold text-ink">
          Poser ma question à l’équipe
        </p>
        <p id={idAide} className="mt-0.5 text-micro leading-[1.5] text-ink-3">
          {avecContact
            ? 'Un membre de l’équipe KatiHub vous répondra ici. Laissez un numéro ou une adresse e-mail pour être prévenu.'
            : courriel
              ? `Nous vous répondrons ici et à ${courriel}.`
              : 'Nous vous répondrons ici.'}
        </p>
      </div>

      <div>
        <label htmlFor={`${ids}-question`} className={LIBELLE}>
          Votre question
        </label>
        <span className={CHAMP}>
          <textarea
            ref={champQuestion}
            id={`${ids}-question`}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            maxLength={QUESTION_MAX}
            required
            aria-invalid={montrer && erreurQuestion ? true : undefined}
            aria-describedby={montrer && erreurQuestion ? idErreurQuestion : undefined}
            className={`${SAISIE} max-h-40 resize-y py-2.5 leading-snug`}
          />
        </span>
        {montrer && erreurQuestion ? (
          <p id={idErreurQuestion} className={ERREUR}>
            {erreurQuestion}
          </p>
        ) : null}
      </div>

      {avecContact ? (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="sr-only">Vos coordonnées, pour que l’équipe vous réponde</legend>

          <div>
            <label htmlFor={`${ids}-telephone`} className={LIBELLE}>
              Téléphone
            </label>
            <span className={CHAMP}>
              <input
                ref={champTelephone}
                id={`${ids}-telephone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={telephone}
                onChange={(event) => setTelephone(event.target.value)}
                placeholder="6XX XX XX XX"
                aria-invalid={montrer && (erreurContact || erreurTelephone) ? true : undefined}
                aria-describedby={
                  montrer && erreurTelephone
                    ? idErreurTelephone
                    : montrer && erreurContact
                      ? idErreurContact
                      : undefined
                }
                className={`${SAISIE} t-num`}
              />
            </span>
            {montrer && erreurTelephone ? (
              <p id={idErreurTelephone} className={ERREUR}>
                {erreurTelephone}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${ids}-courriel`} className={LIBELLE}>
              E-mail
            </label>
            <span className={CHAMP}>
              <input
                ref={champCourriel}
                id={`${ids}-courriel`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={adresse}
                onChange={(event) => setAdresse(event.target.value)}
                placeholder="vous@exemple.cm"
                aria-invalid={montrer && (erreurContact || erreurCourriel) ? true : undefined}
                aria-describedby={
                  montrer && erreurCourriel
                    ? idErreurCourriel
                    : montrer && erreurContact
                      ? idErreurContact
                      : undefined
                }
                className={SAISIE}
              />
            </span>
            {montrer && erreurCourriel ? (
              <p id={idErreurCourriel} className={ERREUR}>
                {erreurCourriel}
              </p>
            ) : null}
          </div>

          {montrer && erreurContact ? (
            <p id={idErreurContact} className="-mt-1 text-micro leading-[1.5] text-warn">
              {erreurContact}
            </p>
          ) : null}

          <div>
            <label htmlFor={`${ids}-nom`} className={LIBELLE}>
              Nom <span className="font-normal text-ink-3">(facultatif)</span>
            </label>
            <span className={CHAMP}>
              <input
                id={`${ids}-nom`}
                autoComplete="name"
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                maxLength={120}
                className={SAISIE}
              />
            </span>
          </div>
        </fieldset>
      ) : null}

      {/* LA RÉGION QUI PARLE. Toujours présente, vide au repos : une région
          `aria-live` créée en même temps que son texte n'est pas annoncée par
          tous les lecteurs d'écran. */}
      <div aria-live="polite" role="status">
        {erreur ? <p className="text-micro leading-[1.5] text-warn">{erreur}</p> : null}
        {envoi ? <span className="sr-only">Envoi de votre question à l’équipe…</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* L'ORANGE PLEIN, MÊME PENDANT L'ENVOI. Le système refuse l'orange
            délavé ; c'est le libellé qui dit « Envoi… », et le curseur. */}
        <button
          type="submit"
          disabled={envoi}
          className={`${classesAction('primary', 'sm')} min-h-11 grow whitespace-nowrap disabled:pointer-events-none sm:grow-0`}
        >
          {envoi ? 'Envoi…' : 'Envoyer à l’équipe'}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          disabled={envoi}
          className={`${classesAction('quiet', 'sm')} min-h-11 disabled:pointer-events-none`}
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
