/**
 * The designer's banners, and the only artwork the site shows.
 *
 * Five finished pieces, each 14179 x 3000, each carrying its own headline, its
 * own line of copy and the shop's mark inside the picture. The stage therefore
 * sets no type on them and none beside them: a poster that already says
 * "Imprimez sans limites" next to a heading saying the same thing in Poppins is
 * one sentence twice in two voices.
 *
 * WHERE EACH ONE LEADS. To the narrowest true destination, not to the department
 * that happens to contain it. Three of the six show things the catalogue files
 * under `Electromenager/TV/Audio`, and sending all three to that one rayon would
 * make half the carousel a loop back to the same page. The kitchen and the
 * white-goods pieces go to `Electroménager`, the sound-and-picture one to
 * `Télévisions`.
 *
 * THE SET IS WHATEVER `public/branding` HOLDS THAT IS NAMED `Banner *`, AND
 * NOTHING ELSE. The laptop piece was withdrawn from that folder, so it is gone
 * from here too rather than being kept alive by a copy the site had already
 * made of it. `1.1`, `1.2` and `1.3` sit in the same folder and are not
 * banners; they are not named as ones and are not shown.
 *
 * THE PHONE CROP IS DECLARED, NOT GUESSED. `focus` is where the words sit across
 * the width, as a percentage. The phone shows a 16:9 window centred on that
 * point, which is the widest window that still gives a phone real height, and it
 * is per banner because these pieces do not agree: four put the copy on the
 * right, the sound-and-picture one puts it on the left.
 */
export interface Banner {
  /** File in `public/branding/`, extension included. */
  readonly file: string
  /** Where it leads. A category slug, or a rayon slug when no family fits. */
  readonly href: string
  /** Named in the accessible name of its indicator. */
  readonly label: string
  /**
   * What the piece says, for a reader who cannot see it. Not a description of
   * the picture: the offer, because that is the content, and on these pieces it
   * exists only in the pixels.
   */
  readonly alt: string
  /**
   * THE PHONE'S OWN CUT OF THE SAME PIECE, AND ITS ARRIVAL RETIRED A WHOLE
   * MECHANISM. `focus` below exists because the phone used to be shown the wide
   * 4.726:1 artwork through a narrow window, so something had to decide WHICH
   * part of the composition survived; the answer was never good, because a
   * headline that spans 43 per cent of the width cannot be centred inside a
   * window that shows 49. The designer has now supplied each piece recomposed at
   * 3.046:1, so the phone is shown a whole picture and nothing is cropped at all.
   *
   * `focus` is kept and no longer read for the mobile file. It is still the
   * honest record of where the words sit on the wide piece, and it would be
   * needed again the day a sixth banner arrives with no mobile cut.
   */
  readonly mobileFile: string
  /** Where the words sit across the width of the WIDE piece. See `mobileFile`. */
  readonly focus: number
}

export const BANNERS: readonly Banner[] = [
  {
    file: 'banner-1-cuisine.jpg',
    mobileFile: 'mobile/banner-1-cuisine.jpg',
    href: '/categorie/electromenager',
    label: 'Cuisine',
    alt: 'Moins d’effort, plus de plaisir en cuisine. Micro-ondes, blenders et bouilloires chez NowTech Center.',
    focus: 70,
  },
  {
    file: 'banner-3-reseaux.jpg',
    mobileFile: 'mobile/banner-3-reseaux.jpg',
    href: '/rayon/reseaux-switchs-routeurs',
    label: 'Réseaux',
    alt: 'Protégez votre réseau, sécurisez vos données. Solutions de sécurité réseau et licences Cisco et Fortinet.',
    focus: 78,
  },
  {
    file: 'banner-4-tv-audio.jpg',
    mobileFile: 'mobile/banner-4-tv-audio.jpg',
    href: '/categorie/televisions-tv-ecrans-plats',
    label: 'TV et audio',
    alt: 'Le meilleur du son et de l’image. Téléviseurs, barres de son, enceintes et casques.',
    focus: 24,
  },
  {
    file: 'banner-5-electromenager.jpg',
    mobileFile: 'mobile/banner-5-electromenager.jpg',
    href: '/categorie/electromenager',
    label: 'Électroménager',
    alt: 'L’essentiel de l’électroménager. Réfrigérateurs, congélateurs, lave-linge, climatiseurs et ventilateurs.',
    focus: 80,
  },
  {
    file: 'banner-6-impression.jpg',
    mobileFile: 'mobile/banner-6-impression.jpg',
    href: '/categorie/imprimantes-copieurs',
    label: 'Impression',
    alt: 'Imprimez sans limites. Des imprimantes performantes pour la maison et le bureau.',
    focus: 74,
  },
]
