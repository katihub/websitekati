'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DepartmentMenu } from './DepartmentMenu'
import { InstallerApp } from './InstallerApp'
import type { DepartmentNav } from '@/types/catalogue'

/**
 * The department bar.
 *
 * The one saturated band on the page, and it is spent on navigation rather than
 * on a promotion. Everything above it is the shop identifying itself and
 * everything below it is merchandise, so the band reads as the line between
 * the two, which is why it carries the catalog trigger at its head.
 *
 * ON A PHONE IT IS THE TRIGGER AND NOTHING ELSE. It carried a second row under
 * this one, a flickable strip of the twelve departments, and that row cost 44
 * pixels of a sticky header already 204 tall on an 844px screen: a quarter of
 * the phone spent on chrome. The strip also showed one and a half departments
 * out of twelve, which is not navigation, it is a hint that navigation exists.
 * The trigger beside it opens all twelve with their families, so the row was
 * paying rent to say something the button already says better.
 *
 * WHY THIS IS A CLIENT COMPONENT, AND IT IS THE ONLY REASON. A bar of sections
 * that never says which section you are in is a list of links, not navigation.
 * Marking the current one needs the current path, and the current path is only
 * knowable at render time in the client, so the bar takes `usePathname`. It
 * costs nothing worth counting: this file ships four hrefs, four labels and a
 * prefix test, and the panel beside it was already a client component.
 */

/**
 * The four sections, and WHAT EACH ONE OWNS.
 *
 * `owns` is the second half of the answer. A tab that lights on `/marques` and
 * goes out on `/marque/hp` is worse than no tab at all: the reader took one
 * step down inside the same section and the bar told them they had left it. So
 * every section declares the route roots that belong to it, and the match is on
 * whole segments — `pathname === root || pathname.startsWith(root + '/')` —
 * because `/marques` starts with the string `/marque` and a naive prefix test
 * would light both tabs at once.
 *
 * The roots are disjoint by construction, so at most one tab is ever current.
 *
 * TWO ENTRIES LEFT THIS BAR AND FOR THE SAME REASON. "Nouveautés" was
 * `/catalogue?tri=recent`, the catalogue with one of its four orderings
 * applied. "Occasion" was `/rayon/services-occasion`, which is one of the
 * twelve departments, already reachable from "Tous les rayons" beside it and
 * from the catalogue below it. A bar that lists a page, then lists a sort of
 * that page, then lists one of its departments, tells a reader they are three
 * places. Both were the catalogue wearing a different name.
 *
 * "Installation" became "Services" and kept `/services`, because the page is
 * the whole of what the workshop does and not only the installing part.
 */
const SECTIONS = [
  // ACCUEIL OWNS ONLY ITSELF, AND THAT IS NOT A DETAIL. `owns` matches a root or
  // anything under it, and "/" is the prefix of every route on the site: listed
  // like the others it would light up on all of them and the bar would say the
  // reader is on the home page while they read a product sheet. The empty list
  // means "no descendants", and the exact match below is what turns it on.
  { href: '/', label: 'Accueil', owns: [] },
  {
    href: '/catalogue',
    label: 'Catalogue',
    // Everything that is merchandise: the whole listing, the twelve
    // departments, the families under them, a product sheet, and a search
    // result, which is a listing the reader wrote themselves.
    owns: ['/catalogue', '/rayon', '/categorie', '/produit', '/recherche'],
  },
  { href: '/marques', label: 'Marques', owns: ['/marques', '/marque'] },
  { href: '/services', label: 'Services', owns: ['/services'] },
  { href: '/contact', label: 'Nous joindre', owns: ['/contact'] },
] as const

function owns(roots: readonly string[], pathname: string, href: string): boolean {
  // The tab's own address always counts, which is what lets a section declare no
  // descendants at all. Everything else is a root and the routes beneath it.
  if (pathname === href) return true
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
}

/**
 * THE CURRENT TAB AND THE HOVERED TAB MUST NOT DRAW THE SAME MARK.
 *
 * They used to, and that was the whole complaint. `.rail-link` in globals.css
 * draws one 2px line for `:hover`, for `:focus-visible` and for
 * `[aria-current]` alike, so pointing at "Marques" while standing on
 * "Catalogue" produced two identical underlines and no way to tell which one
 * meant "here". Nothing set `aria-current` either, so in practice the bar drew
 * exactly one line: the one under the pointer.
 *
 * The two states are now told apart on three axes at once, which is what makes
 * the answer survive a glance:
 *
 *   CURRENT   a plate, a semibold white label, and a 3px --rail-accent bar that
 *             is simply there. It does not animate, because it is not
 *             answering a gesture.
 *   HOVER     no plate, the label lifts from --rail-ink-2 to white, and a 3px
 *             WHITE bar is drawn in from the leading edge, the same motion
 *             every other link on this site answers with.
 *
 * MEASURED, NOT ASSUMED. On the band, #007a12: the white bar is 5.54:1 and the
 * --rail-accent bar is 4.41:1, both clear of the 3:1 that WCAG 1.4.11 asks of a
 * state indicator. The plate is `black/15`, taking the current tab's ground to
 * #00680f, where white is 7.02:1 and the accent bar over it is 5.59:1. The old
 * --rail-accent was #74e785 at 2.91:1, which is why the hover was reported as
 * invisible: it was under the threshold, and it was the only mark drawn.
 *
 * The bar is 3px rather than 2. Two pixels of a light green, seen for a moment
 * at the bottom edge of a 48px band, is a rendering detail; three is a mark.
 */
const CELL = 'relative flex items-center px-3 text-small whitespace-nowrap lg:px-5'
const BAR = 'pointer-events-none absolute inset-x-0 bottom-0 block h-[3px]'

export function RayonBar({
  departments,
  familyCount,
}: {
  departments: readonly DepartmentNav[]
  /** `null` quand la navigation n'a pas repondu : la phrase se passe du nombre. */
  familyCount: number | null
}) {
  const pathname = usePathname() ?? '/'

  return (
    <div className="on-rail band-in bg-rail text-rail-ink">
      <div className="shell flex h-12 items-stretch">
        <DepartmentMenu departments={departments} familyCount={familyCount} />

        <nav aria-label="Sections" className="hidden items-stretch md:flex">
          {SECTIONS.map((section) => {
            const current = owns(section.owns, pathname, section.href)

            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={current ? 'page' : undefined}
                className={
                  current
                    ? `${CELL} bg-black/15 font-semibold text-rail-ink`
                    : `${CELL} group text-rail-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary`
                }
              >
                {section.label}
                {current ? (
                  <span aria-hidden className={`${BAR} bg-rail-accent`} />
                ) : (
                  <span
                    aria-hidden
                    className={`${BAR} origin-left scale-x-0 bg-rail-ink transition-transform duration-[var(--t-base)] ease-[var(--ease-draw)] group-hover:scale-x-100 group-focus-visible:scale-x-100 motion-reduce:transition-none`}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* LE BOUTON D'INSTALLATION VIT AU BOUT DE LA BANDE, et pas au milieu
            des sections : ce n'est pas une destination du site, c'est une
            action sur le site. `ml-auto` le pousse à droite, où l'oeil ne le
            croise qu'après avoir lu la navigation. Il s'efface tout seul
            quand l'application est déjà installée ou que le navigateur ne
            sait pas l'installer — voir `InstallerApp`. */}
        <div className="ml-auto flex items-stretch">
          <InstallerApp />
        </div>

      </div>

    </div>
  )
}
