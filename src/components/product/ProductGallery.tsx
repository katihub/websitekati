'use client'

import Image from 'next/image'

import { Packshot } from './Packshot'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'


/**
 * The photographs, at the size the decision is actually made at.
 *
 * WHAT THIS LIBRARY IS. 4 215 supplier packshots, every one shot on white, of
 * wildly uneven crop and resolution. So the well is white too and the image is
 * contained, never covered: a cover crop decapitates a tower UPS and clips the
 * ports off a 24-port switch, which is exactly the silhouette this buyer is
 * scanning for. That rule is the same one the grid follows, and it matters more
 * here, because this is the last picture anyone sees before spending money.
 *
 * ------------------------------------------------------------------------
 * THE COMPOSITION IS TAKEN FROM E-SHOP, AND IT IS THREE DIFFERENT OBJECTS
 * ------------------------------------------------------------------------
 *
 * E-shop's gallery is a sticky index of plates beside the plates themselves on
 * a wide screen, and a swipe rail with a position readout on a phone. Both of
 * those are taken. The middle state is this catalogue's own, because this
 * catalogue's frame is square where E-shop's is 4:5, and a square frame in a
 * narrow column cannot afford to give 88 pixels of its width away.
 *
 *   BELOW md   a snap rail. One packshot fills the shell, the next is swiped
 *              to, and six hairlines say how many there are.
 *   md TO xl   one frame with the thumbnails on a single line beneath it.
 *   xl AND UP  one frame with the thumbnails standing in a column to its left,
 *              which is E-shop's arrangement and the one that reads as a
 *              gallery rather than as a form control under a picture.
 *
 * THE PLATE IS CAPPED AT 480 BETWEEN md AND lg, AND THAT WAS THE WORST NUMBER ON
 * THE PAGE. From 768 to 1023 the page is still ONE column — the spread only
 * splits at lg — so this frame was taking the whole shell and staying square.
 * Measured on the Ideapad before this cap: 653 square at 768, and 765 square at
 * 900. The supplier files behind it are 425 to 576 pixels a side, so at 900 the
 * packshot was being enlarged 1.42 times to fill a white box that then pushed
 * the product's own NAME to y 1186 and the basket button to y 1437, on a screen
 * 900 tall. That is the same failure the phone was rewritten to remove — a
 * screenful of white before the name — reproduced at tablet width, where nobody
 * had looked. 30rem is 480, which sits INSIDE the 425 to 576 band the files
 * actually are, so nothing is enlarged before the reader points at it. The cap
 * is dropped again at lg, where the two-column grid is what limits the frame:
 * 390 at 1024, 624 at 1440. It sits on the component's root so the thumbnail
 * line under the plate is cut to the same 480 and stays a caption on it rather
 * than a rule running past its edge.
 *
 * THE DOM IS THE SAME IN ALL THREE. Every packshot is rendered once; only the
 * flow direction, the order and the visibility change. There is no second
 * component to keep in step and no markup written twice.
 *
 * WHY THE PHONE STOPPED BEING A STACK, MEASURED. At 390 on a 844-pixel screen,
 * the six thumbnails of the Ideapad 3 wrapped onto two rows and drew 332 by 156
 * at y 556. The product's own NAME therefore started at 774, the price at 944
 * and the button at 1090, which is 246 pixels below the fold: the reader met a
 * grid of six near-identical grey laptops before meeting the laptop's name. The
 * rail replaces those 156 pixels with a 13-pixel row of marks. Nothing is lost
 * on the 2 880 references that carry a single photograph, where neither the
 * thumbnails nor the marks are drawn at all.
 *
 * THE INDEX IS ONLY VERTICAL FROM xl, AND THAT IS A MEASUREMENT, NOT A TASTE.
 * The frame is 712 square at 1440 and 576 at 1280, against supplier files that
 * are 425 to 576 pixels a side: at 1440 the packshot is already being enlarged
 * 1.32 times before anyone points at it. Standing the index on the left costs
 * 88 pixels of frame, which takes 1440 to 624 (1.16 times, so slightly sharper)
 * and 1280 to 488 (0.90 times, which is native). Both are good trades. At 1024
 * the same 88 pixels would take a 390-pixel frame to 302, which is 0.56 of the
 * source and the picture would be smaller than the file behind it. So below xl
 * the thumbnails stay under the frame, on one line rather than wrapped.
 *
 * THE SWITCH IS A SHUTTER, NOT A FADE. A crossfade between two packshots on
 * white reads as an image failing to load. The wipe is the same `e-media-shutter`
 * the whole site opens its pictures with, replayed by remounting on the key, so
 * changing angle uses the page's existing vocabulary rather than a second one
 * invented for this component. `motion-safe` carries the reduced-motion guard,
 * so no hook and no client-side media query is needed for it.
 *
 * THE KEY THAT REPLAYS IT IS SWITCHED OFF ON THE RAIL. On a wide screen the
 * chosen packshot's key carries the active index, so choosing it remounts it and
 * the shutter runs; the one leaving is remounted too, behind `display: none`,
 * where nothing is visible. On the rail every packshot is on screen at once and
 * `active` changes with the scroll, so keying on it would remount and re-wipe
 * pictures the reader is in the middle of swiping past. The rail uses the plain
 * url and the pictures hold still.
 *
 * THE THUMBNAILS ONLY EXIST WHEN THERE IS SOMETHING TO CHOOSE. Most products in
 * this export have one photograph; 1 354 have a second. A single thumbnail under
 * a picture is a control that cannot do anything, and drawing one on three
 * quarters of the catalogue would teach readers to ignore the row on the quarter
 * where it works.
 *
 * THE MAGNIFIER IS A READING TOOL, AND ON THIS CATALOGUE IT IS NOT DECORATION.
 * A large part of this stock is a black box whose whole identity is printed
 * small on its own face: the port count along a switch, the legend beside the
 * indicators, the model reference silkscreened on a rack fascia. The packshot
 * carries that detail at a resolution the frame throws away. Pointing at the
 * picture magnifies it 2.3 times around the pointer, so the frame becomes a
 * window that is moved over the photograph rather than a fixed crop of it.
 *
 * WHAT THE MAGNIFIER CAN DO AND WHAT IT CANNOT, MEASURED. The supplier files
 * behind this frame are 425 to 576 pixels square: the eight products sampled
 * off the first page of the catalogue return 540, 540, 425, 540, 540, 540, 540
 * and 576. The frame draws 624 CSS pixels at 1440 once the index is standing
 * beside it, so the photograph is already being enlarged before anyone points at
 * it, and 2.3 times is enlarging an enlargement. This magnifier therefore makes
 * small print BIGGER; it cannot make it SHARPER, because there is no sharper
 * anywhere on the origin. 2.3 is where a control panel legend and a model number
 * crossed from illegible to legible in the frame, and the softness that comes
 * with it is the supplier's file, honestly shown. Nothing here is fixed on this
 * side of the wire: the day the library is re-shot at 1500px, this same number
 * starts resolving detail rather than only enlarging it.
 *
 * NOTHING HERE GOES THROUGH REACT STATE, AND THAT IS A RULE, NOT AN
 * OPTIMISATION. A pointermove is a continuous stream; routing it through
 * `useState` re-renders this component, its images and its thumbnail row on
 * every frame of every mouse movement, to change one number the compositor
 * could have changed alone. The handler writes two custom properties straight
 * onto the frame it is over and the browser does the rest. React re-renders here
 * only when the reader actually chooses another view, which is the only thing
 * that is really state.
 *
 * THE HANDLER READS `currentTarget` RATHER THAN A REF, because there is no
 * longer one frame to hold a ref to. Every packshot is its own frame now, and
 * the frame the pointer is inside is the one the event already names.
 *
 * WHY THE GUARD IS A MEDIA QUERY AND NOT A DEVICE GUESS. The effect exists
 * behind `(hover: hover) and (pointer: fine)`, in CSS and again in the handler.
 * On a touch screen there is no pointer to follow, and a picture that magnifies
 * under the finger holding it is a picture that has swallowed the page's
 * scrolling. On a phone these frames stay frames. That is the honest answer:
 * the alternative is a pinch-zoom viewer nobody asked for, and the browser
 * already has one.
 *
 * AND THE BROWSER'S ONE IS NOT A CONSOLATION HERE, IT IS THE BETTER TOOL,
 * MEASURED. `layout.tsx` declares no `viewport` export, so Next emits
 * `width=device-width, initial-scale=1` with no `maximum-scale` and no
 * `user-scalable=no`: pinch is live on this page. The frame draws 332 CSS
 * pixels at 390 on a screen whose device pixel ratio is 2 or 3, so the
 * photograph is already being painted at 664 to 996 device pixels from a source
 * file that is 425 to 576 across. The reader is looking at an enlargement
 * before touching anything, and there is no detail left on the origin for a
 * second, in-page magnifier to find. A pinch reaches the same ceiling, with the
 * gesture the phone already taught them. That is the answer to "how do I see
 * the small print" on a touch screen, and it costs no code.
 *
 * THE RAIL IS REACHABLE WITHOUT A FINGER. Below md the strip is a scrolling
 * region, and a scrolling region that is not a tab stop is a set of photographs
 * a keyboard cannot reach. It takes `tabIndex` and a `region` role only while it
 * is actually scrolling; from md up it stops scrolling, the attributes are
 * dropped and no dead tab stop is left behind. That answer needs to know the
 * width, and the one hook allowed to know it is `useSyncExternalStore`: a
 * `matchMedia` list is already an external store with a subscribe and a
 * synchronous read, so no effect writes state here and none is needed.
 *
 * The pointer never becomes a way to operate this component: the thumbnails are
 * the control, they are buttons, they are what a keyboard and a screen reader
 * use, and none of them is touched by any of the above.
 */

/** Enough to read a silkscreened reference, little enough to stay a photograph. */
const MAGNIFICATION = 2.3

/* --------------------------------------------------------------------------
   Is the strip a rail? Tailwind's `md` is 48rem, so the rail is everything
   under it. The list is created once per document and shared: a MediaQueryList
   answers `matches` at the moment it is asked, which is exactly the contract
   `useSyncExternalStore` wants, and it costs no render to keep it live.
   -------------------------------------------------------------------------- */
let railQuery: MediaQueryList | null = null

function rail(): MediaQueryList {
  railQuery ??= window.matchMedia('(max-width: 47.99rem)')
  return railQuery
}

function subscribeToRail(onChange: () => void): () => void {
  const list = rail()
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

/** The server has no width. It renders the wide arrangement, which is the one
 *  that needs no extra attributes, so the phone only ever gains them. */
const NOT_A_RAIL = () => false

export function ProductGallery({
  images: brutes,
  name,
}: {
  images: readonly string[]
  name: string
}) {
  /**
   * UNE PHOTO, UNE VIGNETTE. L'export WooCommerce rattache souvent l'image
   * principale une seconde fois dans la galerie : la fiche affichait alors
   * deux vignettes identiques, un compteur « 1/5 » pour quatre photos, et
   * React signalait deux enfants sous la même clé — l'URL. Dédoublonner ici
   * plutôt que dans les données couvre les trois listes de ce composant d'un
   * coup, et vaut pour tout appelant, y compris un futur import.
   *
   * `useMemo` parce que `active` est un index dans ce tableau : le recalculer
   * à chaque rendu de la galerie ouverte reconstruirait la liste à chaque
   * clic de vignette.
   */
  const images = useMemo(() => [...new Set(brutes)], [brutes])

  const [active, setActive] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  // Kept live rather than sampled once: a MediaQueryList answers `matches` at
  // the moment it is asked, so a reader who plugs in a mouse, or turns on
  // reduced motion mid-visit, gets the right answer without a listener and
  // without a re-render.
  const fine = useRef<MediaQueryList | null>(null)
  const still = useRef<MediaQueryList | null>(null)

  const isRail = useSyncExternalStore(subscribeToRail, () => rail().matches, NOT_A_RAIL)

  const track = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const node = event.currentTarget
    fine.current ??= window.matchMedia('(hover: hover) and (pointer: fine)')
    still.current ??= window.matchMedia('(prefers-reduced-motion: reduce)')
    // `pointerType` is the per-event truth; the media queries are the device's.
    // A stylus reports `pen` and is fine and hovering, and it is welcome.
    if (event.pointerType === 'touch' || !fine.current.matches || still.current.matches) return

    const box = node.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    node.style.setProperty('--zoom-x', `${((event.clientX - box.left) / box.width) * 100}%`)
    node.style.setProperty('--zoom-y', `${((event.clientY - box.top) / box.height) * 100}%`)
    node.style.setProperty('--zoom-scale', String(MAGNIFICATION))
  }, [])

  // Only the scale is released. The origin is left where the pointer left it, so
  // the picture settles back along the line it came in on instead of sliding to
  // the centre while it shrinks.
  const release = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--zoom-scale', '1')
  }, [])

  /**
   * Which packshot the rail has come to rest on.
   *
   * Read off the children's own `offsetLeft` rather than divided out of
   * `clientWidth`: the slides are separated by a 16-pixel gap, so a division
   * drifts by one gap per slide and the sixth photograph would report as the
   * fifth. Five elements is nothing to walk, and `setActive` is guarded so a
   * scroll that stays inside one slide re-renders nothing.
   *
   * IT ANSWERS ON THE NEXT FRAME, NOT INSIDE THE EVENT, AND THAT IS A BUG THAT
   * WAS ACTUALLY CAUGHT. A scroll on this strip is not always a finger: anything
   * that changes the layout under a scroll-snapped rail makes the browser
   * re-snap it and fire `scroll`, and it can do that while React is part way
   * through rendering. Reproduced by the capture harness, which resizes the
   * viewport to take a full-page screenshot: React answered with "can't perform
   * a state update on a component that hasn't mounted yet". Hopping to
   * `requestAnimationFrame` takes the update out of the event's own window,
   * where React is entitled to be busy, and coalesces a swipe's worth of scroll
   * events into one read per frame at the same time.
   */
  const pending = useRef(0)

  const follow = useCallback(() => {
    if (pending.current) return
    pending.current = requestAnimationFrame(() => {
      pending.current = 0
      const node = strip.current
      if (!node) return
      let nearest = 0
      let best = Infinity
      for (let index = 0; index < node.children.length; index += 1) {
        const distance = Math.abs((node.children[index] as HTMLElement).offsetLeft - node.scrollLeft)
        if (distance < best) {
          best = distance
          nearest = index
        }
      }
      setActive((current) => (current === nearest ? current : nearest))
    })
  }, [])

  // Cleanup only. Nothing is set here: a frame still queued when the reader
  // navigates away would run against a strip that no longer exists.
  useEffect(
    () => () => {
      if (pending.current) cancelAnimationFrame(pending.current)
    },
    [],
  )

  /* 41 of 4 254 references reached us with no photograph at all. This well used
     to take the frame's own footprint — `aspect-square` with nothing capping it
     — which drew 712 by 712 of empty grey at 1440 and 332 by 332 before the
     name on a phone: the largest object on the page, on the one page with
     nothing to look at. It states the absence instead of reserving room for it.
     352 by 264 says "no photograph" in a quarter of the pixels, and the column
     is then allowed to simply end early, which is what an editorial column does
     when it has run out of things to print. */
  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] max-w-[22rem] place-items-center rounded-well border border-rule bg-[var(--placeholder)]">
        <span className="t-label text-ink-3">Photo à venir</span>
      </div>
    )
  }

  const many = images.length > 1

  return (
    <div className="flex flex-col gap-4 md:max-w-[30rem] lg:max-w-none xl:flex-row xl:items-start xl:gap-4">
      {/* The index. Under the frame until xl, standing beside it after, and
          never drawn on a phone, where the marks under the rail say the same
          thing in 13 pixels instead of 156. */}
      {many ? (
        <div
          role="group"
          aria-label="Autres vues"
          className="no-scrollbar order-2 hidden shrink-0 gap-3 overflow-x-auto md:flex xl:order-none xl:flex-col xl:overflow-visible"
        >
          {images.map((image, index) => {
            const selected = index === active
            return (
              <button
                key={image}
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={selected}
                aria-label={`Vue ${index + 1}`}
                // 72px is the smallest a packshot of a black rack-mount box is
                // still distinguishable at, and it clears the 44px target with
                // room to spare, so no pseudo-element expander is needed here.
                className={`press relative size-[4.5rem] shrink-0 overflow-hidden rounded-[10px] border bg-surface p-1.5 transition-colors duration-[var(--t-fast)] ${
                  selected ? 'border-secondary' : 'border-rule hover:border-ink'
                }`}
              >
                <Image src={image} alt="" fill sizes="72px" className="object-contain" />
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="order-1 min-w-0 flex-1 xl:order-none">
        <div
          ref={strip}
          onScroll={isRail ? follow : undefined}
          {...(isRail && many
            ? { tabIndex: 0, role: 'region' as const, 'aria-label': `Photographies, ${name}` }
            : {})}
          className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto md:block md:gap-0 md:overflow-visible"
        >
          {images.map((image, index) => {
            const selected = index === active
            return (
              <div
                key={image}
                onPointerMove={track}
                onPointerLeave={release}
                // A pointer that goes down on a picture is usually a drag, and a
                // magnified picture is not what a drag should leave behind.
                onPointerDown={release}
                // THE FRAME STAYS SQUARE ON A PHONE AND THE PADDING DOES NOT.
                // Every supplier file behind it is a square canvas, 425 to 576
                // pixels a side, with the product sitting inside it: shorten the
                // frame to 4:3 and a 540 square `contain`s to 229 instead of
                // 306, so the packshot loses a quarter of its size on the screen
                // where it is already smallest. The padding is the part that can
                // go. 20px to 16px hands 8px of width back to the photograph at
                // 360, which is 3% more product and no layout moved at all.
                className={`magnify relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-well border border-rule bg-surface p-4 sm:p-5 md:p-8 ${
                  selected ? 'md:block' : 'md:hidden'
                }`}
              >
                {/* LE MEME PLACEHOLDER QUE LES CARTES, CE QUI N'ETAIT PAS LE
                    CAS. La grille passe par `Packshot`, qui pose un squelette
                    derriere la photographie et le retire quand elle arrive; la
                    fiche produit, elle, montait un `<Image>` nu. Le resultat est
                    exactement ce que le magasin a remarque: les vignettes du
                    catalogue attendent poliment et la fiche, qui affiche la plus
                    grande image du site, restait vide. C'est l'endroit ou
                    l'attente est la plus longue et il etait le seul sans reponse.

                    `Packshot` reçoit ici la classe d'animation telle quelle: le
                    volet joue toujours sur la photographie, et la clef reste sur
                    lui pour que le remontage rejoue le volet sur un vrai choix.
                    Rien du comportement existant ne change, il gagne un fond. */}
                <Packshot
                  // See the head of this file: the active index is in the key on
                  // a wide screen so the shutter replays on a real choice, and
                  // out of it on the rail so a swipe never re-wipes anything.
                  key={!isRail && selected ? `${image}@${active}` : image}
                  src={image}
                  alt={`${name}, photographie ${index + 1} sur ${images.length}`}
                  sizes="(max-width: 767px) 88vw, (max-width: 1279px) 46vw, 44vw"
                  priority={index === 0}
                  className="magnify-subject object-contain motion-safe:[animation:e-media-shutter_var(--e-media)_var(--ease-shutter)_both]"
                />
              </div>
            )
          })}
        </div>

        {/* Position in the rail, phone only. Marks rather than a scrollbar: the
            reader needs to know there is more to the right and how much, not how
            far along a track they are. The count is spelled out beside them
            because six hairlines are a shape, not a number. */}
        {many ? (
          <div className="mt-3 flex items-center gap-2 md:hidden">
            {images.map((image, index) => (
              <span
                key={image}
                aria-hidden
                className={`h-px flex-1 transition-colors duration-[var(--t-base)] ${
                  index === active ? 'bg-ink' : 'bg-rule-2'
                }`}
              />
            ))}
            <span aria-hidden className="t-num ml-1 shrink-0 text-micro text-ink-3">
              {active + 1}/{images.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
