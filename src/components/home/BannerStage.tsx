'use client'

import { getImageProps } from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { IconChevronLeft, IconChevronRight } from '@/components/brand/Icons'
import type { PublishedBanner } from '@/lib/banners'

/**
 * The opening: the designer's banners, edge to edge, and nothing else.
 *
 * WHY THE SECTION IS EMPTY APART FROM THE PICTURE. Each of these is a finished
 * piece with its own headline, its own line of copy, its own call to action and
 * the shop's mark already in the pixels. Anything the site adds around them is
 * the same sentence twice in two voices. So there is no heading, no rail, no
 * gutter and no margin: the artwork starts at the left edge of the screen and
 * ends at the right one, and the page begins underneath it.
 *
 * THE WIDE PIECE IS SHOWN AT 4.73:1 AND THERE IS NO OTHER OPTION. At full width
 * that is 305 pixels on a 1440 screen and 406 on a 1920, which is a strip rather
 * than an opening, and a taller box does not fix it: `cover` on a source wider
 * than its frame crops the SIDES, so a 3:1 window ate a quarter of the width and
 * cut "plus de plaisir en cuisine" in half. Height cannot be taken out of a
 * 14179 x 3000 file; it was never in it.
 *
 * The two ways out are the designer's, not the code's: a 3:1 or 21:9 cut of each
 * banner, or a taller hero built from the 1:1 pieces. Until one arrives, the
 * artwork is shown whole, because a cropped headline is worse than a short one.
 *
 * THE MOTION IS NVC'S STUDIO CAROUSEL. Same machine, to the number: a track
 * translated by `index * (100 / length)` on a spring at stiffness 300, damping
 * 30, autoplay every 5 000ms, and an IntersectionObserver that stops the cycle
 * while the section is off screen. A spring rather than an eased curve is the
 * character of it: the strip arrives with weight and settles, which is what
 * makes a poster read as a panel sliding into place rather than as an image
 * being swapped.
 *
 * THE PHONE WINDOW IS 21:9, AND THE ARITHMETIC PICKED IT, NOT TASTE. It was
 * 16:9, which shows 1.78 / 4.726 = 37.6% of the artwork's width. Measured on the
 * five pieces, the headline alone spans between 26% and 43% of that width, so a
 * 37.6% window cut every one of them: "plus de plaisir en cuisin", "Protégez
 * votre ré", "Imprimez Sans Lim". A 21:9 window shows 49.4%, which clears the
 * widest headline (banner 6, 42.7%) with room on both sides, and it is the last
 * window that does: 2:1 shows 42.3% and clips that same piece by 1.9%.
 *
 * AND THE CROP WAS CENTRED ON THE WRONG POINT. `focus` is documented as where
 * the words sit ACROSS THE ARTWORK, but it was handed straight to
 * `object-position`, which under `cover` measures a fraction of the OVERFLOW,
 * not of the image. On the cuisine piece, focus 70 put the window's centre at
 * 62.5% instead of 70% and shaved the last word off the headline. The
 * conversion below is the whole fix: X = (focus - k/2) / (1 - k), where k is the
 * share of the artwork's width the window shows.
 *
 * THE PHONE HAS NO ARROWS AND NEVER HAD A SWIPE, WHICH LEFT IT NO CONTROL AT
 * ALL. THE ARROWS AND THE DOTS ARE THE SAME TWO CONTROLS AT EVERY WIDTH NOW.
 * They were not: the arrows were hidden below sm on the argument that a disc
 * punched into a 130px band is a hole in the artwork, and the dots were inflated
 * to 44px squares to be tappable. The result was a phone carrying a different
 * carousel from the one the shop had designed, with no manual control except
 * five large targets that did not look like a position readout any more. The
 * arrows are 32px on a phone, 40 from sm and 48 from md, and the dots keep six
 * pixels
 * everywhere with a 42px hit area drawn by a pseudo-element, which is how every
 * other small control on this site is made tappable without being made bigger.
 * The old reasoning, kept because it is still the reason the discs are
 * translucent rather than solid: a 48px disc punched into a
 * 154px picture is a hole. But that left five 6px indicators whose hit areas
 * overlapped each other by 24 pixels as the only way to steer, on the one device
 * that cannot hover. So the track now takes a finger: a horizontal drag past 44
 * pixels moves one banner, `touch-action: pan-y` keeps the page scrolling
 * vertically underneath it, and the drag suppresses the click so a swipe never
 * lands on the department page. The indicators become 44px cells on the phone
 * and keep their 6px mark.
 *
 * THE MOUSE DRAGS TOO NOW, AND IT USED TO BE TURNED AWAY AT THE DOOR. The
 * handler opened with `if (event.pointerType === 'mouse') return`, on the
 * reasoning that the desktop already had two arrows and that a click on the
 * artwork has to stay a click. The first half was true and the second half was
 * already solved: the click suppression below is not a touch feature, it reads
 * the same `swiped` flag whatever moved. So the strip takes a cursor exactly as
 * it takes a thumb, which is what anyone who has used a carousel since 2010
 * tries first, and the pointer is captured on the way down so a drag that
 * carries off the edge of the section still lands rather than freezing the strip
 * mid-slide.
 *
 * ONE DIFFERENCE BETWEEN THE TWO, AND IT IS NOT COSMETIC. The axis guard, which
 * hands a gesture steeper than it is wide back to the page, exists because a
 * finger has one movement for two jobs: swiping the strip and scrolling the
 * document. A mouse does not scroll by dragging, so a slightly diagonal pull
 * from a cursor is a swipe with a shaky hand, and cancelling it is the software
 * arguing with the reader. The guard is now a touch's alone.
 *
 * AND THE TOUR HOLDS STILL WHILE ANYONE IS HOLDING THE STRIP. It did not: only
 * a mouse hovering paused the autoplay, so a finger part-way through a swipe
 * could have the panel changed underneath it by the five-second tick, and a
 * cursor dragged past the section's edge fired `pointerleave` and restarted the
 * clock mid-gesture. A hand on the artwork is now its own brake, separate from
 * the hover brake and unaffected by it.
 *
 * AND THE PAUSE IS A MOUSE'S, WHICH IS WHY IT USED TO KILL THE PHONE'S TOUR.
 * `pointerenter` fires for a finger as well as for a cursor, and `pointerleave`
 * does not follow it: a thumb set down on the artwork to scroll the page raised
 * `held` and nothing ever lowered it again. Measured on a 360 screen: the strip
 * sat on banner 1 for eleven seconds after one touch, where two ticks should
 * have taken it to banner 3. A touchscreen has a swipe and needs no brake, so
 * the brake is now a mouse's alone.
 */
const AUTOPLAY_MS = 5000
const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const

/**
 * THE DESIGNER'S CUT ARRIVED, AND IT RETIRED THIRTY LINES OF ARITHMETIC.
 *
 * What stood here was a conversion from a banner's declared `focus` to an
 * `object-position`, plus the three constants it needed: the artwork's own
 * 4.726:1, the 21:9 window a phone was shown it through, and the 0.4937 share of
 * the width that window revealed. It existed for one reason, which the comment at
 * the head of this file stated as a limitation rather than as a design: a
 * 14 179 by 3 000 piece cannot be shown whole on a phone, so something had to
 * choose which half survived, and no choice was good because the headlines span
 * up to 43 per cent of a width the window only showed 49 per cent of.
 *
 * That comment also named the two ways out and said both belonged to the designer
 * and not to the code. One of them has now been taken: each piece has been
 * recomposed at 3.046:1, so the phone is shown a complete picture and nothing is
 * cropped at all. The arithmetic that chose a crop has nothing left to choose,
 * and code kept "in case" is code nobody dares to change. `focus` stays in the
 * constant, unread, as the honest record of where the words sit on the wide
 * piece, and because a sixth banner arriving without a mobile cut would need it
 * back.
 */

/** A drag shorter than this is a tap, not a swipe. */
const SWIPE_MIN = 44
/** Where the strip starts following the hand. Below it, nothing has happened. */
const DECLARE_MIN = 8
/**
 * Where a press stops being a click.
 *
 * IT IS NOT `DECLARE_MIN`, AND THAT COST THE SHOP ITS LINKS. It was: any travel
 * past eight pixels suppressed the click, so a cursor that drifted ten pixels
 * between pressing and releasing navigated nowhere and paged nothing either, and
 * measured on the running page 8 to 43 pixels was a band where the banner simply
 * did not answer. Eight pixels is the right number for "start moving the strip",
 * because the strip should track a hand immediately, and the wrong number for
 * "this person did not mean to click", because hands shake and trackpads slide.
 */
const CLICK_MAX = 16
/** How far the strip follows a finger before it stops giving ground. */
const DRAG_MAX = 110

/**
 * LES BANNIERES ARRIVENT EN PROPRIETE, ELLES NE SONT PLUS IMPORTEES.
 *
 * Elles viennent du backend, lues par la page serveur et mises en cache cinq
 * minutes, avec repli sur les pieces du depot si le VPS ne repond pas. Ce
 * composant reste un client : il n'a jamais eu a savoir d'ou vient la liste,
 * seulement comment la faire defiler.
 *
 * LE CADRE PREND LE RATIO DE LA PREMIERE PIECE, ET C'EST UNE CONTRAINTE DE
 * CARROUSEL, PAS UN RACCOURCI. Toutes les diapositives partagent une piste : si
 * chacune imposait sa hauteur, la piste sauterait a chaque passage. Les
 * dimensions propres a chaque piece servent donc au `srcset`, ou elles decident
 * quelles tailles sont generees, et le cadre suit la premiere. Tant que le
 * designer livre un jeu coherent, personne ne voit la difference ; le jour ou
 * une piece arrive a un autre format, elle est recadree plutot que de faire
 * tressauter la page.
 */
/**
 * DEUX CARROUSELS, UN SEUL RYTHME. Le proprietaire a divise l'ouverture en deux
 * blocs sur la meme rangee, la banniere et la promo, qui changent ensemble,
 * image par image. Il n'y a donc qu'une horloge (`tick`) et qu'un jeu de freins
 * (survol, main posee, choix du lecteur), que les deux pistes lisent.
 *
 * AUCUN RATIO ECRIT EN DUR, C'EST LA CONSIGNE. A partir de 640 px, chaque bloc
 * recoit une part de la largeur egale au rapport largeur/hauteur de sa premiere
 * piece (`flex-grow`, voir `.banner-duo`), et son cadre prend ce meme rapport :
 * deux blocs dont les largeurs sont proportionnelles a leurs rapports ont
 * forcement la meme hauteur. Une promo livree demain dans un autre format
 * redistribue la rangee toute seule. En dessous de 640 px, les blocs
 * s'empilent, chacun en pleine largeur et en `cover`.
 */
export function BannerStage({
  banners,
  promos = [],
}: {
  banners: readonly PublishedBanner[]
  promos?: readonly PublishedBanner[]
}) {
  const [tick, setTick] = useState(0)
  const [visible, setVisible] = useState(false)
  const [held, setHeld] = useState(false)
  // Hovering and holding are two different brakes and they must not share a
  // switch. A cursor dragged past the left edge of the section fires
  // `pointerleave`, which would lift a hover brake while the hand is still down.
  const [holding, setHolding] = useState(false)
  // Once the reader has steered, the strip stops steering itself. A carousel
  // that resumes its own tour four seconds after someone chose a panel is
  // taking the choice back.
  const [taken, setTaken] = useState(false)
  const section = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Off screen, the cycle stops: every step brings a six-megabyte banner into
  // view, and paying for four of them while the reader is three sections down is
  // this component's whole cost spent on nothing.
  useEffect(() => {
    const node = section.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || held || holding || reduced || taken) return
    const timer = window.setInterval(() => setTick((current) => current + 1), AUTOPLAY_MS)
    return () => window.clearInterval(timer)
  }, [visible, held, holding, reduced, taken])

  if (banners.length === 0) return null

  const pick = (next: number) => {
    setTaken(true)
    setTick(next)
  }
  const rapport = (piece: PublishedBanner) => piece.large.largeur / piece.large.hauteur
  const partBanniere = rapport(banners[0]!)
  const partPromo = promos.length > 0 ? rapport(promos[0]!) : 0
  // La part de la largeur d'ecran que chaque bloc occupe a partir de 640 px.
  const vw = (part: number) => Math.round((part / (partBanniere + partPromo)) * 100)

  return (
    <section
      ref={section}
      aria-label="En avant"
      aria-roledescription="carrousel"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHeld(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHeld(false)
      }}
      onFocusCapture={() => setHeld(true)}
      // THE SAME ARRIVAL AS THE GREEN BAND, AND ON A PHONE THAT IS THE
      // WHOLE POINT. `.band-in` paints a surface across the page from its
      // leading edge on load, and until now the one saturated band on the site
      // arrived that way while the artwork above it simply existed. Two
      // openings, two behaviours, on the one screen where they are the only two
      // things visible at once. They are now one gesture.
      className="band-in banner-stage relative w-full overflow-hidden"
    >
      {promos.length === 0 ? (
        <Track
          banners={banners}
          tick={tick}
          reduced={reduced}
          onHold={setHolding}
          onPick={pick}
          sizes="100vw"
          nom="Bannière"
        />
      ) : (
        <div className="banner-duo">
          <div style={{ '--part': partBanniere } as React.CSSProperties}>
            <Track
              banners={banners}
              tick={tick}
              reduced={reduced}
              onHold={setHolding}
              onPick={pick}
              sizes={`(min-width: 640px) ${vw(partBanniere)}vw, 100vw`}
              nom="Bannière"
            />
          </div>
          <div style={{ '--part': partPromo } as React.CSSProperties}>
            <Track
              banners={promos}
              tick={tick}
              reduced={reduced}
              onHold={setHolding}
              onPick={pick}
              sizes={`(min-width: 640px) ${vw(partPromo)}vw, 100vw`}
              nom="Promotion"
            />
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * The strip and its controls.
 *
 * One list on every screen. The desktop holds each piece at its own 4.73:1 and
 * the phone takes a 21:9 window centred on the banner's declared `focus`, which
 * is where its words are. It is declared per banner because these pieces
 * disagree: four put the copy on the right, the sound-and-picture one puts it on
 * the left.
 *
 * THE FINGER IS ON ITS OWN LAYER, AND ON PURPOSE. The paged movement is a
 * spring on the inner track; the drag is a plain translate on the wrapper above
 * it, written straight to the node rather than through state. Twelve renders a
 * second on a 360px Android to move a picture sideways is the kind of cost this
 * audience pays for in dropped frames, and the two transforms compose for free.
 */
function Track({
  banners,
  tick,
  reduced,
  onHold,
  onPick,
  sizes,
  nom,
}: {
  /* La piste recoit la liste plutot que de l'importer. Elle etait le seul autre
     endroit du fichier a lire la constante, et laisser deux composants aller
     chercher la meme donnee par deux chemins differents est la facon la plus
     sure de les voir diverger le jour ou l'un des deux change. */
  banners: readonly PublishedBanner[]
  tick: number
  reduced: boolean | null
  onHold: (holding: boolean) => void
  onPick: (tick: number) => void
  /** La largeur que la piste occupe, pour le choix du fichier par le navigateur. */
  sizes: string
  /** Ce que la piste montre, pour les libelles des fleches : « Bannière », « Promotion ». */
  nom: string
}) {
  const index = tick % banners.length
  // UNE SEULE PIECE NE DEFILE PAS. Des fleches et un point sur une promo unique
  // promettraient un choix qui n'existe pas, et la tirer du doigt ne menerait
  // nulle part.
  const plusieurs = banners.length > 1
  // Le ratio de la piste, pris sur la piece qui ouvre. Voir la note de
  // `BannerStage` : toutes les diapositives partagent une piste, donc une seule
  // hauteur, sans quoi elle sauterait a chaque passage.
  const cadreLarge = `${banners[0]!.large.largeur}/${banners[0]!.large.hauteur}`
  const cadreMobile = `${banners[0]!.mobile.largeur}/${banners[0]!.mobile.hauteur}`
  const layer = useRef<HTMLDivElement>(null)
  const from = useRef<{ x: number; y: number; mouse: boolean; id: number } | null>(null)
  /** Travel has passed `CLICK_MAX`: whatever happens next, it is not a click. */
  const swiped = useRef(false)
  /** The strip is following the hand. */
  const moving = useRef(false)

  const settle = () => {
    const node = layer.current
    if (!node) return
    node.style.transition = ''
    node.style.transform = ''
  }

  const stop = () => {
    from.current = null
    moving.current = false
    onHold(false)
    settle()
  }

  const grab = (event: ReactPointerEvent<HTMLDivElement>) => {
    // The middle and right buttons belong to the browser: one opens the slide in
    // a tab, the other opens a menu, and neither is a drag.
    if (event.pointerType === 'mouse' && event.button !== 0) return
    from.current = {
      x: event.clientX,
      y: event.clientY,
      mouse: event.pointerType === 'mouse',
      id: event.pointerId,
    }
    swiped.current = false
    moving.current = false
    onHold(true)
  }

  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = from.current
    if (!start) return
    // A MOUSE THAT IS NO LONGER PRESSED IS NOT DRAGGING, AND THE STRIP USED TO
    // DISAGREE. If a press ended somewhere this element never heard about, the
    // next bare pass of the cursor over the artwork hauled the strip sideways
    // and left it there. The button state travels on every move; it is cheaper
    // to believe than to reconstruct.
    if (start.mouse && event.buttons === 0) {
      stop()
      return
    }
    const moved = event.clientX - start.x
    const fell = event.clientY - start.y

    if (!moving.current) {
      if (Math.abs(moved) < DECLARE_MIN) return
      // A steeper travel than it is wide belongs to the page, not to the strip.
      // THIS IS A FINGER'S RULE AND ONLY A FINGER'S: a thumb has one movement
      // for two jobs, swiping the strip and scrolling the document, so the strip
      // has to give the ambiguous ones back. A mouse does not scroll by
      // dragging, so a diagonal pull from a cursor is a swipe from an ordinary
      // hand and cancelling it is the software arguing with the reader.
      if (!start.mouse && Math.abs(fell) > Math.abs(moved)) {
        stop()
        return
      }
      moving.current = true
    }

    // CAPTURE AND CLICK SUPPRESSION ARE THE SAME MOMENT, AND SPLITTING THEM
    // BROKE THE LINK. Capture was claimed at `DECLARE_MIN`, where the strip
    // starts following the hand, while the click was only suppressed at
    // `CLICK_MAX`. Between the two, capture had already moved the click's target
    // off the slide's image and onto this container, so a press that travelled
    // ten pixels navigated nowhere while the code believed it was still a click:
    // measured, the click's target came back as DIV with no href. Claiming the
    // pointer is itself the decision that this is no longer a click, so it is
    // made once, here, at the one threshold.
    if (Math.abs(moved) > CLICK_MAX && !swiped.current) {
      swiped.current = true
      // CAPTURE IS THE MOUSE'S ALONE, AND HANDING IT TO A FINGER BROKE THE
      // SWIPE OUTRIGHT. A touch pointer already has capture: the browser pins it
      // to whatever element the finger landed on, which here is the slide's
      // image. Calling `setPointerCapture` on this wrapper TAKES it off that
      // image, and the `lostpointercapture` that fires there bubbles straight
      // back into this same wrapper. Measured as a timeline on a 390px screen:
      // capture moved at 22ms, the strip had followed the thumb by twenty
      // pixels, and at 88ms our own handler read that bubbled event as the
      // gesture ending and cancelled it. Every later move and the release then
      // returned early, so the finger swipe this component already had stopped
      // working the moment the mouse was let in.
      //
      // A mouse has no implicit capture and genuinely needs this, or the events
      // stop the instant the cursor crosses out of a band that is 130 pixels
      // tall and flush to both edges of the window. It is claimed here rather
      // than on the way down because a captured pointer can move the `click`
      // target off the slide's link and onto this container, and that is the
      // shop's navigation traded for a gesture that had not started yet.
      if (start.mouse) event.currentTarget.setPointerCapture(event.pointerId)
    }

    const node = layer.current
    if (!node) return
    node.style.transition = 'none'
    node.style.transform = `translate3d(${Math.max(-DRAG_MAX, Math.min(DRAG_MAX, moved))}px,0,0)`
  }

  // THE RELEASE IS HEARD ON THE WINDOW, BECAUSE ON THIS ELEMENT IT WAS MISSED.
  // `pointerdown` raises the brake and arms the gesture, but capture is only
  // claimed once the drag declares itself, so every press that ends before that
  // released somewhere else: on the dots, on an arrow, below the section, or
  // simply straight down. All three resets lived on the wrapper, so none of them
  // ran. Measured: the autoplay never ticked again for the rest of the visit,
  // and the strip could then be dragged by a cursor with no button held. The
  // window hears every release there is.
  useEffect(() => {
    const end = (event: PointerEvent) => {
      const start = from.current
      if (!start || event.pointerId !== start.id) return
      const moved = event.clientX - start.x
      stop()
      if (Math.abs(moved) < SWIPE_MIN) return
      onPick(moved < 0 ? index + 1 : index - 1 + banners.length)
    }
    const cancel = (event: PointerEvent) => {
      if (from.current && event.pointerId === from.current.id) stop()
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, onPick])

  return (
    <div className="relative">
      <div
        // `touch-pan-y` gives the vertical axis back to the page so the document
        // still scrolls under a thumb. `select-none` is the cursor's equivalent:
        // without it a drag across artwork sweeps a text selection through the
        // slide and the browser paints a highlight over the picture. The two
        // grab cursors are the only affordance a mouse gets, and they are the
        // convention every carousel of this kind has used for fifteen years.
        className="touch-pan-y cursor-grab overflow-hidden select-none active:cursor-grabbing"
        onPointerDown={plusieurs ? grab : undefined}
        onPointerMove={plusieurs ? drag : undefined}
        // The slides are links, so a swipe would otherwise end on a department
        // page. The capture phase is where that click is stopped.
        onClickCapture={(event) => {
          if (!swiped.current) return
          swiped.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <div
          ref={layer}
          className="transition-transform duration-[var(--t-base)] ease-brand"
        >
          <motion.div
            className="flex"
            style={{ width: `${banners.length * 100}%` }}
            animate={{ x: `-${index * (100 / banners.length)}%` }}
            transition={reduced ? { duration: 0 } : SPRING}
          >
            {banners.map((banner, position) => {
              // LES PIECES NE PASSENT PAS PAR L'OPTIMISEUR, ET C'EST CE QUI LES
              // REND NETTES. `next.config.ts` plafonne les largeurs generees a
              // 1080 px, un plafond pose pour les photos produit : au-dela,
              // l'encodage depassait le budget de Vercel et les fiches tombaient
              // en 502. Une banniere en pleine largeur sur un ecran Retina de
              // 1440 px en demande 2880 : elle etait servie a 1080 et agrandie,
              // et le proprietaire voyait les pixels. Les pieces sont donc
              // servies telles que le panel les a recues, deja a la bonne taille
              // (3840 px pour la large, 1920 pour la mobile).
              const common = { alt: banner.alt, sizes, unoptimized: true }
              // LES DIMENSIONS VIENNENT DU FICHIER, PLUS D'UNE CONSTANTE. Elles
              // etaient ecrites en dur a 14179x3000 et 2400x788, et deux des
              // cinq pieces ne les respectaient pas : la mobile d'Electromenager
              // mesure 2400x775. Next les utilise pour decider quelles largeurs
              // generer, donc une valeur fausse produit un srcset faux.
              const { props: wide } = getImageProps({
                ...common,
                src: banner.large.url,
                width: banner.large.largeur,
                height: banner.large.hauteur,
                priority: position === 0,
              })
              const { props: narrow } = getImageProps({
                ...common,
                src: banner.mobile.url,
                width: banner.mobile.largeur,
                height: banner.mobile.hauteur,
                priority: position === 0,
              })
              return (
              <Link
                key={banner.id}
                href={banner.href}
                inert={position !== index}
                aria-hidden={position !== index}
                draggable={false}
                style={{ width: `${100 / banners.length}%` }}
                // THE GRAB CURSOR HAS TO BE REPEATED HERE, AND MEASURING IS THE
                // ONLY WAY ANYONE FINDS THAT OUT. It is declared on the wrapper
                // above and every slide is an `<a>`, so the browser's own
                // stylesheet sets `cursor: pointer` DIRECTLY on the link, and a
                // declaration that matches an element beats a value it would
                // otherwise inherit, whoever wrote it. Measured on the running
                // page: wrapper `grab`, slide `pointer`. The affordance existed
                // in the source and on no pixel of the screen.
                //
                // Grab rather than pointer, on a link, on purpose: the click
                // still navigates and always will, and every banner already
                // carries its own call to action in the artwork, so what the
                // cursor has left to say is the thing nothing else announces.
                className="relative block shrink-0 cursor-grab active:cursor-grabbing"
              >
                {/* THE PHONE TAKES A SHORTER WINDOW, NOT A TALLER ONE, AND THAT
                    IS THE PART THAT IS EASY TO GET BACKWARDS. These pieces are
                    14 179 by 3 000, which is 4.73:1. `cover` on a source wider
                    than its frame crops the SIDES, so making the band taller
                    shows LESS of the composition, not more: a 16:9 window came
                    out at 219 pixels and 38 per cent, and cut "Moins d'effort"
                    in half. Going the other way pays twice. At 3:1 the band is
                    130 pixels instead of 167 and shows 63 per cent instead of
                    49.

                    A letterbox filled with the blurred picture was tried, which
                    shows the piece whole at any height. It reads as a photograph
                    resting on a smear of itself, and this page has no other
                    blurred surface anywhere. Cropping honestly and keeping the
                    band low is the quieter answer.

                    `objectPosition` carries the banner's declared `focus`, so
                    what survives the crop is the half with the words in it. */}
                {/* LE RATIO EST UNE VARIABLE, ET LE POINT DE RUPTURE DOIT
                    RESTER 640. Il etait ecrit `aspect-[2400/788]
                    sm:aspect-[14179/3000]`, deux classes Tailwind, donc deux
                    valeurs figees a la compilation : impossible des que les
                    pieces viennent de la base. Les deux ratios passent en
                    proprietes personnalisees et `.banner-frame`, dans
                    `globals.css`, bascule de l'une a l'autre a 640px. Ce nombre
                    est le meme que celui du `<source media>` douze lignes plus
                    bas, et les deux DOIVENT rester egaux : pour la largeur ou
                    ils differeraient, le cadre et le fichier affiche ne
                    parleraient pas du meme rapport, et la piece serait etiree
                    ou rognee. */}
                <span
                  className="banner-frame relative block w-full bg-[var(--placeholder)]"
                  style={
                    {
                      '--cadre-mobile': cadreMobile,
                      '--cadre-large': cadreLarge,
                    } as React.CSSProperties
                  }
                >
                  {/* ONE PICTURE ELEMENT, TWO FILES, AND THE BROWSER CHOOSES.
                      `getImageProps` is Next's own answer to art direction, and it
                      is the right tool here for a reason two stacked `Image`s
                      would have got wrong: with `hidden sm:block` both files are
                      in the document, and the one carrying `priority` is fetched
                      whether it will be shown or not. A phone on a metered
                      connection would have paid for a 14 179-pixel-wide desktop
                      banner it never displays. A `<source media>` is decided
                      before a single byte moves.

                      The query is 640px because that is Tailwind's `sm`, and `sm`
                      is where the box changes ratio two lines above. The two have
                      to be the same number, or for one breakpoint's width the
                      frame and the file disagree and the piece is either cropped
                      or letterboxed. */}
                  <picture>
                    <source
                      media="(min-width: 640px)"
                      srcSet={wide.srcSet ?? wide.src}
                      sizes={sizes}
                    />
                    <img
                      {...narrow}
                      alt={banner.alt}
                      draggable={false}
                      className="absolute inset-0 size-full object-cover select-none"
                    />
                  </picture>
                </span>
              </Link>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Manual passage, at the two edges where a hand reaches for it. Quiet: a
          translucent disc that firms up under the pointer, because the artwork is
          what the reader came for and the controls are how they stay with it.
          Hidden from a phone, where the thumb swipes and a 48px disc over the
          picture is a hole punched in it. */}
      {plusieurs ? (
      <>
      <button
        type="button"
        onClick={() => onPick(index - 1 + banners.length)}
        aria-label={`${nom} précédente`}
        className="press absolute top-1/2 left-1.5 z-[1] grid size-8 -translate-y-1/2 place-items-center rounded-full bg-[rgb(255_255_255_/_0.55)] text-ink ring-1 ring-[rgb(20_23_21_/_0.12)] backdrop-blur-[2px] transition-[background-color,transform] duration-[var(--t-base)] ease-brand hover:bg-paper active:scale-95 sm:left-4 sm:size-10 md:left-6 md:size-12"
      >
        <IconChevronLeft className="text-[0.9375rem] sm:text-[1.125rem]" />
      </button>
      <button
        type="button"
        onClick={() => onPick(index + 1)}
        aria-label={`${nom} suivante`}
        className="press absolute top-1/2 right-1.5 z-[1] grid size-8 -translate-y-1/2 place-items-center rounded-full bg-[rgb(255_255_255_/_0.55)] text-ink ring-1 ring-[rgb(20_23_21_/_0.12)] backdrop-blur-[2px] transition-[background-color,transform] duration-[var(--t-base)] ease-brand hover:bg-paper active:scale-95 sm:right-4 sm:size-10 md:right-6 md:size-12"
      >
        <IconChevronRight className="text-[0.9375rem] sm:text-[1.125rem]" />
      </button>

      {/* On the picture, at its foot, centred. Circles rather than bars because
          they sit on artwork: a bar reads as a rule, and this page draws rules
          to mean structure. Six pixels: they are a position readout, not a
          control anyone hunts for, and the arrows beside them are the control.

          A HIT AREA WIDER THAN THE SPACE BETWEEN TWO DOTS IS NOT A HIT AREA,
          IT IS A LOTTERY, AND THIS ROW HELD ONE ON EVERY SCREEN. The dots were
          6px marks 8px apart, a pitch of 14, each carrying a square
          pseudo-element inflated by `-inset-4` to 38px across. Each target
          therefore covered its neighbours, later siblings paint over earlier
          ones, and the row resolved to whichever dot came last. Measured with
          `elementFromPoint` at each dot's OWN centre, at 1440 and at 390 alike:
          Cuisine hit Réseaux, Réseaux hit TV et audio, TV et audio hit
          Électroménager, Électroménager hit Impression. Four of the five
          indicators could not be pressed at all, and pressing the one labelled
          TV et audio brought up Électroménager.

          The fix is arithmetic, not judgement. The gap is 20px, so the pitch is
          26; the target is inflated by 8px a side, so it is 22 across and clears
          its neighbour by 4. It keeps the full 38px of height, which costs
          nothing because there is nothing above or below it. Same mark, same
          size, same behaviour at every width, and each one now answers for
          itself. */}
      <div className="absolute inset-x-0 bottom-4 z-[1] flex items-center justify-center gap-5 md:bottom-5">
        {banners.map((banner, position) => {
          const current = position === index
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => onPick(position)}
              aria-label={banner.label}
              aria-current={current}
              className={`press relative grid size-1.5 place-items-center rounded-full transition-transform duration-[var(--t-base)] ease-brand after:absolute after:-inset-x-2 after:-inset-y-4 after:content-[''] ${
                current ? 'sm:scale-150' : ''
              }`}
            >
              <span
                className={`block size-1.5 rounded-full ring-1 ring-[rgb(20_23_21_/_0.2)] transition-[background-color,transform] duration-[var(--t-base)] ease-brand ${
                  current
                    ? 'scale-150 bg-paper sm:scale-100'
                    : 'bg-[rgb(255_255_255_/_0.5)] hover:bg-paper'
                }`}
              />
            </button>
          )
        })}
      </div>
      </>
      ) : null}
    </div>
  )
}
