/**
 * The manufacturer logomarks the brand wall can draw.
 *
 * Filled by `scripts/fetch-brand-marks.mjs`, which writes the SVGs into
 * `public/brands/`. Nothing at runtime fetches a logo from anywhere.
 *
 * WHY A LIST AND NOT A GUESS. The wall used to be type, because a hundred
 * manufacturers cannot all be drawn. Marks exist for thirty-three of them, so
 * the wall is the marked brands ranked by the same depth the rest of the site
 * ranks brands by. A brand with no mark is skipped rather than set as a word
 * between two logos: half a wall of type and half a wall of marks reads as a
 * wall that failed to load.
 *
 * THIRTY-THREE IS THE CEILING, NOT A STOPPING POINT, AND IT WAS MEASURED. The
 * 101 brand names the ingest recovered were checked one by one against Simple
 * Icons' own index, 3 453 entries: 34 exist there, 67 do not. Simple Icons
 * removed most non-free marks in 2024, so Canon, Logitech, Microsoft, Philips,
 * Xerox, Brother, SanDisk, Western Digital, Crucial, Hisense, TCL, BenQ,
 * Transcend, Ricoh, Legrand, Eaton, Tenda, D-Link, Hikvision, APC and HPE are
 * all absent, several of them among the deepest brands this shop carries.
 * Hikvision alone is 266 references. Those are not missing through neglect;
 * there is no free file to fetch, and inventing one is not an option.
 * `/marques` carries all 101 either way, marked or not.
 *
 * WHY EACH ONE CARRIES TWO COLOURS. `official` is the brand's own hex. Several
 * of them are unusable as ink on white: Sony is #ffffff, Zebra is #000000,
 * Synology is a grey that measures 2.1:1. `paint` is therefore the colour
 * actually drawn, which is the official one where it clears 3:1 on paper and
 * the page's own ink where it does not. The rule is applied here, once, rather
 * than guessed at in a component.
 *
 * LE CHAMP S'APPELAIT `hover`, ET IL NE LE PEUT PLUS : IL N'Y A PLUS DE SURVOL.
 * Les marques etaient dessinees a l'encre de la page et ne prenaient leur
 * couleur qu'au passage du pointeur, ce qui veut dire que sur un telephone —
 * la majorite de ce public — elles ne l'ont jamais prise du tout, et que sur un
 * ordinateur il fallait savoir qu'il y avait quelque chose a survoler. Le
 * proprietaire a demande qu'elles soient en couleur d'entree. Le mur est donc
 * peint des l'arrivee, `--mark-ink` a remplace `--mark-hover`, et ce champ
 * porte enfin le nom de ce qu'il fait.
 *
 * XIAOMI ET IMOU GARDENT LEUR COULEUR OFFICIELLE, A LA DEMANDE EXPRESSE. Elles
 * sont les deux seules a etre ici en dessous de la barre des 3:1 : #FF6900
 * mesure 2,89:1 sur blanc et #E89313 2,44:1. La regle ci-dessus les aurait
 * assombries — Xiaomi etait deja ramenee a #C24F00 et Imou carrement a l'encre.
 * La barre ne s'applique pas ici : le mur ecrit le nom de la marque en toutes
 * lettres sous chaque logo, le logo est `aria-hidden`, et un contenu decoratif
 * qui double un texte lisible n'a pas de minimum a tenir. Ce sont les deux
 * seules exceptions, et elles sont demandees.
 */

export interface BrandMark {
  /** Catalog brand name, exactly as the ingest recovered it. */
  readonly brand: string
  /** File in `public/brands/`, without the extension. */
  readonly file: string
  /** The manufacturer's own hex, kept for the record. */
  readonly official: string
  /** What the wall actually draws, at rest and on hover alike. */
  readonly paint: string
}

/** Falls back to the page's ink where a brand colour cannot carry itself. */
const INK = '#141715'

const BRAND_MARKS: readonly BrandMark[] = [
  { brand: 'HP', file: 'hp', official: '#0096D6', paint: '#0096D6' },
  { brand: 'LENOVO', file: 'lenovo', official: '#E2231A', paint: '#E2231A' },
  { brand: 'TP-LINK', file: 'tplink', official: '#4ACBD6', paint: '#1F8C97' },
  { brand: 'LG', file: 'lg', official: '#A50034', paint: '#A50034' },
  { brand: 'MIKROTIK', file: 'mikrotik', official: '#293239', paint: '#293239' },
  { brand: 'DELL', file: 'dell', official: '#007DB8', paint: '#007DB8' },
  { brand: 'EPSON', file: 'epson', official: '#003399', paint: '#003399' },
  { brand: 'UBIQUITI', file: 'ubiquiti', official: '#0559C9', paint: '#0559C9' },
  { brand: 'CISCO', file: 'cisco', official: '#1BA0D7', paint: '#137FAB' },
  { brand: 'PANASONIC', file: 'panasonic', official: '#0049AB', paint: '#0049AB' },
  { brand: 'SEAGATE', file: 'seagate', official: '#6EBE49', paint: '#4A8B2C' },
  { brand: 'SAMSUNG', file: 'samsung', official: '#1428A0', paint: '#1428A0' },
  { brand: 'QNAP', file: 'qnap', official: '#0C2E82', paint: '#0C2E82' },
  { brand: 'TOSHIBA', file: 'toshiba', official: '#FF0000', paint: '#D40000' },
  { brand: 'SYNOLOGY', file: 'synology', official: '#B5B5B6', paint: INK },
  { brand: 'XIAOMI', file: 'xiaomi', official: '#FF6900', paint: '#FF6900' },
  { brand: 'ZEBRA', file: 'zebratechnologies', official: '#000000', paint: INK },
  { brand: 'ACER', file: 'acer', official: '#83B81A', paint: '#5A7F12' },
  { brand: 'SONY', file: 'sony', official: '#FFFFFF', paint: INK },
  { brand: 'NETGEAR', file: 'netgear', official: '#2C262D', paint: '#2C262D' },
  { brand: 'FORTINET', file: 'fortinet', official: '#EE3124', paint: '#EE3124' },
  { brand: 'KASPERSKY', file: 'kaspersky', official: '#006D5C', paint: '#006D5C' },
  { brand: 'INTEL', file: 'intel', official: '#0071C5', paint: '#0071C5' },
  { brand: 'HUAWEI', file: 'huawei', official: '#FF0000', paint: '#FF0000' },
  { brand: 'MSI', file: 'msi', official: '#FF0000', paint: '#FF0000' },
  { brand: 'JBL', file: 'jbl', official: '#FF3300', paint: '#FF3300' },
  { brand: 'APPLE', file: 'apple', official: '#000000', paint: INK },
  { brand: 'ASUS', file: 'asus', official: '#000000', paint: INK },
  { brand: 'GARMIN', file: 'garmin', official: '#000000', paint: INK },
  { brand: 'KINGSTON', file: 'kingstontechnology', official: '#000000', paint: INK },
  { brand: 'LINKSYS', file: 'linksys', official: '#000000', paint: INK },
  { brand: 'IMOU', file: 'imou', official: '#E89313', paint: '#E89313' },
  { brand: 'NIKON', file: 'nikon', official: '#FFE100', paint: INK },
]

export const BRAND_MARK_BY_NAME: ReadonlyMap<string, BrandMark> = new Map(
  BRAND_MARKS.map((mark) => [mark.brand, mark]),
)
