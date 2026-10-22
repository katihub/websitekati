'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { IconArrowRight, IconClose } from '@/components/brand/Icons'
import { classesAction } from '@/components/ui/Action'
import { DemandeEquipe } from './DemandeEquipe'
import { MenuGuide } from './MenuGuide'
import { TexteRiche } from './TexteRiche'
import { whatsappHref } from '@/lib/comptoirs'
import { lockScroll } from '@/lib/scroll-lock'
import { formatPrice } from '@/lib/format'
import { useSession } from '@/lib/session'
import {
  HORS_LIGNE,
  constaterReponses,
  demander,
  filsEnAttente,
  fusionnerFil,
  garderFil,
  heure,
  lireFil,
  lireMenu,
  abonnerFils,
  filsCoteServeur,
  instantaneDesFils,
  marquerLu,
  noterDemande,
  noterFil,
  nouvelleConversation,
  relire,
  type EntreeMenu,
  type MenuAssistant,
  type Message,
  type NoeudMenu,
  type PiecesReponse,
  type ProduitCite,
} from '@/lib/assistant'

/**
 * BOD, THE COUNTER ASSISTANT.
 *
 * WHAT CHANGED, AND WHY IT WAS WORTH CHANGING. This panel was a docket: a
 * question in bold, its answer underneath in blocks, ruled off like a printed
 * form. It was legible and it was not a conversation — there was no sender, no
 * recipient, no thread you could come back to. And it read the shop from a
 * JSON file compiled the day the site was built, so a product created this
 * morning did not exist for it.
 *
 * It is now a conversation, and every question reaches the shop's database.
 *
 * WHAT WAS KEPT, DELIBERATELY. The shell below is hard-won and none of it is
 * about chat: the on-screen keyboard measured through `visualViewport` because
 * Android Chrome shrinks the visual viewport and leaves the layout alone; the
 * page lock under the phone sheet; the focus trap that exists only on the
 * phone, where the panel is modal; the launcher that steps aside while the
 * reader scrolls. Rewriting those to get bubbles would have been trading
 * working behaviour for appearance.
 *
 * WHAT IT REFUSES TO DO. It has no model and no key. It never estimates a
 * delivery time it was not told, never ranks one reference above another, and
 * never invents a specification. Every product it names was read from a row
 * during that question. When it does not know, it says so in one line and
 * hands the question to a person, with the text already written.
 */

const SHEET = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const
const SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const

/**
 * A media query, answered correctly on the first client render.
 *
 * `useSyncExternalStore` rather than an effect, for the reason the repository
 * forbids the effect: it would render the desktop panel once and the sheet
 * once, and the reader would see a card appear bottom-right and then jump to
 * the bottom of the screen. The server snapshot is `false`, so the first paint
 * is the desktop composition and only a phone corrects it, before paint.
 */
function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** The opening turn, written here because there is nobody to ask yet. */
const BIENVENUE: Message = {
  id: 'bienvenue',
  auteur: 'assistant',
  texte:
    'Bonjour, je suis Kati, l’assistante de KatiMarket. Je consulte le catalogue en direct : ' +
    'demandez-moi un produit, un prix, une garantie, une livraison ou de l’aide pour votre commande.',
  le: 0,
}

const PREMIERES_SUITES = [
  'Je cherche un ordinateur portable',
  'Quelle est la garantie sur vos produits ?',
  'Vous livrez dans quelles villes ?',
  'Je veux parler à un conseiller',
]

let compteur = 0
const identifiant = () => `m${(compteur += 1)}`

/**
 * DIX SECONDES ENTRE DEUX RELECTURES, ET DEUX FILS AU PLUS PAR PASSAGE.
 *
 * Revenir sur l'onglet déclenche `focus` ET `visibilitychange`, souvent à
 * quelques millisecondes d'écart, et ouvrir le panneau juste après en ajoute
 * une troisième. La route de relecture est plafonnée à deux lectures par
 * seconde : sans ce délai, le même retour dépenserait le plafond trois fois
 * pour une réponse qui, écrite par une personne, met des minutes à venir.
 */
const RELECTURE_MIN_MS = 10_000
const FILS_PAR_RELECTURE = 2

export function Assistant({ whatsapp }: { whatsapp: string | null }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [suites, setSuites] = useState<readonly string[]>(PREMIERES_SUITES)
  const [fil, setFil] = useState<string | null>(null)
  /* L'ARBRE ET LA PLACE QU'ON Y OCCUPE. `menu` est `null` tant qu'il n'est
     pas chargé ou s'il est injoignable : le panneau retombe alors sur la
     saisie libre, c'est-à-dire sur l'interface d'avant, qui fonctionne.
     `noeud` à `null` veut dire « le visiteur écrit », pas « pas de menu ». */
  const [menu, setMenu] = useState<MenuAssistant | null>(null)
  const [noeud, setNoeud] = useState<string | null>(null)
  /* L'historique de CET APPAREIL, lu comme l'état externe qu'il est : il vit
     dans le stockage du navigateur et peut changer dans un autre onglet. Le
     serveur garde les fils mais ne sait pas lesquels sont les miens — la
     route est publique. */
  const fils = useSyncExternalStore(abonnerFils, instantaneDesFils, filsCoteServeur)
  const [listeOuverte, setListeOuverte] = useState(false)
  /* LE FORMULAIRE « POSER MA QUESTION À L'ÉQUIPE » : l'identifiant de la bulle
     sous laquelle il est ouvert, ou `null`. Un seul à la fois — deux
     formulaires ouverts sur la même conversation enverraient deux demandes
     pour une même question. */
  const [demande, setDemande] = useState<string | null>(null)
  /* La référence de la dernière demande partie, tant que la confirmation écrite
     par le serveur n'est pas encore dans le fil. Si la relecture échoue, c'est
     la seule trace que le visiteur a de son envoi. */
  const [transmise, setTransmise] = useState<string | null>(null)
  const { session } = useSession()

  const launcher = useRef<HTMLButtonElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const bas = useRef<HTMLDivElement>(null)
  /** Le tour du visiteur qui ouvre l'échange en cours : le fil se cadre sur lui, pas sur le bas. */
  const echange = useRef<string | null>(null)
  /** The request in flight, so the reader can stop it. */
  const enCours = useRef<AbortController | null>(null)
  /** Quand les demandes en attente ont été relues pour la dernière fois. */
  const derniereRelecture = useRef(0)

  const reduced = useReducedMotion()
  const sheet = useMedia('(max-width: 767.98px)')

  /**
   * How many pixels the on-screen keyboard is eating, or 0 when there is none.
   *
   * ANDROID CHROME SHRINKS THE VISUAL VIEWPORT AND LEAVES THE LAYOUT ALONE, so
   * a surface pinned to the bottom of the layout viewport does not move when
   * the keys arrive. Measured at 360 x 640 on the old panel: the composer sat
   * at y=509 with the keys starting around y=370, so the one control this
   * thing exists for was behind the keyboard the moment it was used.
   * `visualViewport` is the only thing that knows. Under 80 pixels of inset
   * there is no keyboard, the state stays 0, and no inline geometry is written.
   */
  const [keyboard, setKeyboard] = useState(0)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    const view = window.visualViewport
    if (!open || !view) return

    const measure = () => {
      const eaten = window.innerHeight - view.height - view.offsetTop
      setKeyboard(eaten < 80 ? 0 : Math.round(eaten))
      setVisible(Math.round(view.height))
    }

    measure()
    view.addEventListener('resize', measure)
    view.addEventListener('scroll', measure)
    return () => {
      view.removeEventListener('resize', measure)
      view.removeEventListener('scroll', measure)
      setKeyboard(0)
    }
  }, [open])

  /* The phone sheet covers the page and brings its own way out, so the page
     behind it must not scroll. The desktop panel covers nothing. */
  useEffect(() => {
    if (!open || !sheet) return
    return lockScroll()
  }, [open, sheet])

  /**
   * UNE QUESTION POSÉE SE CADRE SUR ELLE-MÊME, PAS SUR LE BAS DU FIL.
   *
   * Le fil descendait toujours tout en bas, et le bas n'est plus la réponse :
   * le menu vit sous la dernière bulle. Mesuré à 1440 x 900 sur « Questions
   * fréquentes » : neuf portes font 523 pixels dans un fil qui en montre 561,
   * alors un clic laissait la question au-dessus du cadre, et la réponse
   * arrivait 1 269 pixels plus haut que ce que l'écran montrait — le menu, de
   * nouveau. Une réponse plus haute que le fil, même sans menu, était lue par
   * la fin.
   *
   * La question que le visiteur vient de poser monte donc en haut du fil, et
   * ce qui la suit se lit vers le bas : les points, puis la réponse qui prend
   * leur place, puis le menu. Si la question est si longue que la suite
   * tomberait hors du cadre, c'est le début de la suite qui monte en haut.
   * Tout le reste — un fil repris, une réponse de l'équipe relue — descend
   * au bas, comme avant.
   */
  useEffect(() => {
    const box = thread.current
    if (!open || !box) return
    const behavior = reduced ? 'auto' : 'smooth'
    const tour = echange.current
    const question = tour
      ? box.querySelector<HTMLElement>(`[data-bod-tour="${CSS.escape(tour)}"]`)
      : null
    if (!question) {
      echange.current = null
      bas.current?.scrollIntoView({ behavior, block: 'end' })
      return
    }
    const reponse = messages[messages.findIndex((m) => m.id === tour) + 1]
    const suite = busy
      ? box.querySelector<HTMLElement>('[data-bod-frappe]')
      : reponse
        ? box.querySelector<HTMLElement>(`[data-bod-tour="${CSS.escape(reponse.id)}"]`)
        : null
    box.scrollTo({ top: cadrage(box, question, suite), behavior })
    /* L'échange est clos quand la réponse est là (ou que le visiteur l'a
       arrêtée) : ce qui changera ensuite dans le fil n'est plus à lui. */
    if (!busy) echange.current = null
  }, [messages, busy, open, reduced])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  /**
   * THE THREAD COMES BACK WHEN THE VISITOR DOES.
   *
   * The old panel kept its turns in React state and nowhere else, so a reload
   * wiped the conversation. Coming back to a blank panel after asking four
   * questions is what makes an assistant feel like a search box.
   */
  useEffect(() => {
    if (!open || messages.length > 0) return
    const garde = lireFil()
    if (!garde) return

    const controleur = new AbortController()
    relire(garde, controleur.signal).then((repris) => {
      if (controleur.signal.aborted || !repris) return
      /* Le fil est sous les yeux du visiteur : une réponse de l'équipe qui s'y
         trouve est lue, et la demande qu'elle clôt cesse d'être relue. */
      constaterReponses(garde, repris, true)
      setFil(garde)
      setMessages(repris)
    })
    return () => controleur.abort()
  }, [open, messages.length])

  /* L'ARBRE SE CHARGE UNE FOIS, À LA PREMIÈRE OUVERTURE.
     Il descend en UN appel, et c'est le plafond du backend qui l'impose :
     une question toutes les deux secondes. Naviguer par le réseau ferait
     recevoir un refus au deuxième clic. */
  useEffect(() => {
    if (!open || menu) return
    const controleur = new AbortController()
    lireMenu(controleur.signal).then((arbre) => {
      if (controleur.signal.aborted || !arbre) return
      setMenu(arbre)
      /* On ouvre SUR les portes quand la conversation est vierge, et on
         laisse le fil tranquille quand il y en a une : quelqu'un qui revient
         veut relire sa réponse, pas repartir du sommaire. */
      setNoeud((courant) => courant ?? arbre.racine)
    })
    return () => controleur.abort()
  }, [open, menu])

  /* THE WELCOME IS DRAWN, NOT STORED.
     Putting it in `messages` meant writing state from inside an effect — which
     this repository forbids, and rightly: it makes the first paint depend on a
     render that already happened. An empty thread simply shows the greeting,
     and the first real turn replaces it without anything having to be removed. */
  const fil0 = messages.length === 0 ? [BIENVENUE] : messages

  const close = useCallback(() => {
    setOpen(false)
    launcher.current?.focus()
  }, [])

  /**
   * Escape closes; Tab stays inside the phone sheet.
   *
   * The trap is deliberately only on the phone. There the panel is
   * `aria-modal` and covers the page, so a keyboard leaving it lands on
   * controls the reader cannot see. On a desktop the panel covers nothing, it
   * is not modal, and trapping the keyboard inside a 432-pixel column standing
   * in the corner of a working page would be taking the page hostage.
   */
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab' || !sheet) return
      const root = surface.current
      if (!root) return
      const stops = [
        ...root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea',
        ),
      ]
      if (stops.length === 0) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (!first || !last) return
      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sheet, close])

  /**
   * THE LAUNCHER STAYS WHERE IT IS, AT EVERY POINT OF THE PAGE.
   *
   * It used to step out of the way while the reader scrolled down, and the
   * reason was measured: at 390 x 844 on the home page the 52-pixel disc sat
   * over the « Voir le rayon ordinateurs » link. The client asked the other
   * way round — the assistant must be reachable wherever the reader is — and
   * that is the better trade: a control that vanishes while you read has to be
   * looked for, one that overlaps is covering something that scrolls away from
   * under it a moment later. What must never happen is a control PERMANENTLY
   * under the disc, at the very bottom of the page where nothing scrolls any
   * further; that is handled by the footer's bottom padding, not by hiding.
   *
   * It still leaves on the phone while the sheet is open: the sheet covers that
   * corner and brings its own close button.
   */
  const away = open && sheet

  /**
   * ASKS, AND CAN BE STOPPED.
   *
   * The visitor's turn is added immediately and never waits on the network:
   * seeing your own sentence appear the instant you press send is what makes
   * a thread feel like a conversation rather than a form submission.
   */
  const poser = useCallback(
    async (question: string, choix?: string) => {
      const propre = question.trim()
      if (!propre || busy) return

      enCours.current?.abort()
      const controleur = new AbortController()
      enCours.current = controleur

      setDraft('')
      setBusy(true)
      setSuites([])
      /* ÉCRIRE SORT DE L'ARBRE, et c'est le bon défaut : quelqu'un qui tape
         une phrase a quitté la navigation guidée pour poser SA question. Le
         bouton « Menu » de l'en-tête l'y ramène quand il le veut. Un clic sur
         une entrée, lui, repose le nœud juste après. */
      if (!choix) setNoeud(null)
      const tour = identifiant()
      echange.current = tour
      setMessages((courant) => [
        ...courant,
        { id: tour, auteur: 'visiteur', texte: propre, le: Date.now() },
      ])

      try {
        const reponse = await demander(propre, fil, controleur.signal, choix)
        if (controleur.signal.aborted) return

        if (reponse.fil) {
          setFil(reponse.fil)
          garderFil(reponse.fil)
          noterFil(reponse.fil, propre)
        }
        setMessages((courant) => [
          ...courant,
          {
            id: identifiant(),
            auteur: 'assistant',
            texte: reponse.texte,
            pieces: reponse.pieces,
            le: Date.now(),
          },
        ])
        setSuites(reponse.suites ?? [])
      } catch (erreur) {
        /* An abort is the reader's own doing: they pressed stop, and adding an
           error message would be telling them off for it. */
        if ((erreur as Error).name === 'AbortError') return
        setMessages((courant) => [
          ...courant,
          {
            id: identifiant(),
            auteur: 'assistant',
            texte: HORS_LIGNE,
            pieces: { humain: true },
            le: Date.now(),
          },
        ])
      } finally {
        if (enCours.current === controleur) {
          enCours.current = null
          setBusy(false)
        }
      }
    },
    [busy, fil],
  )

  /**
   * UN CLIC DANS LE MENU. Trois des quatre actions ne touchent pas le réseau
   * — et c'est ce qui rend l'arborescence utilisable sous un plafond d'une
   * requête toutes les deux secondes.
   */
  const surEntree = useCallback(
    (entree: EntreeMenu, depuis: NoeudMenu) => {
      if (entree.action === 'menu' && entree.cible) {
        setNoeud(entree.cible)
        return
      }
      if (entree.action === 'recherche') {
        /* On rend la main au champ : la recherche est déjà ce que le moteur
           fait le mieux, et l'étape du document qui pointait vers l'ancien
           site WooCommerce n'a plus lieu d'être. */
        setNoeud(null)
        field.current?.focus()
        return
      }
      // `fiche` et `humain` : le libellé devient la question, la clé sert de choix.
      void poser(entree.libelle, entree.cible)
      setNoeud(depuis.id)
    },
    [poser],
  )

  /** Ouvre une conversation neuve, sans effacer l'ancienne : elle reste listée. */
  const ouvrirNeuve = useCallback(() => {
    nouvelleConversation()
    setFil(null)
    setDemande(null)
    setTransmise(null)
    setMessages([])
    setSuites(PREMIERES_SUITES)
    setListeOuverte(false)
    setNoeud(menu?.racine ?? null)
  }, [menu])

  /** Reprend une conversation de la liste : le serveur en garde le contenu. */
  const reprendre = useCallback((cible: string) => {
    setListeOuverte(false)
    garderFil(cible)
    marquerLu(cible)
    setFil(cible)
    setDemande(null)
    setTransmise(null)
    setMessages([])
    setNoeud(null)
    relire(cible).then((repris) => {
      if (!repris) return
      constaterReponses(cible, repris, true)
      setMessages(repris)
    })
  }, [])

  const arreter = useCallback(() => {
    enCours.current?.abort()
    enCours.current = null
    setBusy(false)
  }, [])

  /**
   * RELIT LES CONVERSATIONS OÙ UNE QUESTION ATTEND L'ÉQUIPE.
   *
   * PAS DE WEBSOCKET, ET C'EST ASSUMÉ. Une réponse écrite par une personne met
   * des minutes, parfois une journée, et le visiteur l'apprend aussi par e-mail.
   * Une connexion ouverte en permanence pour ça coûterait plus qu'elle ne
   * rendrait ; relire au moment où le visiteur REVIENT — il rouvre le panneau,
   * il repasse sur l'onglet — suffit, parce que c'est le seul moment où il
   * peut la lire.
   *
   * APPELÉE DEPUIS DES GESTIONNAIRES D'ÉVÉNEMENT, JAMAIS DEPUIS LE CORPS D'UN
   * EFFET. Ce qu'elle apprend part d'abord dans le magasin des fils (la
   * pastille « réponse » se dessine par `useSyncExternalStore`) ; seul le fil
   * affiché est reposé dans l'état, et après l'attente du réseau.
   */
  const relireDemandes = useCallback(async () => {
    const maintenant = Date.now()
    if (maintenant - derniereRelecture.current < RELECTURE_MIN_MS) return
    const affiche = lireFil()
    /* Le fil affiché d'abord : c'est le seul dont la réponse change l'écran. */
    const enAttente = filsEnAttente()
      .sort((a, b) => Number(b.fil === affiche) - Number(a.fil === affiche))
      .slice(0, FILS_PAR_RELECTURE)
    if (enAttente.length === 0) return
    derniereRelecture.current = maintenant

    for (const resume of enAttente) {
      const repris = await relire(resume.fil)
      if (!repris) continue
      /* Relu APRÈS l'attente : le visiteur a pu changer de conversation, ou
         fermer le panneau, pendant que la requête voyageait. */
      const toujoursAffiche = lireFil() === resume.fil
      const sousLesYeux = toujoursAffiche && surface.current !== null
      constaterReponses(resume.fil, repris, sousLesYeux)
      /* Jamais pendant une question en vol : la relecture ne connaîtrait pas
         encore le tour que le visiteur vient d'écrire, et l'effacerait. */
      if (toujoursAffiche && !enCours.current) {
        setMessages((courant) => (courant.length > 0 ? fusionnerFil(courant, repris) : courant))
      }
    }
  }, [])

  /* LE RETOUR SUR L'ONGLET. L'effet ne fait qu'abonner : la relecture, et ce
     qu'elle écrit, n'arrivent que lorsque l'événement se produit. */
  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState === 'visible') void relireDemandes()
    }
    document.addEventListener('visibilitychange', auRetour)
    window.addEventListener('focus', auRetour)
    return () => {
      document.removeEventListener('visibilitychange', auRetour)
      window.removeEventListener('focus', auRetour)
    }
  }, [relireDemandes])

  /** Le lanceur ouvre le panneau : la conversation affichée est lue, les demandes relues. */
  const surOuverture = useCallback(() => {
    const affiche = lireFil()
    if (affiche) marquerLu(affiche)
    void relireDemandes()
  }, [relireDemandes])

  /**
   * LA DEMANDE EST PARTIE.
   *
   * La confirmation n'est pas fabriquée ici : le serveur l'a ajoutée au fil, et
   * on relit le fil pour l'afficher telle qu'il l'a enregistrée. Une copie locale
   * pourrait dire « transmise » d'une demande que le serveur a rangée autrement.
   */
  const surDemandeTransmise = useCallback(
    (reference: string, question: string) => {
      setDemande(null)
      setTransmise(reference)
      /* Le bouton qui avait le focus disparaît avec le formulaire : le focus
         va au fil, là où la confirmation arrive, plutôt que se perdre sur la
         page. Pas au champ de saisie : sur un téléphone il ouvrirait le clavier. */
      thread.current?.focus({ preventScroll: true })
      if (!fil) return
      noterDemande(fil, reference, question)
      void relire(fil).then((repris) => {
        if (!repris || lireFil() !== fil) return
        constaterReponses(fil, repris, true)
        setMessages((courant) => fusionnerFil(courant, repris))
      })
    },
    [fil],
  )

  /* UNE RÉPONSE DE L'ÉQUIPE ATTEND QUELQUE PART. Dérivé du magasin des fils,
     donc à jour dès qu'une relecture l'a constatée, dans cet onglet ou un autre. */
  const reponseArrivee = fils.some((f) => f.nonLu)

  /* Le bouton « Poser ma question à l'équipe » n'a de sens que sur une bulle
     postérieure à la dernière demande : au-dessus, la question est déjà partie. */
  const derniereDemande = messages.findLastIndex((m) => m.pieces?.demande !== undefined)
  const confirmee =
    transmise !== null && messages.some((m) => m.pieces?.demande?.reference === transmise)

  const panel = (
    <motion.div
      key="panel"
      ref={surface}
      role="dialog"
      aria-modal={sheet}
      aria-label="Kati, l’assistante KatiMarket"
      initial={reduced ? false : sheet ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={sheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : sheet ? { y: '100%' } : { opacity: 0, y: 8, scale: 0.99 }}
      transition={reduced ? { duration: 0 } : sheet ? SHEET : SPRING}
      style={
        /* Only written when there is a keyboard, and only on the phone: the
           sheet is repinned to the visual viewport so the composer stays above
           the keys instead of behind them. */
        keyboard > 0 && sheet ? { bottom: keyboard, maxHeight: visible - 24 } : undefined
      }
      className="fixed inset-x-0 bottom-0 z-[var(--z-assistant)] flex max-h-[86dvh] flex-col overflow-hidden rounded-t-space bg-paper shadow-[var(--shadow-panel)] ring-1 ring-rule md:inset-x-auto md:right-6 md:bottom-24 md:max-h-[min(84dvh,44rem)] md:w-[27rem] md:rounded-space"
    >
      <span aria-hidden className="block h-[3px] shrink-0 bg-secondary" />

      <header className="flex shrink-0 items-center gap-3 border-b border-rule px-4 py-3 md:px-5">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full shadow-sm">
          <AssistantMark />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body leading-tight font-bold tracking-[-0.01em] text-ink">Kati</span>
          <span className="mt-0.5 block text-micro leading-tight text-ink-3">
            {busy ? 'écrit…' : 'Assistante KatiMarket · disponible 24/7'}
          </span>
        </span>
        {/* DEUX COMMANDES DE CONVERSATION, ET ELLES TIENNENT DANS L'EN-TÊTE.
            « Nouvelle » ferme la courante sans l'effacer — elle reste dans la
            liste. L'horloge ouvre les conversations de CET APPAREIL : le
            serveur les garde toutes, mais il ne sait pas lesquelles sont les
            miennes, la route étant publique. */}
        {menu ? (
          <button
            type="button"
            onClick={() => setNoeud((courant) => (courant ? null : menu.racine))}
            aria-pressed={noeud !== null}
            aria-label={noeud ? 'Masquer le menu' : 'Afficher le menu'}
            title={noeud ? 'Masquer le menu' : 'Afficher le menu'}
            className={`press grid size-10 shrink-0 place-items-center rounded-control transition-colors duration-[var(--t-fast)] ${
              noeud ? 'text-secondary' : 'text-ink-3 hover:text-secondary'
            }`}
          >
            <IconMenu />
          </button>
        ) : null}
        <button
          type="button"
          onClick={ouvrirNeuve}
          aria-label="Nouvelle conversation"
          title="Nouvelle conversation"
          className="press grid size-10 shrink-0 place-items-center rounded-control text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-secondary"
        >
          <IconPlume />
        </button>
        {fils.length > 0 ? (
          <button
            type="button"
            onClick={() => setListeOuverte((ouvert) => !ouvert)}
            aria-expanded={listeOuverte}
            aria-label={
              reponseArrivee
                ? 'Mes conversations — une réponse de l’équipe est arrivée'
                : 'Mes conversations'
            }
            title="Mes conversations"
            className={`press relative grid size-10 shrink-0 place-items-center rounded-control transition-colors duration-[var(--t-fast)] ${
              listeOuverte ? 'text-secondary' : 'text-ink-3 hover:text-secondary'
            }`}
          >
            <IconHistorique />
            {reponseArrivee ? <PastilleReponse className="top-1.5 right-1.5" /> : null}
          </button>
        ) : null}
        <button
          type="button"
          data-bod-close
          onClick={close}
          aria-label="Fermer l’assistant"
          className="press -mr-1.5 grid size-11 shrink-0 place-items-center rounded-control text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-secondary"
        >
          <IconClose className="text-[1.125rem]" />
        </button>
      </header>

      {/* THE THREAD.
          `aria-live="polite"` and not `assertive`: an answer arriving should be
          announced when the reader pauses, not cut across what they are already
          hearing. */}
      <div
        ref={thread}
        data-bod-thread
        aria-live="polite"
        /* Focalisable par le script seulement : c'est là que le focus se pose
           quand le formulaire de demande se referme sur son envoi. */
        tabIndex={-1}
        className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 outline-none md:px-5"
      >
        {listeOuverte ? (
          <div className="rounded-well border border-rule bg-space p-2">
            <p className="t-label px-2 py-1 text-ink-3">Mes conversations</p>
            <ul className="flex flex-col">
              {fils.map((resume) => (
                <li key={resume.fil}>
                  <button
                    type="button"
                    onClick={() => reprendre(resume.fil)}
                    className={`press flex min-h-10 w-full flex-col justify-center rounded-control px-2 text-left transition-colors hover:bg-paper ${
                      resume.fil === fil ? 'text-secondary' : 'text-ink'
                    }`}
                  >
                    <span className="clamp-1 text-small">{resume.titre}</span>
                    <span className="flex items-center gap-1.5 text-micro text-ink-3">
                      {heure(resume.le)}
                      {/* LE SUIVI D'UNE DEMANDE, DISCRET : une ligne de plus,
                          pas un badge. Ce qui compte est qu'on sache OÙ la
                          réponse est arrivée, sans que la liste devienne une
                          boîte de réception. */}
                      {resume.nonLu ? (
                        <>
                          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-secondary" />
                          <span className="font-semibold text-ink-2">Réponse de l’équipe</span>
                        </>
                      ) : resume.attente ? (
                        <span>· en attente de l’équipe</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {fil0.map((message, rang) => {
          /* Le formulaire a besoin d'un fil existant (la demande s'y rattache)
             et ne se propose pas au-dessus d'une demande déjà partie. */
          const peutDemander =
            Boolean(message.pieces?.humain) && fil !== null && rang > derniereDemande
          const formulaire = demande === message.id && fil !== null
          return (
            <Fragment key={message.id}>
              <Bulle
                message={message}
                whatsapp={whatsapp}
                demande={
                  peutDemander
                    ? {
                        ouverte: formulaire,
                        controle: `bod-demande-${message.id}`,
                        basculer: () =>
                          setDemande((courante) => (courante === message.id ? null : message.id)),
                      }
                    : undefined
                }
              />
              {formulaire ? (
                <DemandeEquipe
                  id={`bod-demande-${message.id}`}
                  fil={fil}
                  questionInitiale={derniereQuestionAvant(fil0, rang)}
                  connecte={session !== null}
                  courriel={session?.courriel ?? null}
                  onTransmise={surDemandeTransmise}
                  onAnnuler={() => setDemande(null)}
                />
              ) : null}
            </Fragment>
          )
        })}

        {/* Tant que le serveur n'a pas rendu sa confirmation, la référence
            reçue est dite ici — sinon un fil injoignable juste après l'envoi
            laisserait le visiteur sans aucune trace de sa demande. */}
        {transmise && !confirmee ? (
          <p className="t-label ml-9 text-ink-3">Question transmise à l’équipe · réf. {transmise}</p>
        ) : null}

        {/* LES POINTS AU-DESSUS DU MENU, À LA PLACE DE LA RÉPONSE. Elle
            s'insère sous la dernière bulle, donc au-dessus du menu : dessinés
            sous le menu, ils annonçaient une réponse là où elle n'arrive pas. */}
        {busy ? <Frappe /> : null}

        {/* LE MENU VIT DANS LE FIL, SOUS LA DERNIÈRE BULLE, et il n'entre pas
            dans `messages` : même raison que l'accueil, qui est dessiné et non
            stocké. L'y mettre obligerait à écrire de l'état depuis un effet —
            que ce dépôt interdit — et polluerait le rejeu de tours que
            personne n'a prononcés. */}
        {menu && noeud && !listeOuverte && !demande
          ? (() => {
              const courant = menu.noeuds.find((n) => n.id === noeud)
              return courant ? (
                <MenuGuide
                  noeud={courant}
                  racine={menu.racine}
                  occupe={busy}
                  onEntree={surEntree}
                  onNaviguer={setNoeud}
                />
              ) : null
            })()
          : null}

        {/* The anchor the thread scrolls to when nothing was just asked. A
            zero-height div is enough. */}
        <div ref={bas} />
      </div>

      {/* LES PASTILLES ET LE MENU NE COEXISTENT PAS. Ce sont deux affordances
          du même geste : les pastilles proposent des PHRASES à dire, le menu
          des PORTES à ouvrir. Les montrer ensemble, c'est treize choses à
          lire sous une réponse de trois lignes. Le menu prime quand il est
          ouvert ; dès que le visiteur écrit, il se referme et les pastilles
          reviennent. */}
      {suites.length > 0 && !busy && !noeud && !demande ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-rule px-4 py-2.5 md:px-5">
          {suites.map((suite) => (
            <button
              key={suite}
              type="button"
              onClick={() => poser(suite)}
              className="press inline-flex min-h-11 shrink-0 items-center rounded-pill border border-rule px-3.5 text-micro whitespace-nowrap text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary md:min-h-8"
            >
              {suite}
            </button>
          ))}
        </div>
      ) : null}

      <div className="shrink-0 border-t border-rule bg-paper px-3 py-3 md:px-4">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            poser(draft)
          }}
          className="field flex items-end gap-2 rounded-control border border-rule py-1 pr-1.5 pl-3 transition-colors duration-[var(--t-fast)]"
        >
          <label htmlFor="bod-field" className="sr-only">
            Écrivez votre question : un produit, une panne, la livraison, la garantie…
          </label>
          {/* A TEXTAREA, BECAUSE A QUESTION IS A SENTENCE.
              The single-line input truncated « mon imprimante HP Laserjet fait
              des bourrages depuis la dernière recharge de toner » to whatever
              fitted, and the reader could not see what they had written. It
              grows to five lines and then scrolls. */}
          <textarea
            ref={field}
            id="bod-field"
            rows={1}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              const el = event.target
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
            onKeyDown={(event) => {
              /* Enter sends, Shift+Enter breaks the line: the convention of
                 every messaging app, and the reason a textarea does not make
                 the form harder to submit than an input did. */
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                poser(draft)
              }
            }}
            placeholder="Un produit, une panne, la livraison…"
            autoComplete="off"
            /* 16px on a phone: under that, Safari zooms the whole page when the
               field takes focus, and this field takes focus by itself the
               moment the panel opens. */
            className="max-h-[7.5rem] min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[1rem] leading-snug outline-none placeholder:text-ink-3 md:min-h-9 md:py-2 md:text-small"
          />
          {busy ? (
            <button
              type="button"
              onClick={arreter}
              aria-label="Arrêter la réponse"
              className="press grid size-11 shrink-0 place-items-center self-end rounded-control border border-rule text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space md:size-9"
            >
              <span aria-hidden className="block size-3 rounded-[2px] bg-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              aria-label="Envoyer la question"
              className="press grid size-11 shrink-0 place-items-center self-end rounded-control bg-secondary text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary disabled:pointer-events-none disabled:opacity-25 md:size-9"
            >
              <IconArrowRight className="text-[1.0625rem]" />
            </button>
          )}
        </form>
      </div>
    </motion.div>
  )

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            {sheet ? (
              <motion.button
                key="scrim"
                type="button"
                aria-label="Fermer l’assistant"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="fixed inset-0 z-[var(--z-assistant)] bg-[rgb(20_23_21_/_0.45)] md:hidden"
              />
            ) : null}
            {panel}
          </>
        ) : null}
      </AnimatePresence>

      <motion.button
        ref={launcher}
        type="button"
        data-bod-launcher
        onClick={() => {
          if (!open) surOuverture()
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        aria-hidden={away}
        tabIndex={away ? -1 : undefined}
        aria-label={
          open
            ? 'Fermer l’assistant'
            : reponseArrivee
              ? 'Ouvrir Kati — une réponse de l’équipe vous attend'
              : 'Ouvrir Kati, l’assistante KatiMarket'
        }
        animate={{ y: away ? 88 : 0, opacity: away ? 0 : 1 }}
        transition={reduced ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.28, 1] }}
        whileTap={reduced ? undefined : { scale: 0.96 }}
        style={{ pointerEvents: away ? 'none' : 'auto' }}
        data-assistant-launcher
        className="fixed right-4 bottom-4 z-[var(--z-assistant)] flex h-13 items-center gap-2 overflow-hidden rounded-full bg-[#061f4f] p-1.5 text-white ring-1 ring-[#ffffff33] shadow-[0_14px_38px_#061f4f4d] sm:right-6 sm:bottom-6 md:h-14 md:pr-4"
      >
        <span className="block size-10 shrink-0 md:size-11">
          <AssistantMark />
        </span>
        <span className="hidden text-small font-bold md:block">Besoin d’aide ?</span>
        {/* Panneau fermé, c'est le seul endroit où l'arrivée d'une réponse peut
            se voir. Placée à l'intérieur du cercle : le disque rogne ce qui
            déborde. */}
        {reponseArrivee && !open ? <PastilleReponse className="top-2 right-2" /> : null}
      </motion.button>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* One turn of the conversation                                               */
/* -------------------------------------------------------------------------- */

/**
 * A BUBBLE, AND WHICH SIDE IT SITS ON.
 *
 * The docket printed the question as a bold heading and the answer as blocks
 * underneath, ruled off. It was readable and it had no sender: nothing on
 * screen said who was speaking, and the two halves of an exchange looked like
 * a title and its body rather than two people.
 *
 * The visitor sits right on the shop's accent; Bod sits left on the panel's
 * own quiet ground, with the avatar beside his first line. That is the whole
 * grammar, and it is the grammar every reader already knows.
 */
function Bulle({
  message,
  demande,
  whatsapp,
}: {
  message: Message
  demande?: CommandeDemande
  whatsapp: string | null
}) {
  const deMoi = message.auteur === 'visiteur'
  const equipe = message.auteur === 'equipe' ? message.pieces?.equipe : undefined
  const pieces = message.pieces

  return (
    <div data-bod-tour={message.id} className={`flex gap-2 ${deMoi ? 'justify-end' : 'justify-start'}`}>
      {message.auteur === 'equipe' ? (
        /* UNE PERSONNE, PAS BOD. Le logo de Bod à côté d'une réponse écrite par
           quelqu'un de la boutique ferait croire que l'assistant a fini par
           savoir ; le disque vert de la maison dit qu'un humain a pris la main. */
        <span
          aria-hidden
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[0.625rem] font-bold tracking-[0.02em] text-white"
        >
          KH
        </span>
      ) : !deMoi ? (
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-rule">
          <span className="block size-7">
            <AssistantMark />
          </span>
        </span>
      ) : null}

      <div className={`flex min-w-0 max-w-[85%] flex-col gap-1.5 ${deMoi ? 'items-end' : 'items-start'}`}>
        <div
          className={
            deMoi
              ? 'rounded-well rounded-br-[0.25rem] bg-secondary px-3.5 py-2.5 text-small leading-[1.5] whitespace-pre-wrap text-on-surface'
              : message.auteur === 'equipe'
                ? /* Le filet vert à gauche reprend celui qui coiffe le panneau :
                     la couleur de la maison, portée par une forme, jamais par un
                     fond sous des liens orange qu'elle rendrait illisibles. */
                  'rounded-well rounded-bl-[0.25rem] border border-l-[3px] border-rule border-l-primary bg-paper px-3.5 py-2.5 text-small leading-[1.5] whitespace-pre-wrap text-ink'
                : 'rounded-well rounded-bl-[0.25rem] bg-space px-3.5 py-2.5 text-small leading-[1.5] whitespace-pre-wrap text-ink'
          }
        >
          {message.auteur === 'equipe' ? (
            <p className="t-label mb-1 whitespace-normal text-ink-3">
              Réponse de l’équipe KatiMarket
              {equipe?.reference ? <> · réf. <span className="t-num">{equipe.reference}</span></> : null}
            </p>
          ) : null}
          {/* LE TEXTE D'UNE FICHE PORTE DES LIENS ET DES NUMÉROS. « Où nous
              trouver » contient trois liens Google Maps et six numéros : en
              texte brut, elle demande de recopier un numéro à la main, sur un
              téléphone, devant une boutique qu'on cherche. Une réponse de
              l'équipe aussi — c'est souvent un numéro à rappeler. */}
          {deMoi ? message.texte : <TexteRiche texte={message.texte} />}
        </div>

        {pieces?.produits && pieces.produits.length > 0 ? (
          <ul className="flex w-full flex-col gap-1.5">
            {pieces.produits.map((produit) => (
              <li key={produit.slug}>
                <Article produit={produit} />
              </li>
            ))}
          </ul>
        ) : null}

        {pieces ? <SousLaBulle pieces={pieces} demande={demande} whatsapp={whatsapp} /> : null}

        {/* The hour, not a date: a thread is read in one sitting. `le === 0`
            marks the written welcome, which was never sent by anyone. A team
            reply is signed: the reader knows who to ask for when they call. */}
        {message.le > 0 ? (
          <span className="t-label px-0.5 text-ink-3">
            {equipe?.nom ? `${equipe.nom} · ` : null}
            {heure(message.le)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * WHAT SITS UNDER A BUBBLE: the shop's own footnotes.
 *
 * The sheet Bod answered from, the filters he understood, and the way out to a
 * person. Each one exists so a reader can tell WHY they got this answer — and
 * the filters especially, because a misunderstanding shows up there before it
 * shows up in the products.
 */
function SousLaBulle({
  pieces,
  demande,
  whatsapp,
}: {
  pieces: PiecesReponse
  demande?: CommandeDemande
  /** Read by the layout: this panel lives outside the account provider. */
  whatsapp: string | null
}) {
  const filtres = pieces.filtres
  const marques: string[] = []
  if (filtres?.termes) marques.push(filtres.termes)
  if (filtres?.prixMin !== undefined && filtres.prixMax !== undefined) {
    marques.push(`${formatPrice(filtres.prixMin)} – ${formatPrice(filtres.prixMax)}`)
  } else if (filtres?.prixMax !== undefined) marques.push(`moins de ${formatPrice(filtres.prixMax)}`)
  else if (filtres?.prixMin !== undefined) marques.push(`plus de ${formatPrice(filtres.prixMin)}`)
  if (filtres?.enStock) marques.push('en stock')
  if (filtres?.enPromotion) marques.push('en promotion')

  return (
    <>
      {marques.length > 0 ? (
        <p className="t-label px-0.5 text-ink-3">
          {/* SAYING OUT LOUD WHAT WAS UNDERSTOOD. A reader who asked for « moins
              de 200 000 » and reads « moins de 200 XAF » knows in one glance
              that the sentence was misread, instead of concluding the shop has
              nothing. */}
          Je filtre sur {marques.join(' · ')}
        </p>
      ) : null}

      {pieces.fiche ? (
        <p className="t-label px-0.5 text-ink-3">D’après notre fiche « {pieces.fiche.titre} »</p>
      ) : null}

      {pieces.demande ? (
        <p className="t-label px-0.5 text-ink-3">
          Réf. <span className="t-num">{pieces.demande.reference}</span> · transmise à l’équipe
        </p>
      ) : null}

      {pieces.humain ? (
        /* DEUX CHEMINS VERS UNE PERSONNE, ET UN SEUL EST PRINCIPAL. Écrire à
           l'équipe ici garde la question dans la conversation et la réponse y
           revient ; WhatsApp reste à côté pour qui veut parler tout de suite.
           Sans fil (la boutique était injoignable), la demande n'a rien à quoi
           se rattacher : WhatsApp reste seul. */
        <div className="flex flex-wrap items-center gap-2">
          {demande ? (
            <button
              type="button"
              onClick={demande.basculer}
              aria-expanded={demande.ouverte}
              aria-controls={demande.ouverte ? demande.controle : undefined}
              className={`${classesAction('primary', 'sm')} min-h-11 text-left`}
            >
              Poser ma question à l’équipe
            </button>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsappHref(whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Écrire sur WhatsApp
            </a>
          ) : !demande ? (
            <Link
              href="/contact"
              className="press inline-flex min-h-11 items-center rounded-pill border border-rule px-3.5 text-micro text-ink-2 transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Contacter l’équipe KatiMarket
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

/**
 * ONE PRODUCT, UNDER THE SENTENCE THAT NAMED IT.
 *
 * A struck-through price appears only when it means something. 4 121 of the
 * 4 275 references carry a discount inherited from the old shop, where the
 * struck price was decoration: printing them all would turn « au lieu de »
 * into a verbal tic, and the day a real promotion arrives nobody would see it.
 * The backend applies the same rule the product page does, so a reference
 * cannot be on sale in the chat and full price on its own page.
 */
function Article({ produit }: { produit: ProduitCite }) {
  return (
    <Link
      href={`/marketplace/produits/${encodeURIComponent(produit.slug)}`}
      className="press flex items-center gap-3 rounded-well border border-rule bg-paper p-2 transition-colors duration-[var(--t-fast)] hover:bg-space"
    >
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[0.375rem] bg-space">
        {produit.image ? (
          <Image src={produit.image} alt="" fill sizes="48px" className="object-contain p-1" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="clamp-2 block text-micro leading-snug text-ink">{produit.nom}</span>
        <span className="mt-1 flex items-baseline gap-2">
          <span className="t-num text-small font-semibold text-ink">{formatPrice(produit.prix)}</span>
          {produit.prixReference ? (
            <span className="t-num text-micro text-ink-3 line-through">
              {formatPrice(produit.prixReference)}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  )
}

/* -------------------------------------------------------------------------- */
/* While Bod is writing                                                       */
/* -------------------------------------------------------------------------- */

/**
 * THREE DOTS, AND WHY THEY REPLACED A GREY SKELETON.
 *
 * The docket drew the SHAPE of the answer before it arrived — three empty
 * blocks the right height — so the panel filled rather than shoved. That is
 * the correct answer for a form whose layout is known in advance, and the
 * wrong one for a conversation, where the reader is waiting for a PERSON to
 * finish a sentence and the length is not knowable.
 *
 * The dots are what every messaging app uses, and they mean the one thing that
 * matters here: something is coming, hold on.
 */
function Frappe() {
  const reduced = useReducedMotion()

  return (
    <div data-bod-frappe className="flex gap-2" role="status" aria-label="Kati écrit une réponse">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center overflow-hidden rounded-full">
        <AssistantMark />
      </span>
      <span className="inline-flex items-center gap-1 rounded-well rounded-bl-[0.25rem] bg-space px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="block size-1.5 rounded-full bg-ink-3"
            animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}
            transition={
              reduced ? undefined : { duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }
            }
          />
        ))}
      </span>
    </div>
  )
}

/** Ce que la bulle sait du formulaire de demande qu'elle peut ouvrir. */
interface CommandeDemande {
  readonly ouverte: boolean
  /** L'identifiant du formulaire, pour `aria-controls`. */
  readonly controle: string
  readonly basculer: () => void
}

/**
 * La question à pré-remplir : le dernier tour du visiteur AVANT la bulle qui
 * propose l'équipe. C'est celui auquel l'assistant n'a pas su répondre — pas
 * forcément le dernier du fil, si le bouton est pressé sur une bulle plus haut.
 */
function derniereQuestionAvant(messages: readonly Message[], rang: number): string {
  for (let i = rang - 1; i >= 0; i -= 1) {
    const m = messages[i]
    if (m?.auteur === 'visiteur') return m.texte
  }
  return ''
}

/**
 * OÙ LE FIL DOIT S'ARRÊTER POUR MONTRER UN ÉCHANGE : la question en haut, avec
 * la marge du fil au-dessus d'elle.
 *
 * `suite` est ce qui lui répond, les points puis la réponse. Il doit en rester
 * assez à l'écran pour être lu — les points en entier, le premier tiers du fil
 * d'une longue réponse — sinon c'est le début de la suite qui prend le haut.
 * Le navigateur borne lui-même la valeur : un fil trop court pour monter la
 * question tout en haut s'arrête en bas, où tout est déjà visible.
 */
function cadrage(box: HTMLElement, question: HTMLElement, suite: HTMLElement | null): number {
  const marge = Number.parseFloat(getComputedStyle(box).paddingTop) || 0
  const origine = box.getBoundingClientRect().top - box.scrollTop
  const haut = (element: HTMLElement) => element.getBoundingClientRect().top - origine

  let cible = haut(question) - marge
  if (suite) {
    const debut = haut(suite)
    const lisible = Math.min(suite.offsetHeight, box.clientHeight / 3)
    if (debut + lisible > cible + box.clientHeight - marge) cible = debut - marge
  }
  return Math.max(0, cible)
}

/** Le point orange « une réponse de l'équipe est arrivée ». Décoratif : le libellé du bouton le dit. */
function PastilleReponse({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute size-2.5 rounded-full bg-secondary ring-2 ring-paper ${className}`}
    />
  )
}

/** La bulle KatiMarket : orange de la marketplace, traits bleu nuit, sans asset supplémentaire. */
function AssistantMark() {
  return (
    <svg aria-hidden viewBox="0 0 44 44" className="size-full">
      <circle cx="22" cy="22" r="22" fill="#ff7900" />
      <path d="M11 13.5h22v15H21l-6.5 4.5v-4.5H11z" fill="#fff" />
      <circle cx="17" cy="21" r="1.6" fill="#061f4f" />
      <circle cx="22" cy="21" r="1.6" fill="#061f4f" />
      <circle cx="27" cy="21" r="1.6" fill="#061f4f" />
    </svg>
  )
}

/** Une plume : « écrire une nouvelle conversation ». */
function IconPlume() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[1.125rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 3.5a2.12 2.12 0 0 1 3 3L8 15l-4 1 1-4Z" />
      <path d="M12 5l3 3" />
    </svg>
  )
}

/** Une horloge a rebours : « ce que j'ai deja demande ». */
function IconHistorique() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[1.125rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 1.5" />
    </svg>
  )
}

/** Trois traits : « les portes de l'assistant ». */
function IconMenu() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-[1.125rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <path d="M4 6h12M4 10h12M4 14h8" />
    </svg>
  )
}
