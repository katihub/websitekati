import Image from 'next/image'
import Link from 'next/link'

/**
 * The wordmark.
 *
 * The mark itself now, not a stand-in for it. It was a drawn lozenge and the
 * name set in Poppins, which held the slot honestly while no file existed;
 * `public/logo/now-tech.png` exists, so the drawing is gone. The same file is
 * the favicon and the touch icon, from `src/app/icon.png`.
 *
 * THE NAME BESIDE IT, ON THE PHONE BAR ONLY. The mark contains "NOW TECH", but
 * at 28 pixels those letters cannot be read, and the phone bar is the one
 * place the shop is named in nothing else. The owner asked for the name next to
 * it there: "Now" in the primary green, "Tech" in the secondary orange.
 * `wordmark` draws it; the desktop masthead, where the mark is 40 pixels and
 * sits beside a full search row, keeps the mark alone. The accessible name is
 * unchanged, so the letters are hidden from assistive technology.
 *
 * `tone` is kept because the mark appears on two grounds, the white masthead and
 * the green footer. The artwork is a green disc with white inside it, which sits
 * on white and disappears into the rail, so on the rail it is given a white disc
 * to stand on rather than a second version of the file.
 */
type Tone = 'ink' | 'rail'

export function Logo({
  href = '/',
  tone = 'ink',
  wordmark = false,
  className = '',
}: {
  href?: string | null
  tone?: Tone
  /** Sets « NowTech » after the mark. */
  wordmark?: boolean
  className?: string
}) {
  const mark = (
    <span
      className={`relative block size-[1.75rem] shrink-0 sm:size-9 md:size-10 ${
        tone === 'rail' ? 'rounded-full bg-paper p-0.5' : ''
      }`}
    >
      <Image
        src="/logo/now-tech.png"
        alt=""
        fill
        sizes="40px"
        priority
        className="object-contain"
      />
    </span>
  )

  const content = wordmark ? (
    <>
      {mark}
      <span aria-hidden className="ml-2 text-[1.125rem] leading-none font-bold tracking-[-0.02em]">
        <span className="text-primary">Now</span>
        <span className="text-secondary">Tech</span>
      </span>
    </>
  ) : (
    mark
  )

  const classes = `flex shrink-0 items-center ${className}`

  if (href === null) {
    return (
      <span className={classes} aria-label="NowTech Center">
        {content}
      </span>
    )
  }
  return (
    <Link href={href} className={classes} aria-label="NowTech Center, accueil">
      {content}
    </Link>
  )
}
