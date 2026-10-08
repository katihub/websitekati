import { AccountMenu } from '@/components/account/AccountMenu'
import { Logo } from '@/components/brand/Logo'
import { CartButton } from './CartButton'
import { RayonBar } from './RayonBar'
import { SearchField } from './SearchField'
import { MobileNav } from './MobileNav'
import { UtilityBar, UtilityBarPhone } from './UtilityBar'
import { lireNavigationOuNull, lirePointsVenteOuVide } from '@/lib/catalogue-en-direct'
import { departementsMenu } from '@/lib/catalogue-vues'
import { pickupLine, shopPhone, shopPhones, shopWhatsapp } from '@/lib/comptoirs'

/**
 * The masthead, in three rows.
 *
 * Counter strip, then the shop and its search, then the departments. That order
 * is the order the three questions arrive in: who are you, what do you have,
 * where do I start.
 *
 * WHAT PINS AND WHY. Three rows is 144 pixels, and pinning all of them would
 * spend a fifth of a phone screen on chrome. The header is therefore sticky at a
 * negative offset equal to its own first row, so that row scrolls out of the way
 * and the rest stays. The row that leaves is different per breakpoint because
 * the row worth keeping is: a desktop reader loses the phone numbers and keeps
 * search and the departments, a phone reader loses the wordmark and keeps search
 * and the departments. Search survives both, which is the point. No JavaScript
 * is involved: the offset is a `top` value and the browser does the rest.
 *
 * The phone layout is not the desktop one shrunk. On a 390px screen a search
 * field sharing a row with a wordmark and a basket is left about 110 pixels,
 * which is a field nobody can read what they typed into, so search takes a row
 * of its own.
 *
 * WHAT THE PHONE ROW COSTS, MEASURED. 56 + 64 + 48 = 168 pixels at rest and 112
 * once the wordmark row has lifted, on a 640-tall Android: 26 per cent of the
 * screen before the first word, 17.5 per cent for the rest of the session. The
 * budget is spent on the three questions and nothing else, so the arithmetic is
 * kept and the pixels inside it are rearranged: the search field grew from 52 to
 * 56 so its submit clears 44 (see SearchField), and the row's own bottom padding
 * gave the four pixels back. The row is 64 before and 64 after.
 *
 * TWO CONTROLS IN THE CORNER, EIGHT PIXELS APART, NOT FOUR. `gap-1` put the
 * account trigger and the basket 4px apart, which is inside the width of a
 * thumb: measured at 360 the two 44px targets sat at x=240 and x=288 with four
 * pixels of paper between them, and the miss lands on the other one. `gap-2` is
 * the same value the row already used from `md` up, so the desktop measures the
 * same 166 and 97 pixel boxes it did before.
 *
 * LE MENU SE REPLIE, IL NE LEVE PAS. `error.tsx` n'enveloppe pas le layout : un
 * en-tete qui leverait quand le backend ne repond pas emporterait tout le site
 * dans la page d'erreur globale, sans style ni navigation. Sans navigation, la
 * barre garde ses sections et la recherche, et perd les rayons et le compteur ;
 * c'est la page qui dit la panne. Sans comptoirs, la phrase du retrait se tait
 * de la meme facon.
 */
export async function Header() {
  const [nav, pointsVente] = await Promise.all([lireNavigationOuNull(), lirePointsVenteOuVide()])
  const pickup = pickupLine(pointsVente)
  const phones = shopPhones(pointsVente)
  const whatsapp = shopWhatsapp(pointsVente)
  const departments = nav ? departementsMenu(nav, 5) : []
  const familyCount = nav?.nombreFamilles ?? null
  const scopes = departments.map((department) => ({
    slug: department.slug,
    label: department.shortName,
  }))

  return (
    <>
      {/* Before the header and not inside it: on a phone the header is pinned
          at the top, and this strip is meant to scroll away. */}
      <UtilityBarPhone phone={shopPhone(pointsVente)} />

      {/* `top-0` on a phone: the bar and the search row are the header, and
          the counter strip above scrolls out before it pins. From `md` the old
          offset returns unchanged, so the desktop still scrolls its counter
          strip away exactly as it did. */}
      <header className="sticky top-0 z-[var(--z-header)] bg-paper md:top-[-2.25rem]">
        <MobileNav departments={departments} pickupLine={pickup} phones={phones} whatsapp={whatsapp} />

        {/* LA RECHERCHE RESTE EPINGLEE SOUS LA BARRE, SUR TELEPHONE. Elle etait
            hors de l'en-tete collant : presente a l'arrivee, partie des qu'on
            defilait. Le proprietaire la veut toujours visible, parce que
            chercher est ce que les visiteurs font le plus ici ; elle coute 60
            pixels sur chaque ecran, et c'est un choix assume.

            `compact` is the placeholder, and only the placeholder: the long one is
            a sentence of 51 characters and a 360px field shows 27 of them, cropped
            mid-word with no ellipsis. See SearchField. */}
        <div id="recherche" className="shell pt-1.5 pb-2.5 md:hidden">
          <SearchField scopes={scopes} whatsapp={whatsapp} compact />
        </div>

        <UtilityBar pickupLine={pickup} phones={phones} />

      <div className="masthead-in shell hidden h-14 items-center gap-6 md:flex md:h-[72px] md:gap-10">
        {/* THE MARK IS 36 PIXELS AND ITS TARGET IS 44. The link was the artwork
            and nothing else, so the one control a reader taps to get home
            measured 36 by 36 on a phone. The box is widened around the mark
            rather than the mark enlarged, and pulled 4px into the gutter so the
            disc stays exactly where it was drawn. From `md` the floor is
            dropped and the link is the 40px mark again, which is what the
            desktop measured before. */}
        <Logo className="-ml-1 min-h-11 min-w-11 justify-center md:ml-0 md:min-h-0 md:min-w-0" />

        <div className="hidden min-w-0 flex-1 md:block">
          <SearchField scopes={scopes} whatsapp={whatsapp} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          {/* Where "Mon devis" stood. The quote is not lost: it is the first row
              of the menu this opens, which is the truer hierarchy, since a list
              of material belongs to somebody. The same link in the counter strip
              above is a different address, "Devis entreprise", and stays. */}
          <AccountMenu />

          <CartButton />
        </div>
      </div>

        {/* The green bar is a desktop object. Its four section links already
            carried `hidden md:flex`, so on a phone it drew a 48 pixel band with
            one button in it and four links measuring zero. Those four now live
            in the panel, where they can be read. */}
        <div className="hidden md:block">
          <RayonBar departments={departments} familyCount={familyCount} />
        </div>
      </header>

    </>
  )
}
