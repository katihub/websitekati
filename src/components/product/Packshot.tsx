'use client'

import Image from 'next/image'
import { useState } from 'react'

/**
 * A product photograph, and what stands in its place until it lands.
 *
 * WHY THIS IS A CLIENT COMPONENT WHEN THE GRID AROUND IT IS NOT. There is no
 * CSS hook for "this image has decoded". The blur placeholder Next ships is one,
 * but it is a still frame, and on this library a still frame is white: every one
 * of these 4 215 packshots was shot on white, so a blurred one is a pale square
 * and a reader on a slow connection sees a white cell, waits, and gets a white
 * cell with a product in it. That is what was shipped, and it read as a card
 * that had failed. A skeleton has to move to say "not yet" rather than "empty".
 *
 * The cost is one hydration boundary per photograph, and it is already paid:
 * every card in this grid already mounts `AddToCart`, which is a client
 * component, so the card is hydrated either way.
 *
 * THE SKELETON IS BEHIND THE PHOTOGRAPH, NOT OVER IT, AND THAT ORDER IS THE
 * WHOLE DESIGN. It was the other way round and the shop caught it: a second
 * visit showed a white cell before the picture even though the picture was in
 * the browser's cache. It was, and this component was holding it. The image was
 * served at `opacity-0` and only allowed to appear once React had hydrated, so
 * the wait a reader saw on every page after the first was not the network, it
 * was our own JavaScript booting on a phone. With scripts off it never appeared
 * at all.
 *
 * So the photograph is opaque from the first byte of HTML and needs nothing to
 * run. A cached one paints in the first frame, exactly like an ordinary `<img>`.
 * A pending one paints nothing yet, and the skeleton underneath shows through
 * the hole until the pixels arrive and cover it. Nothing is gated, nothing
 * fades in late, and the only thing JavaScript still does here is take the
 * skeleton away afterwards.
 *
 * The shimmer is removed on load AND on error. An image that 404s would
 * otherwise shimmer for ever, which is a lie that never stops.
 */
export function Packshot({
  src,
  alt,
  sizes,
  priority = false,
  className = '',
}: {
  src: string
  alt: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const [settled, setSettled] = useState(false)

  return (
    <>
      {settled ? null : (
        // TWO ELEMENTS, AND THE SECOND ONE IS NOT TIDINESS. `.shimmer` declares
        // `position: relative` in globals.css, because its sweeping band is an
        // `::after` and an absolute child needs a positioned parent. Plain CSS
        // outside Tailwind's layers beats a utility, so putting the class and
        // `absolute inset-0` on the same element left it relative, with no
        // content and therefore no size: measured on a throttled connection, 36
        // shimmers in the document and ZERO of them visible, which is exactly
        // the white card the shop reported. The outer span does the filling, the
        // inner one does the shimmering.
        <span aria-hidden className="absolute inset-0 overflow-hidden rounded-[inherit]">
          <span className="shimmer block h-full w-full" />
        </span>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        // THE REF CATCHES THE ONES `onLoad` CANNOT. It fires when the browser
        // finishes decoding, and an image already in cache is finished before
        // React ever attaches the handler: measured on /catalogue, 12 of 24
        // cards never fired it. Asking the element whether it is already
        // `complete` at the moment it is attached catches exactly those, and it
        // runs during commit rather than in an effect, which this repository
        // forbids. It no longer decides whether the reader sees the product,
        // only whether a skeleton is left behind it.
        ref={(node) => {
          if (node?.complete) setSettled(true)
        }}
        onLoad={() => setSettled(true)}
        onError={() => setSettled(true)}
        className={className}
      />
    </>
  )
}
