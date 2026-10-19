'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { IconChevronLeft, IconClose } from '@/components/brand/Icons'
import { formatCount, formatWords } from '@/lib/format'
import { hasBeenGreeted, normalisePhone, useAccount, type Account, type MotifOuverture } from '@/lib/account'
import { counterLandmark, findCounter } from '@/lib/comptoirs'
import { lockScroll } from '@/lib/scroll-lock'
import { connexionLocaleActive, seConnecterLocalement } from '@/lib/connexion-locale'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { completerFicheDepuisInscription, enregistrerFiche, lireProfilServeur, pousserProfil, reconcilier } from '@/lib/profil'
import { VILLES_CAMEROUN, villeValide } from '@/constants/villes'
import { envoyerVerificationCourriel } from '@/lib/verification-courriel'

/**
 * Les messages du fournisseur sont en anglais et écrits pour un développeur.
 * « Invalid login credentials » sur l'écran d'un client de Douala ne lui dit ni
 * ce qui s'est passé, ni ce qu'il doit faire.
 *
 * ON NE DISTINGUE PAS le mot de passe faux du compte inexistant, et ce n'est pas
 * une approximation : Supabase renvoie exprès la même erreur pour les deux,
 * parce que les séparer dirait à un inconnu quelles adresses ont un compte ici.
 */
function traduireErreur(brut: string): string {
  const m = brut.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return "Adresse ou mot de passe incorrect. Si vous n'avez pas encore de compte, choisissez « Créer un compte »."
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Cette adresse a déjà un compte. Choisissez « J’ai déjà un compte ».'
  }
  if (m.includes('email not confirmed')) {
    return "Ouvrez d'abord le lien que nous venons de vous envoyer par e-mail."
  }
  if (m.includes('password') && m.includes('at least')) {
    return 'Le mot de passe fait au moins huit caractères.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  }
  if (m.includes('fetch') || m.includes('network')) {
    return 'La connexion au service a échoué. Vérifiez votre réseau et réessayez.'
  }
  return "La connexion n'a pas abouti. Réessayez dans un instant."
}

/**
 * The counter card, as a dialog.
 *
 * IL Y A MAINTENANT UN SERVEUR, ET CE COMMENTAIRE A ÉTÉ RÉÉCRIT AVEC LE CODE.
 * Il expliquait pourquoi ceci n'était pas un écran de connexion : il n'y avait
 * rien derrière, et un mot de passe y aurait été un vrai secret gardé en clair
 * sur une machine souvent partagée. L'argument était juste et il ne l'est plus.
 * Le mot de passe part chez une instance Supabase dédiée à la boutique, qui le
 * hache et ne nous le rend jamais ; rien n'en reste dans ce navigateur. Laisser
 * l'ancien texte aurait garanti qu'au prochain passage quelqu'un tranche au
 * hasard entre le commentaire et le code.
 *
 * CE QUI N'A PAS CHANGÉ, ET QUI RESTE LE COEUR DE L'ÉCRAN. La fiche du comptoir
 * est toujours là et suffit toujours : nom sur la proforma, numéro WhatsApp qui
 * la reçoit, comptoir de retrait. On peut composer un devis entier sans jamais
 * créer de compte, et ce chemin ne doit pas se dégrader, parce que c'est celui
 * que la boutique emprunte depuis le premier jour. Le compte s'AJOUTE : il sert
 * à retrouver ses devis d'un appareil à l'autre, ce que le stockage local ne
 * saura jamais faire.
 *
 * THE COMPOSITION IS THE SHOP, IN TWO PANELS. Left is the counter: the one
 * saturated green on the site, the three real addresses, the real size of the
 * catalogue, and three numbered lines stating exactly what the card carries.
 * Right is the card itself, on paper, with fields drawn like the search field,
 * which is the only other place on this site a customer types.
 *
 * ON A PHONE THE GREEN IS A HEADER BAR AND NOTHING MORE, WHICH IS WHAT MAKES
 * THE EXIT REACHABLE. Measured on the version before this one at 390 x 844: the
 * cross sat 280px down the screen because it lived in the second panel, and both
 * the save button and "Plus tard" were below the fold of a panel that scrolled
 * as one piece. A customer could not see a single way out without scrolling a
 * thing they never asked to open. So the phone layout is three parts, not two:
 * the green band is a fixed head holding the title and the cross, the card is
 * the only part that scrolls, and its two controls are pinned to the foot of
 * that scroller. The way out is on screen at every scroll position, twice.
 *
 * THE ARRIVAL BOUNCES, AND ONLY THE PANEL DOES. A spring at 380 / 18 overshoots
 * by a few per cent and settles, which is the one place on this site allowed to
 * overshoot: this is an invitation, not a rack rail. The scrim behind it is a
 * flat fade, because a backdrop that springs reads as the page itself wobbling,
 * and the exit is a short tween, because the overshoot is an arrival gesture and
 * nothing else. Under `prefers-reduced-motion` nothing transforms at all.
 *
 * IT ARRIVES ON THE DOORSTEP ONLY, AND IT GIVES UP THE MOMENT THE CUSTOMER IS
 * BUSY. See {@link ARRIVAL_DELAY} and the effect under it: the invitation is a
 * greeting, and a greeting belongs at the door. Escape, the scrim, the cross and
 * a plain "Plus tard" all close it, focus is trapped while it is open and handed
 * back to whatever opened it, and the page underneath is locked by the shared
 * lease in `lib/scroll-lock`, not by a write to `document.body` that this
 * stylesheet makes inert.
 */

/** The site's own decelerating curve, for the scrim and for the exit. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const

/**
 * Long enough for the masthead, the opening headline and its first photographs
 * to be on screen. Anything under a second lands on a page that is still white.
 */
const ARRIVAL_DELAY = 1600

/** Past this, the customer is reading the page rather than arriving on it. */
const ARRIVAL_SCROLL = 200

/* The field is the search field's frame, at the same height and with the same
   inward focus ring, because those two are the only places a customer types. */
const FIELD =
  'field mt-2 flex h-12 items-stretch rounded-control border border-rule-2 bg-space ' +
  'transition-[border-color,box-shadow] duration-[var(--t-fast)]'
/* 16px on a phone, 13 from `md` up.
   SAFARI ZOOMS THE PAGE WHEN A FIELD UNDER 16px TAKES FOCUS, and this dialog is
   three fields long: a customer filling in their name watched the modal grow
   past both edges of the screen and had to pinch back before they could reach
   the number. Nothing is gained by the small size here, since the phone layout
   gives the card the full width of the panel anyway. */
const INPUT =
  'min-w-0 flex-1 bg-transparent px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small'
const LABEL = 'text-micro font-semibold tracking-[0.02em] text-ink-2'
const ERROR = 'mt-2 text-micro leading-[1.5] text-warn'

/** Anything with a caret in it. A customer mid-word is not to be interrupted. */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

interface Errors {
  name?: string
  phone?: string
  counter?: string
}

/**
 * `referenceCount` est `null` quand la navigation n'a pas répondu au rendu du
 * layout : la ligne se tait plutôt que d'annoncer zéro référence. Les comptoirs
 * viennent du contexte du compte, que le layout remplit avec ceux du panel.
 */
/**
 * OU MENE « CONTINUER SANS COMPTE » QUAND ON VIENT DE COMMANDER.
 *
 * A la commande elle-meme, depuis que le backend la prend sans compte : la
 * page montre les produits du panier, se modifie, et demande ce que la fiche
 * aurait porte — nom, mobile, adresse. Elle menait au devis WhatsApp tant que
 * la commande exigeait un compte.
 */
const SANS_COMPTE_DEPUIS_COMMANDE = '/commande/valider'

export function AuthDialog({ referenceCount }: { referenceCount: number | null }) {
  const { account, pointsVente, isOpen, open, close, signIn, sansComptePossible, motif } = useAccount()
  const { session } = useSession()
  const router = useRouter()

  /**
   * LA FENETRE SE FERME, ET LA SUITE DEPEND DE POURQUOI ELLE S'EST OUVERTE.
   * Depuis « Commander » du panier, toute issue mene a la commande, avec les
   * produits du panier — connecte ou non : le panier lui-meme a deja ete
   * ferme par son bouton, il ne reste donc que la page qui suit.
   */
  const terminer = (issue: 'compte' | 'sans-compte') => {
    close()
    if (motif === 'commande') {
      router.push(issue === 'compte' ? '/commande/valider' : SANS_COMPTE_DEPUIS_COMMANDE)
    }
  }

  /**
   * LA FICHE REMONTE AU SERVEUR DÈS QU'IL Y A UNE SESSION, et redescend quand
   * le serveur en a une. Sans ce rapprochement, les deux moitiés de
   * l'inscription ne se rejoindraient jamais : on pourrait se connecter, et sa
   * fiche resterait dans le navigateur où on l'a tapée.
   *
   * Le cas qui compte est le troisième traité par `reconcilier` : quelqu'un
   * remplit sa fiche sans compte, compose un devis, puis crée un compte pour le
   * retrouver plus tard. Sans lui, il devrait ressaisir les trois champs qu'il
   * vient de taper.
   */
  useEffect(() => {
    if (!session) return
    void reconcilier(account, signIn)
    // `account` est volontairement hors des dépendances : le rapprochement se
    // fait à l'arrivée de la session, pas à chaque frappe dans le formulaire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId])

  /** Enregistre localement, puis pousse au serveur si l'on est connecté. */
  const enregistrer = (fiche: Account) => {
    signIn(fiche)
    if (session) void pousserProfil(fiche)
  }
  const panel = useRef<HTMLDivElement>(null)
  const exit = useRef<HTMLButtonElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()
  const pathname = usePathname()
  const titleId = useId()
  const noteId = useId()

  const editing = account !== null

  /* -- The invitation ------------------------------------------------------
     THE DOORSTEP IS `/`, AND IT IS THE `/` THE CUSTOMER ARRIVED ON. The brief
     asked for a greeting on arrival; the version before this one read "arrival"
     as "any page load", which is how it came to open itself over a 404, over a
     product page opened from a search engine, and over the twenty-fourth page
     of a session that was going perfectly well. A greeting on page twenty-four
     is not a greeting.

     So there are two conditions, not one. `pathname === '/'` rules out every
     other route. `landing` holds the route this dialog was mounted on, which is
     the route the browser actually loaded: this component lives in the layout
     and is never unmounted, so a customer who came in through `/catalogue` and
     later clicked the wordmark home carries `landing === '/catalogue'` for the
     whole session and is never greeted. Being handed a popup on the way back to
     the front page is the same interruption the audit measured, arriving by a
     different door.

     AND IT LOSES EVERY RACE IT IS IN. The delay exists so the invitation lands
     on a painted shop, but a second and a half is long enough for a customer to
     have started using the site, and taking the focus off somebody who is
     already typing is the worst thing a dialog can do. So a key, a pointer, a
     scroll of more than 200px, or a caret already sitting in a field at the
     moment the timer fires all cancel it outright — cancel, not postpone: a
     customer who has begun to serve themselves has answered the question the
     invitation was going to ask. It is not marked as greeted either, so the
     door is still open on their next visit.

     THE SCROLL IS MEASURED RATHER THAN COUNTED, AND `wheel` IS DELIBERATELY NOT
     IN THAT LIST. An earlier pass cancelled on the first `wheel` event, which
     made the 200px threshold underneath it unreachable: one notch of a mouse
     wheel, some 100px, killed the invitation, and the number in the brief was
     dead code. A wheel is only how a scroll is asked for; `scroll` is the page
     answering, it is the event a touch drag and a keyboard PageDown fire too,
     and the distance is what tells a reader who has moved on from a phone that
     landed two pixels off zero by existing.

     THE POSITION IS READ ONCE BEFORE ANY LISTENER IS BOUND, BECAUSE THE PAGE IS
     READABLE BEFORE IT IS INTERACTIVE. Nothing in this effect exists until React
     has hydrated, and hydration is not instant: measured against the dev server
     at 1440, the first paint stood a full second ahead of it. A customer who
     read the headline and flicked the wheel in that second would have had every
     event of that flick land in a document with no listeners on it, and the
     invitation would have opened over a page they had already moved past. So
     the scroll position at mount is itself a verdict: past the same 200px, the
     reader has gone on without us, whenever they did it. */
  const landing = useRef(pathname)

  useEffect(() => {
    if (account || pathname !== '/' || landing.current !== '/' || hasBeenGreeted()) return
    if (window.scrollY > ARRIVAL_SCROLL) return

    const from = window.scrollY
    let timer = 0

    const stop = () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('scroll', onScroll)
    }

    const onScroll = () => {
      if (Math.abs(window.scrollY - from) > ARRIVAL_SCROLL) stop()
    }

    window.addEventListener('keydown', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })

    timer = window.setTimeout(() => {
      stop()
      // Checked again on firing: the customer may have opened and dismissed the
      // dialog themselves during the delay, and reopening it then would be the
      // site arguing with them.
      if (hasBeenGreeted()) return
      if (document.activeElement?.matches(TYPING)) return
      open()
    }, ARRIVAL_DELAY)

    return stop
  }, [account, pathname, open])

  /* -- Focus, restoration, and the page underneath -------------------------
     THE FOCUS GOES TO THE WAY OUT, NOT TO THE FIRST FIELD. A caret blinking in
     a name box is an instruction to start typing, and this is the one dialog on
     the site the customer did not ask for. The cross is a real control, so it
     carries a real focus ring, and reading order from there is the title, the
     three lines, the form.

     The panel itself is no longer focused and no longer carries a `tabindex`,
     which is the whole of the green hairline the audit saw: the document's
     focus rule matches `[tabindex]:focus-visible` and drew its 2px accent
     outline around all 928 pixels of the panel every time it opened. A ring
     belongs on a control a key can reach, and nothing here is one. */
  useEffect(() => {
    if (!isOpen) return

    restoreTo.current = document.activeElement as HTMLElement
    const release = lockScroll()
    exit.current?.focus({ preventScroll: true })

    return () => {
      release()
      const back = restoreTo.current
      restoreTo.current = null
      // Guarded because this cleanup also runs when the route changes under an
      // open dialog, and the control that opened it is gone by then.
      if (back?.isConnected) back.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      // Without the trap, tabbing walks the page behind a modal that has just
      // covered it, which is a reader typing into a form they cannot see. The
      // rectangle test drops anything the responsive layout has taken out with
      // `display: none`, since a hidden control cannot take the focus and would
      // otherwise be handed the end of the cycle.
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-6">
          <motion.button
            type="button"
            aria-label="Fermer"
            onClick={close}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT as never }}
            className="absolute inset-0 cursor-pointer bg-[rgb(20_23_21_/_0.5)] backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={noteId}
            initial={reduced ? false : { opacity: 0, scale: 0.9, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reduced
                ? undefined
                : {
                    opacity: 0,
                    scale: 0.97,
                    y: 10,
                    transition: { duration: 0.16, ease: EASE_OUT as never },
                  }
            }
            transition={
              reduced
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 380,
                    damping: 18,
                    mass: 0.9,
                    opacity: { duration: 0.18 },
                  }
            }
            /* The panel clips instead of scrolling, and each part manages its
               own overflow. That is what lets the green band stay put on a phone
               while the card moves under it. */
            className="relative flex max-h-[92dvh] w-full max-w-[58rem] flex-col overflow-hidden rounded-space bg-paper shadow-[0_40px_90px_-40px_rgb(20_23_21_/_0.55)] outline-none md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
          >
            {/* The one cross, placed against the panel rather than against
                either half of it, because the top right corner of the panel is
                green on a phone and paper from `md` up. The focus ring follows
                the ground it lands on: the document rule draws it in --accent,
                which is deep pine on the rail's deep pine, so the phone case
                takes --rail-accent instead. Both are marked important, since the
                document's rule is unlayered and would otherwise outrank any
                utility whatever its specificity. */}
            <button
              ref={exit}
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="press absolute top-2 right-2 z-10 grid size-11 place-items-center rounded-control text-rail-ink transition-colors duration-[var(--t-fast)] hover:text-secondary focus-visible:outline-rail-accent! md:top-3 md:right-3 md:text-ink-2 md:hover:text-secondary md:focus-visible:outline-primary!"
            >
              <IconClose className="text-[1.25rem]" />
            </button>

            {/* -- The counter ------------------------------------------- */}
            <div className="on-rail flex shrink-0 flex-col bg-rail px-5 py-4 pr-16 text-rail-ink md:overflow-y-auto md:px-8 md:py-9 md:pr-8">
              <p className="t-label text-rail-ink-2">Le comptoir</p>
              <h2
                id={titleId}
                className="mt-1.5 text-sub font-extrabold tracking-[-0.025em] text-balance md:mt-3 md:text-title"
              >
                {editing ? 'Vos coordonnées' : 'Votre fiche client'}
              </h2>

              {/* Two lines on a phone and the full paragraph from `md` up: the
                  same fact, sized to the band it has to fit inside. The long
                  version below would be five lines at 390 and would push the
                  card's first field off the screen. */}
              {/* Two lines at 360, where it was three. The band is a head, not
                  a column: every line it takes is a line the card underneath
                  loses, and at 360 x 640 the card had room for one field and
                  half of the next. */}
              <p className="mt-2 max-w-[38ch] text-small leading-[1.6] text-pretty text-rail-ink-2 md:hidden">
                Rien ne se paie en ligne. Votre fiche prépare la proforma.
              </p>
              <p className="mt-4 hidden max-w-[34ch] text-small leading-[1.65] text-pretty text-rail-ink-2 md:block">
                Rien ne se paie en ligne ici : on règle au comptoir, à la livraison ou par
                Mobile Money contre proforma. Votre fiche prépare ce moment, et elle porte
                trois choses.
              </p>

              {/* Three lines and no paragraphs. The list is a legend, not an
                  argument: the sentence above has already made the case, and a
                  second block of prose under it would only push the three real
                  addresses off the bottom of the panel.

                  LES CHIFFRES SONT EN --secondary, ET C'ETAIT D'ABORD UNE
                  QUESTION DE CONTRASTE AVANT D'ETRE UNE QUESTION DE CHARTE.
                  L'accent du bandeau mesure 4.41:1 sur ce vert : il passe le
                  3:1 d'un anneau de focus, pas le 4.5:1 d'un texte de 12px —
                  d'ou --rail-ink-2 (4.54:1) pendant longtemps. L'orange de la
                  maison, lui, mesure largement au-dela sur ce meme vert, et
                  il porte desormais tout ce sur quoi l'oeil doit se poser. */}
              <ol className="mt-7 hidden md:block">
                {[
                  'La liste de matériel à chiffrer',
                  'Le nom et le numéro de la proforma',
                  'Le comptoir de retrait habituel',
                ].map((row, index) => (
                  <li
                    key={row}
                    className="flex gap-4 border-t border-rail-rule py-3 text-small last:border-b"
                  >
                    <span className="t-num text-micro text-secondary">0{index + 1}</span>
                    <span className="min-w-0 font-semibold">{row}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-auto hidden pt-8 md:block">
                {pointsVente.length > 0 ? (
                  <>
                    <p className="t-label text-rail-ink-2">
                      {pointsVente.length === 1
                        ? 'Notre comptoir'
                        : `Nos ${formatWords(pointsVente.length)} comptoirs`}
                    </p>
                    <ul className="mt-4 space-y-3.5">
                      {pointsVente.map((point) => (
                        <li key={point.key}>
                          <p className="text-small font-semibold">
                            {point.label}, {point.city}
                          </p>
                          <p className="mt-0.5 text-micro leading-[1.5] text-rail-ink-2">
                            {point.directions}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {referenceCount !== null ? (
                  <p className="t-num mt-6 border-t border-rail-rule pt-5 text-micro text-rail-ink-2">
                    {formatCount(referenceCount, 'référence')} au catalogue
                  </p>
                ) : null}
              </div>
            </div>

            {/* -- The card ----------------------------------------------
                The only scrolling part, and the only one that needs to be: the
                foot padding is spent by the pinned control row inside the form
                instead, so nothing is left showing under it. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-4 md:px-9 md:pt-9 md:pb-9">
              <p className="t-label text-ink-3 md:pr-12">
                {editing ? 'Mettre à jour' : 'Trois informations, une seule fois'}
              </p>
              {/* The sentence is the same one on both grounds; only its size
                  changes. At 13px on a 360 screen it took three lines and 62
                  pixels off a card that has three fields to show.

                  ELLE A ÉTÉ RÉÉCRITE LE JOUR OÙ LA CONNEXION EST ARRIVÉE. Elle
                  disait « Elle ne crée pas de compte en ligne et ne demande
                  aucun mot de passe », ce qui était vrai tant qu'il n'y avait
                  pas de serveur et qui est devenu faux dans le même
                  déploiement. Une promesse d'anonymat affichée au-dessus d'un
                  champ de mot de passe n'est pas une maladresse de rédaction,
                  c'est une phrase qui trompe. Ce qui reste vrai, et qui est le
                  seul point qui intéresse le lecteur, c'est qu'il peut
                  continuer sans compte. */}
              <p
                id={noteId}
                className="mt-2 max-w-[46ch] text-micro leading-[1.55] text-ink-2 md:mt-2.5 md:text-small md:leading-[1.6]"
              >
                Cette fiche suffit pour composer un devis, sans compte. Créez-en un si vous
                voulez retrouver vos devis d’un appareil à l’autre.
              </p>

              {/* Mounted only while the dialog is open, which is what lets the
                  fields be initialised from the stored card at mount instead of
                  being pushed into state by an effect on every open. */}
              <CardForm
                account={account}
                onSubmit={enregistrer}
                onCancel={close}
                onTermine={terminer}
                motif={motif}
                sansComptePossible={sansComptePossible}
              />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * The card.
 *
 * VALIDATION HAPPENS AT SUBMISSION, NEVER WHILE TYPING. A number is wrong for
 * every keystroke but the last, so validating as you type means telling the
 * customer they are wrong eight times in a row before they are right. Nothing
 * here blocks or reformats the keys either: the store normalises the number
 * afterwards, and a field that rearranges what you typed under your cursor is
 * how a form loses a phone number.
 *
 * THE CONTROL ROW IS PINNED TO THE FOOT OF THE SCROLLER, AND THAT IS AN
 * ACCESSIBILITY FIX RATHER THAN A FLOURISH. At 390 x 844 the card is taller than
 * the space it has, so on the old layout "Enregistrer ma fiche" and "Plus tard"
 * both sat below the fold of a dialog the customer never opened. Sticky at the
 * foot, they are on screen at every scroll position, and the negative margin is
 * the pane's own gutter given back so the bar covers the full width of what
 * passes under it.
 */
function CardForm({
  account,
  onSubmit,
  onCancel,
  onTermine,
  motif,
  sansComptePossible,
}: {
  account: Account | null
  onSubmit: (fields: Account) => void
  onCancel: () => void
  /** Ferme la fenetre et mene a la suite, selon le motif d'ouverture. */
  onTermine: (issue: 'compte' | 'sans-compte') => void
  motif: MotifOuverture
  /** La fenetre propose de continuer sans compte (devis ou commande). */
  sansComptePossible: boolean
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  const { pointsVente } = useAccount()
  const [counter, setCounter] = useState(account?.counter ?? '')
  const [errors, setErrors] = useState<Errors>({})
  const { session } = useSession()
  // TWO STEPS, BECAUSE THE FIRST QUESTION IS NOT A FIELD. A reader who opens
  // this on arrival is being asked to fill a form before being told what it is
  // for. Asking how they want to be reached first is one tap, it is the only
  // choice this shop actually has to offer, and it turns the second screen from
  // an interrogation into the consequence of an answer they already gave.
  //
  // CONNECTE, ON NE REDEMANDE PAS LA CONNEXION. Un client connecte dont la
  // fiche n'est pas dans ce navigateur voyait l'ecran de connexion en ouvrant
  // « Mes coordonnees » : il se reconnectait alors qu'il l'etait deja.
  const [step, setStep] = useState<'choix' | 'fiche'>(account || session ? 'fiche' : 'choix')

  /**
   * LA FICHE DU SERVEUR, QUAND CE NAVIGATEUR N'EN A PAS.
   *
   * Apres une deconnexion, la fiche de ce navigateur est effacee ; elle vit
   * encore sur le serveur. Sans cette lecture, se reconnecter faisait retaper
   * nom, numero et comptoir (retour du client, 5 octobre). Seuls les champs
   * encore vides sont remplis : ce que la personne a deja tape ne bouge pas.
   */
  const preRemplir = () =>
    lireProfilServeur().then((r) => {
      const fiche = r?.profil
      if (!fiche) return
      setName((v) => v || fiche.nom || '')
      setPhone((v) => v || fiche.telephone || '')
      setCounter((v) => v || fiche.comptoirPrefere || '')
    })

  useEffect(() => {
    if (!account && session) void preRemplir()
    // Une fois, a l'ouverture : la fenetre est montee a chaque ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  /**
   * LES DEUX COUTURES SONT BRANCHÉES. Ce qui suit authentifie réellement, contre
   * une instance Supabase dédiée à la boutique.
   *
   * PAS CELLE DE NVC, ET C'EST STRUCTURANT. Son `auth.users` est unique pour
   * toute l'instance, ses inscriptions sont fermées, et sa garde
   * d'administration vérifie une session et non un rôle : ouvrir les
   * inscriptions là-bas donnerait à chaque client de cette boutique un compte
   * accepté par l'administration du studio.
   *
   * DEUX MODES EXPLICITES PLUTÔT QU'UN BOUTON QUI DEVINE. Supabase renvoie la
   * même erreur pour un mot de passe faux et pour un compte inexistant, et c'est
   * volontaire : la différence dirait à un inconnu quelles adresses ont un
   * compte ici. On ne peut donc pas basculer automatiquement de la connexion
   * vers l'inscription, et prétendre le contraire produirait un écran qui se
   * trompe une fois sur deux.
   */
  const [motDePasse, setMotDePasse] = useState('')
  const [ville, setVille] = useState('')
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [enCours, setEnCours] = useState(false)

  const onEmail = async () => {
    // Forme seulement, et volontairement pas une grammaire stricte : ce contrôle
    // sert à rattraper une faute de frappe avant l'écran suivant, pas à décider
    // de ce qu'est une boîte aux lettres valide.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setEmailError('Vérifiez cette adresse : il manque un @ ou un domaine.')
      return
    }
    /* L'INSCRIPTION SE FAIT EN UNE ETAPE : courriel, telephone, mot de passe.
       Le telephone est demande ici plutot que sur un second ecran, et il est
       verifie avant l'appel a Supabase : un compte cree sans numero valide
       laisserait une fiche impossible a enregistrer. */
    const telephoneInscription = mode === 'inscription' ? normalisePhone(phone) : null
    if (mode === 'inscription' && !telephoneInscription) {
      setEmailError('Indiquez un mobile camerounais : neuf chiffres commençant par 6.')
      return
    }
    const villeInscription = mode === 'inscription' ? villeValide(ville) : null
    if (mode === 'inscription' && !villeInscription) {
      setEmailError('Indiquez votre ville.')
      return
    }
    if (motDePasse.length < 8) {
      setEmailError('Le mot de passe fait au moins huit caractères.')
      return
    }

    const client = supabase()
    if (!client && !connexionLocaleActive) {
      setEmailError("La connexion n'est pas disponible pour le moment.")
      return
    }

    setEnCours(true)
    setEmailError(null)

    let erreur: string | null = null
    if (client) {
      const { error } =
        mode === 'connexion'
          ? await client.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
          : await client.auth.signUp({ email: email.trim(), password: motDePasse, options: { data: { phone: telephoneInscription, city: villeInscription } } })
      erreur = error?.message ?? null
      if (!erreur && mode === 'connexion') {
        const { data } = await client.auth.getUser()
        await completerFicheDepuisInscription(data.user?.user_metadata)
      }
    } else {
      // A development machine without Supabase: the backend's local door. On
      // that door, signing up and signing in are the same gesture — any
      // address plus the development password is an account of this machine.
      try {
        await seConnecterLocalement(email.trim(), motDePasse)
      } catch (e) {
        erreur = (e as Error).message
      }
    }

    setEnCours(false)
    if (erreur) {
      setEmailError(traduireErreur(erreur))
      return
    }
    // Le mot de passe ne reste pas en mémoire une seconde de plus que
    // nécessaire, et surtout il ne repart pas dans un rendu suivant.
    setMotDePasse('')

    /* La fiche du serveur nait avec le telephone : c'est tout ce que le backend
       exige d'un compte. Le nom viendra avec la premiere commande. Un echec ici
       n'empeche pas d'avancer — la page de commande redemandera le numero. */
    if (telephoneInscription) {
      await enregistrerFiche({ telephone: telephoneInscription, ville: villeInscription ?? undefined })
      await envoyerVerificationCourriel().catch(() => undefined)
    }

    /* LA SUITE DEPEND DU MOTIF. Un devis a besoin du nom et du comptoir pour son
       message WhatsApp : la fiche suit. Une commande les demande elle-meme : la
       fenetre se ferme et mene a la page de commande. Une simple visite n'a
       rien a remplir de plus. */
    if (motif === 'devis') {
      if (!account) void preRemplir()
      setStep('fiche')
      return
    }
    onTermine('compte')
  }
  const form = useRef<HTMLFormElement>(null)
  const ids = useId()

  const editing = account !== null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const dialled = normalisePhone(phone)
    const next: Errors = {}

    if (trimmed.length < 2) {
      next.name = 'Indiquez le nom qui doit figurer sur la proforma.'
    }
    if (!phone.trim()) {
      next.phone = 'Indiquez le numéro qui reçoit la proforma sur WhatsApp.'
    } else if (!dialled) {
      next.phone =
        'Un mobile camerounais s’écrit +237 6XX XX XX XX, soit neuf chiffres commençant par 6.'
    }
    /* Un comptoir ne s'exige que s'il y en a un à choisir. Quand la liste n'a
       pas pu être lue, bloquer la fiche sur une question sans réponse ferait
       perdre au client le nom et le numéro qu'il vient de taper.

       Et il doit être l'un de ceux que le panel publie. Une fiche restée sur
       « Bonapriso » s'enregistrait sans qu'aucune case soit cochée, puis
       partait dans le devis avec un comptoir fermé. */
    if (pointsVente.length > 0 && findCounter(counter, pointsVente) === null) {
      next.counter = 'Choisissez le comptoir où vous retirez le plus souvent.'
    }

    setErrors(next)
    if (!dialled || Object.keys(next).length > 0) {
      // The reader is taken to the first field that needs them, rather than left
      // to hunt for the line that changed in a form they cannot see all of.
      const field = next.name ? 'name' : next.phone ? 'phone' : 'counter'
      form.current?.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus()
      return
    }

    onSubmit({ name: trimmed, phone: dialled, counter })
  }

  if (step === 'choix') {
    return (
      <div className="mt-5 flex flex-1 flex-col md:mt-8">
        {/* ONE DOOR, AND IT IS THE ONE THAT WORKS.
            A « Continuer avec Google » button stood here. It was genuinely
            wired — `signInWithOAuth({ provider: 'google' })` — and that was
            exactly the problem: it needed an OAuth client, a secret and a
            redirect URI registered in Supabase, none of which exist. The
            control looked available, and anyone pressing it met a provider
            error rather than a sign-in.

            A door that is drawn but locked is worse than no door: the reader
            chooses it, fails, and concludes the shop is broken rather than
            trying the one beside it. The address and password below reach the
            same Supabase instance the backend verifies its tokens against, so
            what remains is the path that actually signs people in. */}
        <label className="mt-7 block">
          <span className={LABEL}>Adresse e-mail</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@entreprise.cm"
            /* 16px is the floor, not a preference: below it iOS zooms the whole
               page on focus and the dialog jumps under the thumb. */
            className="mt-2 block min-h-12 w-full rounded-control border border-rule-2 bg-paper px-4 text-[1rem] text-ink transition-colors duration-[var(--t-fast)] placeholder:text-ink-3 focus:border-ink focus:outline-none"
          />
        </label>
        {mode === 'inscription' ? (
          <label className="mt-4 block">
            <span className={LABEL}>Téléphone WhatsApp</span>
            <span className={FIELD}>
              <span className="t-num grid place-items-center border-r border-rule-2 px-3.5 text-small text-ink-3">
                +237
              </span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="6XX XX XX XX"
                className={`${INPUT} t-num`}
              />
            </span>
          </label>
        ) : null}
        {mode === 'inscription' ? (
          <label className="mt-4 block">
            <span className={LABEL}>Ville</span>
            <input
              value={ville}
              onChange={(event) => setVille(event.target.value)}
              list="villes-inscription-fenetre"
              autoComplete="address-level2"
              maxLength={60}
              placeholder="Douala, Yaoundé…"
              className="mt-2 block min-h-12 w-full rounded-control border border-rule-2 bg-paper px-4 text-[1rem] text-ink transition-colors duration-[var(--t-fast)] placeholder:text-ink-3 focus:border-ink focus:outline-none"
            />
            <datalist id="villes-inscription-fenetre">
              {VILLES_CAMEROUN.map((nom) => <option key={nom} value={nom} />)}
            </datalist>
          </label>
        ) : null}
        <label className="mt-4 block">
          <span className={LABEL}>Mot de passe</span>
          <input
            type="password"
            /* `new-password` sur l'inscription fait proposer un mot de passe fort
               par le gestionnaire du navigateur; `current-password` fait remplir
               celui qui est enregistré. Le même jeton pour les deux cas donne
               l'un ou l'autre au hasard. */
            autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            placeholder="Huit caractères au minimum"
            className="mt-2 block min-h-12 w-full rounded-control border border-rule-2 bg-paper px-4 text-[1rem] text-ink transition-colors duration-[var(--t-fast)] placeholder:text-ink-3 focus:border-ink focus:outline-none"
          />
        </label>

        {emailError ? (
          <p role="alert" className="mt-2 text-micro text-warn">
            {emailError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onEmail}
          disabled={enCours}
          className="press fill mt-4 inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control bg-secondary px-7 text-[0.875rem] font-bold text-on-surface transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--secondary)] disabled:opacity-60"
        >
          {enCours
            ? 'Un instant…'
            : mode === 'connexion'
              ? 'Se connecter'
              : 'Créer mon compte'}
        </button>

        {/* La bascule est un bouton de texte et non un second bouton plein : deux
            appels à l'action de même poids sur un écran obligent à lire les deux
            avant de choisir, alors qu'une seule des deux voies concerne le
            lecteur. */}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'connexion' ? 'inscription' : 'connexion')
            setEmailError(null)
          }}
          className="press mt-3 inline-flex min-h-11 items-center self-center text-small text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-secondary"
        >
          {mode === 'connexion' ? 'Créer un compte' : 'J’ai déjà un compte'}
        </button>

        {/* NO CLOSING PARAGRAPH HERE, AND ONE WAS WRITTEN AND REMOVED. It said
            that nothing is paid online, that no password is asked and that the
            card stays in this browser — all three of which the dialog's own shell
            has already said, twelve lines above, in almost the same words. Two
            statements of the same reassurance on one screen do not reassure twice;
            they read as a shop insisting. */}
        {/* « PLUS TARD » FERME LA FENETRE, SAUF QUAND ON VIENT ENVOYER UN DEVIS.
            Le lien disait « Continuer sans compte » partout et menait au second
            formulaire, nom et numero : le visiteur qui voulait seulement
            regarder la boutique se retrouvait devant une fiche a remplir. La
            fiche sans compte ne sert qu'a un devis envoye sur WhatsApp, et
            n'est donc proposee que la. */}
        <button
          type="button"
          onClick={
            motif === 'commande'
              ? () => onTermine('sans-compte')
              : sansComptePossible
                ? () => setStep('fiche')
                : onCancel
          }
          className="press mt-6 inline-flex min-h-11 items-center self-center text-small text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-secondary"
        >
          {sansComptePossible ? 'Continuer sans compte' : 'Plus tard'}
        </button>
      </div>
    )
  }

  return (
    <form ref={form} onSubmit={submit} noValidate className="mt-5 flex flex-1 flex-col md:mt-8">
      <button
        type="button"
        onClick={() => setStep('choix')}
        className="press mb-5 inline-flex min-h-11 items-center gap-2 self-start text-small text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-secondary"
      >
        <IconChevronLeft className="text-[1rem]" />
        Retour
      </button>

      <label className="block">
        <span className={LABEL}>Nom et prénom</span>
        <span className={FIELD}>
          <input
            data-field="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            placeholder="Comme sur la proforma"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${ids}-name` : undefined}
            className={INPUT}
          />
        </span>
      </label>
      {errors.name ? (
        <p id={`${ids}-name`} className={ERROR}>
          {errors.name}
        </p>
      ) : null}

      <label className="mt-5 block md:mt-6">
        <span className={LABEL}>Téléphone WhatsApp</span>
        <span className={FIELD}>
          <span className="t-num grid place-items-center border-r border-rule-2 px-3.5 text-small text-ink-3">
            +237
          </span>
          <input
            data-field="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="6XX XX XX XX"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? `${ids}-phone` : undefined}
            className={`${INPUT} t-num`}
          />
        </span>
      </label>
      {errors.phone ? (
        <p id={`${ids}-phone`} className={ERROR}>
          {errors.phone}
        </p>
      ) : null}

      {pointsVente.length > 0 ? (
      <fieldset className="mt-5 md:mt-6">
        <legend className={LABEL}>Comptoir de retrait</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {pointsVente.map((point, index) => {
            const selected = counter === point.key
            const landmark = counterLandmark(point, pointsVente)
            return (
              <label
                key={point.key}
                className={`press flex min-h-11 cursor-pointer flex-row items-center justify-between gap-3 rounded-control border px-3.5 py-2 transition-colors duration-[var(--t-fast)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary sm:flex-col sm:items-start sm:justify-center sm:gap-0 sm:py-2.5 ${
                  selected ? 'border-secondary bg-secondary' : 'border-rule-2 hover:border-ink-3'
                }`}
              >
                {/* The control is hidden and not removed: it is still a radio
                    group to the keyboard and to the screen reader, and the label
                    around it is what gets drawn. */}
                <input
                  type="radio"
                  name="comptoir"
                  value={point.key}
                  checked={selected}
                  onChange={() => setCounter(point.key)}
                  data-field={index === 0 ? 'counter' : undefined}
                  aria-describedby={errors.counter ? `${ids}-counter` : undefined}
                  className="sr-only"
                />
                <span
                  className={`text-small font-semibold ${selected ? 'text-secondary' : 'text-ink'}`}
                >
                  {point.district}
                </span>
                {/* Two counters in one district are told apart by their
                    landmark; otherwise the city says enough. */}
                <span className="text-micro text-ink-3">{landmark ?? point.city}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      ) : null}
      {errors.counter ? (
        <p id={`${ids}-counter`} className={ERROR}>
          {errors.counter}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 mt-auto flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-rule bg-paper px-5 pt-4 pb-5 md:static md:mx-0 md:border-0 md:px-0 md:pt-9 md:pb-0">
        {/* `Action` renders a link and this submits a form, so the primary
            variant's classes are repeated here rather than the control being
            turned into a link that navigates nowhere. */}
        <button
          type="submit"
          className="press fill inline-flex min-h-11 items-center justify-center gap-2.5 rounded-control bg-secondary px-7 py-3 text-[0.875rem] font-bold text-on-surface transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--secondary)]"
        >
          {editing ? 'Enregistrer les modifications' : 'Enregistrer ma fiche'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="press min-h-11 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
        >
          <span className="draw-under">{editing ? 'Annuler' : 'Plus tard'}</span>
        </button>
      </div>
    </form>
  )
}
