import Link from 'next/link'

import { IconBox, IconPhone } from '@/components/brand/Icons'
import { DELIVERY_CITIES, dialable } from '@/constants/site'

/**
 * The counter strip.
 *
 * The thinnest row on the page and the one that decides whether the rest of it
 * gets read. The obstacle in this market is not price and it is not choice, it
 * is the reasonable fear of sending money to a website that may not exist in
 * the physical world, and the answer to that fear is a number that dials, a
 * street you can drive to, and a delivery promise stated before anything is in
 * the basket.
 *
 * It scrolls away and does not come back: the header lifts by exactly this
 * row's height when it pins, so the strip does its work in the first screen and
 * then gives its 36 pixels back to the catalog.
 *
 * The pickup places and the numbers are the panel's counters, read by the
 * masthead. Without them the sentence and the numbers are left out: a street
 * the shop may have closed, or a line nobody answers, is worse than nothing.
 */
/**
 * THE SAME STRIP ON A PHONE, CUT TO WHAT FITS ON ONE LINE.
 *
 * It was left out of the phone entirely, its contents moved to the bottom of
 * the menu, because three numbers, the pickup places and the delivery promise
 * do not fit across 360 pixels. The owner wants the strip back. It keeps the
 * two things a reader can act on from any page: the main line, which dials,
 * and "Devis entreprise". It sits above the sticky header, not inside it, so
 * it scrolls away like the desktop strip does and gives its 32 pixels back.
 */
/**
 * LA BANDE EST ORANGE, PARCE QUE LE PROPRIETAIRE A DEMANDE QUE LE COMPTOIR
 * PASSE EN COULEUR SECONDAIRE.
 *
 * Elle etait `--space`, #f1f3ef, un gris vert a deux pour cent du blanc : la
 * bande la plus fine de la page et la moins visible, alors que c'est elle qui
 * porte les deux choses sur lesquelles un lecteur peut agir depuis n'importe
 * quelle page, un numero qui compose et un devis. En #EA771F elle se lit comme
 * une bande du premier coup d'oeil, et rien d'autre sur la page ne change de
 * couleur.
 *
 * CE QUE LE FOND ORANGE IMPOSE AU TEXTE, MESURE PLUTOT QUE SUPPOSE. Sur
 * #EA771F, le blanc mesure 2,93:1 et le vert primaire 2,75:1 : ni l'un ni
 * l'autre n'est lisible. L'encre de la page, #141715, mesure 6,15:1, au-dessus
 * des 4,5:1 exiges du texte courant et des 3:1 d'un indicateur. Tout ce qui
 * s'ecrit ici est donc a l'encre : les pictogrammes, qui etaient en `--ink-3`
 * et n'y mesureraient que 1,88:1, la ligne de retrait et celle de livraison,
 * qui etaient du meme gris, et « Devis entreprise », qui etait justement en
 * orange et ne pouvait evidemment pas y rester.
 *
 * LE SURVOL NE PEUT PLUS ETRE UNE COULEUR, DONC C'EST UN SOULIGNEMENT. Partout
 * ailleurs sur le site un lien repond au pointeur en passant au vert primaire
 * (`.draw-under`). Sur cette bande ce vert mesure 2,75:1 : l'etat survole
 * serait moins lisible que l'etat au repos, ce qui est l'inverse de ce qu'un
 * survol doit faire. Le trait est tire a `currentColor`, donc a l'encre et a
 * 6,15:1 dans les deux etats, et il ne deplace aucune geometrie.
 *
 * `on-secondary` est ce qui redonne un anneau de focus visible : celui du
 * document est vert, et il serait dessine sans etre vu. Voir globals.css.
 */
export function UtilityBarPhone({ phone }: { phone: string | null }) {
  return (
    <div className="on-secondary bg-secondary md:hidden">
      <div className="shell flex h-8 items-center justify-between gap-4 text-micro text-ink">
        {phone ? (
          <a
            href={`tel:${dialable(phone)}`}
            className="flex items-center gap-2 underline-offset-[3px] hover:underline"
          >
            <IconPhone className="text-[0.875rem]" />
            <span className="t-num">{phone}</span>
          </a>
        ) : (
          <span />
        )}
        <Link href="/devis" className="font-semibold underline-offset-[3px] hover:underline">
          Devis entreprise
        </Link>
      </div>
    </div>
  )
}

export function UtilityBar({
  pickupLine,
  phones,
}: {
  pickupLine: string | null
  phones: readonly string[]
}) {
  return (
    <div className="on-secondary hidden bg-secondary md:block">
      <div className="shell flex h-9 items-center justify-between gap-8 text-micro text-ink">
        <div className="flex items-center gap-7">
          {phones.map((phone) => (
            <a
              key={phone}
              href={`tel:${dialable(phone)}`}
              className="flex items-center gap-2 underline-offset-[3px] hover:underline"
            >
              <IconPhone className="text-[0.875rem]" />
              <span className="t-num">{phone}</span>
            </a>
          ))}
          {pickupLine ? (
            <span className="hidden xl:inline">Retrait le jour même à {pickupLine}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-7">
          <span className="hidden items-center gap-2 lg:flex">
            <IconBox className="text-[0.875rem]" />
            Livraison 24 à 48 h à {DELIVERY_CITIES.join(' et ')}
          </span>
          <Link href="/devis" className="font-semibold underline-offset-[3px] hover:underline">
            Devis entreprise
          </Link>
        </div>
      </div>
    </div>
  )
}
