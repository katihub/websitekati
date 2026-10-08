import Image from 'next/image'

import { Packshot } from './Packshot'


/**
 * The product well.
 *
 * This component is the whole image strategy in one place, so no grid ever has
 * to reason about it again.
 *
 * The library is 4,215 supplier packshots of wildly uneven crop, resolution and
 * subject scale, and every one of them was shot on white. So the well is white
 * too: the photograph's own background becomes the well, and there is nothing
 * for a seam to appear between. What varies in the source then reads as
 * variation in the product rather than as sloppiness in the page.
 *
 * The well carries the only border in a product grid. Not the card: a hairline
 * round the whole cell boxes the name, the specs and the price along with the
 * photograph, and those three are type, which the page separates with space
 * everywhere else. The picture is the one thing that needs an edge, because a
 * packshot shot on white sitting on a white page has none of its own.
 *
 * The well paints --surface rather than inheriting the page. On a white page
 * that is invisible and looks redundant; in the dark theme it is the whole
 * point, because without it each packshot draws its own white rectangle on a
 * near-black ground.
 *
 * Two rules never bend: the aspect ratio is constant, and the image is
 * contained, never covered. A cover crop decapitates a tower UPS and clips the
 * ports off a 24-port switch, which is exactly the silhouette a buyer scans
 * for.
 *
 * THE HOVER IS ONE PLANE MOVING, NOT TWO EFFECTS FIGHTING. Two things happen
 * when a card is pointed at: the alternate angle is wiped across the first, for
 * the 1 354 products that have one, and the picture pushes in by four per cent.
 * They are put on ONE element on purpose. Both frames sit on a single sheet and
 * the sheet is what scales, so the wipe's edge travels across a picture that is
 * already at its new size rather than across a picture that is still growing
 * under it. If the two images scaled separately, the second would arrive at a
 * different magnification from the one it is replacing, and the wipe would read
 * as a glitch instead of as a decision.
 *
 * THE WIPE OWNS THE HOVER, THE ZOOM ONLY LEANS IN. Four per cent, which is a
 * lean and not a zoom: the well is 250px and the packshot is contained inside
 * it with air on at least two sides, so the picture grows into the air it
 * already had and nothing important reaches the border. The magnifier that
 * actually inspects a product lives on the product page, where there is room
 * for it and where the reader has asked for it.
 *
 * A KEYBOARD GETS THE SAME ANSWER A POINTER GETS. The board behind the well
 * already turns on `:focus-within`, so both halves of the hover answer it too.
 * A reader tabbing through a grid otherwise sees the board move under a
 * photograph that does not, which reads as the card half-responding.
 *
 * The scale is on the `scale` property, never on `transform`. `transform` on
 * this element is already spoken for: `.e-media` is uncovered by a shutter that
 * animates `transform` with `both` fill, so a hover written as
 * `transform: scale()` would be overwritten by the entrance's own final frame
 * and simply never appear.
 */
export function ProductMedia({
  src,
  second = null,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string | null
  /** A second angle, wiped across the first on hover. */
  second?: string | null
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`grid aspect-square place-items-center rounded-well bg-[var(--placeholder)] ${className}`}
      >
        <span className="t-label text-ink-3">Photo à venir</span>
      </div>
    )
  }

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-well border border-rule bg-surface p-2 transition-colors duration-[var(--t-base)] group-hover:border-rule-2 ${className}`}
    >
      {/* The sheet both frames stand on. `inset-0` is the same box the fill
          images occupied before it existed, because an absolutely positioned
          child resolves against the padding box either way, so nothing about
          the framing moves. `motion-safe` carries the reduced-motion guard: a
          reader who has asked for stillness gets the wipe and the lean removed
          and loses nothing, because neither one carries information. */}
      <div className="absolute inset-0 transition-transform duration-[var(--t-base)] ease-brand motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-within:scale-[1.04]">
        {/* A SKELETON THAT MOVES, NOT A STILL FRAME THAT DOES NOT.
            The blur placeholder that used to sit here was measured on a real
            file from this library: 58 per cent near-white, mean rgb(210, 218,
            227), because every one of these 4 215 packshots was shot on white.
            A blurred white square on a white page is indistinguishable from an
            empty cell, so a reader on a slow connection saw a blank card, waited,
            and got a blank card with a product in it. See Packshot for why the
            hook has to be JavaScript. */}
        <Packshot
          src={src}
          alt={alt}
          sizes={sizes}
          priority={priority}
          className="e-media object-contain"
        />
        {second ? (
          // The alternate view is wiped across rather than crossfaded: a fade
          // reads as a loading glitch on a packshot, a wipe reads as a decision.
          // It travels on the shutter's own easing, which is what every other
          // picture on this site is uncovered with. It used to name --t-wipe
          // and --ease-wipe, and NEITHER OF THOSE TOKENS HAS EVER EXISTED: an
          // undefined custom property in `transition-duration` is invalid, the
          // declaration was dropped, and the second angle was appearing whole
          // and instantly on every one of those 1 354 cards.
          <Image
            src={second}
            alt=""
            fill
            sizes={sizes}
            aria-hidden
            className="object-contain [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-[var(--t-base)] ease-[var(--ease-shutter)] motion-safe:group-hover:[clip-path:inset(0_0_0_0)] motion-safe:group-focus-within:[clip-path:inset(0_0_0_0)]"
          />
        ) : null}
      </div>
    </div>
  )
}
