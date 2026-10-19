import type { ComponentType, SVGProps } from 'react'

import type { RayonId } from '@/types/catalogue'

/**
 * The NowTech icon language.
 *
 * Drawn rather than imported, for the same reason the type is: a library set
 * arrives with its own optical sizing, its own corner radius and its own idea
 * of stroke weight, and none of those would agree with an interface built on
 * hairlines, right angles and tabular numerals. Ten glyphs is far less work
 * than reconciling a thousand.
 *
 * The rules, applied without exception:
 *
 *   - 24 x 24 grid, geometry on whole or half pixels
 *   - 1.5px strokes that keep their weight at any rendered size
 *   - square caps and mitre joins, because this shop sells rack ears and
 *     terminal blocks, not soft goods
 *   - open forms only, no fills, no counters
 *
 * Every glyph here is used more than once. Anything needed a single time is
 * drawn inline where it is used rather than promoted into this file.
 */

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function Glyph({ className = '', children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

/** Search. A circle and a shaft on the 45 degree diagonal of the grid. */
export function IconSearch(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </Glyph>
  )
}

/** Recherche visuelle : un objectif dans un boîtier compact. */
export function IconCamera(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 7.5h4l1.5-2h7l1.5 2h4v12H3z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </Glyph>
  )
}

/**
 * The basket. A trapezium rather than a rounded tote: this is a trade counter,
 * and the shape should read closer to a crate than to a shopping bag.
 */
export function IconBasket(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 8h16l-1.5 12h-13z" />
      <path d="M8.5 8V5.5A3.5 3.5 0 0 1 12 2a3.5 3.5 0 0 1 3.5 3.5V8" />
    </Glyph>
  )
}

/** A handset, squared off. Used beside the counter numbers. */
export function IconPhone(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8.5 3H4.5v4a13 13 0 0 0 12.5 12.5h2.5v-4l-4-1.5-2 2.5A11 11 0 0 1 8 9.5L10 7.5z" />
    </Glyph>
  )
}

/** Direction. A long shaft and a bare head, so it reads as travel, not a button. */
export function IconArrowRight(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 12h17" />
      <path d="m14 6 6 6-6 6" />
    </Glyph>
  )
}

/** Disclosure, in a menu or a filter group. */
export function IconChevronDown(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="m5 9 7 7 7-7" />
    </Glyph>
  )
}

/** Drill-down, in a breadcrumb or a mobile category list. */
export function IconChevronRight(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="m9 4 8 8-8 8" />
    </Glyph>
  )
}

/** The menu trigger. Three rules, unequal, so it is not mistaken for a list. */
export function IconMenu(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h12" />
    </Glyph>
  )
}

/** Dismiss. */
export function IconClose(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="m5 5 14 14" />
      <path d="m19 5-14 14" />
    </Glyph>
  )
}

/**
 * A place. The pin is a square standing on a corner rather than the usual
 * teardrop, which keeps it inside the same geometry as everything else.
 */
export function IconPin(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 21.5 5.5 12a8 8 0 1 1 13 0z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Glyph>
  )
}

/** A stock or delivery marker: a crate seen head on. */
export function IconBox(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </Glyph>
  )
}

/** Drill-back, in a carousel. */
export function IconChevronLeft(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M15 4 7 12l8 8" />
    </Glyph>
  )
}

/** The account entry. */
export function IconUser(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </Glyph>
  )
}

/* ==========================================================================
   THE TWELVE DEPARTMENTS

   Each department gets a glyph, and each glyph is the department's own object
   seen straight on: a laptop, a port block, a dome, a tower. Nothing is an
   abstraction of a category and nothing is a metaphor, because a customer
   scanning a twelve-row rail reads silhouettes, not concepts, and a silhouette
   of "computing" does not exist.

   They stay inside the rules at the top of this file. That matters more here
   than anywhere else: twelve marks seen together are the one place where a
   borrowed set would show its own optical sizing and stroke weight against
   everything else on the page.
   ========================================================================== */

/** Ordinateurs: a laptop, lid open, seen from the front. */
function IconLaptop(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 5h14v10H5z" />
      <path d="M2.5 18.5h19" />
    </Glyph>
  )
}

/** Réseaux: a switch chassis and its port block. */
function IconSwitch(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 7.5h19v9h-19z" />
      <path d="M6 12.5v2M9 12.5v2M12 12.5v2M15 12.5v2M18 12.5v2" />
    </Glyph>
  )
}

/** Sécurité: a dome camera under its ceiling plate. */
function IconDome(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 15.5a8 8 0 0 1 16 0" />
      <path d="M2.5 15.5h19" />
      <circle cx="12" cy="12" r="2.5" />
    </Glyph>
  )
}

/** Impression: paper in, body, sheet out. */
function IconPrinter(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M7 3h10v4H7z" />
      <path d="M3 7h18v7H3z" />
      <path d="M7 14h10v7H7z" />
    </Glyph>
  )
}

/** Énergie: a tower UPS, with the one thing it exists to hold. */
function IconTower(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6 2.5h12v19H6z" />
      <path d="m13.5 6.5-4 6h5l-4 6" />
    </Glyph>
  )
}

/** TV & Audio: a flat panel on its stand. */
function IconScreen(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 4h19v12h-19z" />
      <path d="M12 16v4" />
      <path d="M8 20.5h8" />
    </Glyph>
  )
}

/** Connectiques: a plug head and its two pins. */
function IconPlug(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M9 2.5v5M15 2.5v5" />
      <path d="M6 7.5h12v3a6 6 0 0 1-12 0z" />
      <path d="M12 16.5v5" />
    </Glyph>
  )
}

/** Stockage: two drives stacked, each with its activity lamp. */
function IconDrive(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 5.5h18v5H3z" />
      <path d="M3 13.5h18v5H3z" />
      <path d="M6.5 8h.01M6.5 16h.01" />
    </Glyph>
  )
}

/** Télécom: a desk phone, handset above the keypad. */
function IconDeskPhone(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 3.5h15v6h-15z" />
      <path d="M2.5 12h19v8.5h-19z" />
      <path d="M7 15.5h.01M12 15.5h.01M17 15.5h.01" />
    </Glyph>
  )
}

/** Mobiles: a handset. */
function IconMobile(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M6.5 2.5h11v19h-11z" />
      <path d="M10 18.5h4" />
    </Glyph>
  )
}

/** Bureautique: a tool chest with its handle. */
function IconChest(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 8h19v12h-19z" />
      <path d="M8.5 8V4.5h7V8" />
      <path d="M2.5 13.5h19" />
    </Glyph>
  )
}

/**
 * Services & Occasion: the exchange cycle. Two returns rather than a spanner,
 * because this department is as much reconditioned stock coming back in as it
 * is labour going out.
 */
function IconCycle(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 12V9.5A4.5 4.5 0 0 1 8 5h11.5" />
      <path d="m16 1.5 3.5 3.5-3.5 3.5" />
      <path d="M20.5 12v2.5a4.5 4.5 0 0 1-4.5 4.5H4.5" />
      <path d="m8 22.5-3.5-3.5 3.5-3.5" />
    </Glyph>
  )
}

/**
 * The binding. Departments are data, so the glyph has to be reachable from a
 * universe id rather than chosen at each call site.
 */
export const DEPARTMENT_ICON: Readonly<Record<RayonId, ComponentType<IconProps>>> = {
  computing: IconLaptop,
  network: IconSwitch,
  security: IconDome,
  printing: IconPrinter,
  power: IconTower,
  vision: IconScreen,
  connectics: IconPlug,
  storage: IconDrive,
  telecom: IconDeskPhone,
  mobile: IconMobile,
  office: IconChest,
  services: IconCycle,
  // DEUX RAYONS NEUFS, AUCUNE ICONE NEUVE. La maison interdit de dessiner un
  // glyphe de plus: la famille est fermee et un vingt-septieme trace, meme
  // reussi, se voit. `IconBox` pour l electromenager, parce qu un refrigerateur
  // et une machine a laver sont deux grands volumes et que c est exactement ce
  // que le glyphe dit; `IconDome` pour la photo et les drones, parce que
  // l objectif est ce que ces trois familles ont en commun.
  appliance: IconBox,
  smart: IconDome,
}
