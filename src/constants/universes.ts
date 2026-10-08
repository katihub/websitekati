import type { RayonId } from '@/types/catalogue'

/**
 * Ce que la vitrine decide encore des rayons, et rien de plus.
 *
 * Les noms, les accroches, les slugs et les familles rattachees vivent en base,
 * derriere `GET /v1/catalogue/navigation`. Ce fichier les portait tous quand le
 * catalogue etait compile au build ; un rayon renomme dans le panel restait
 * alors ecrit ici sous son ancien nom. Il ne garde que les deux decisions que la
 * base ne tient pas.
 */

/**
 * L'ordre editorial des rayons, et la liste de ceux que la vitrine sait dessiner.
 *
 * L'ORDRE NE SERT QU'A DEPARTAGER. Les rayons s'affichent le plus fourni
 * d'abord ; a egalite de compte, cet ordre tranche, et c'est celui que le site a
 * toujours suivi (voir `rayonsOrdonnes`). Le backend les rend par nom.
 *
 * LA LISTE SERT DE GARDE. Un rayon ajoute en base sans etre ecrit ici n'a ni
 * icone ni panneau d'accueil : il est ecarte plutot que de faire planter le menu.
 */
export const ORDRE_RAYONS: readonly RayonId[] = [
  'computing',
  'network',
  'security',
  'printing',
  'power',
  'vision',
  'appliance',
  'smart',
  'connectics',
  'storage',
  'telecom',
  'mobile',
  'office',
  'services',
]

/**
 * Which product opens each department on the homepage.
 *
 * These twelve are chosen by eye, and they have to be. Ranking a family by
 * recency opens the department with whatever arrived last, which in this
 * catalogue is routinely a supplier's promotional sheet rather than a product:
 * a Black Friday toolbox collage, a spec banner for a switch, a doorbell advert
 * filed under projectors. No image statistic separates those from a real
 * packshot either, because a phone and a banner are both colourful rectangles.
 *
 * So this is a merchandising decision, held as twelve product ids. It is the
 * only hand-picked content in the entire storefront, and it is deliberate: the
 * twelve doors into the catalogue are worth choosing.
 *
 * No table in the database holds it, so every navigation read sends it along as
 * `photos=` and the backend answers with each product's photograph.
 */
export const DEPARTMENT_HERO_PRODUCT: Readonly<Record<RayonId, number>> = {
  computing: 58494, // Lenovo ThinkBook, three-quarter view
  network: 60021, // Tenda desktop switch
  security: 59781, // Hikvision dome camera
  printing: 60040, // HP LaserJet Pro 3303sdw
  power: 53923, // APC modular tower UPS
  vision: 50734, // Epson projector
  connectics: 47915, // HDMI cable, coiled
  storage: 53275, // Samsung T7 Shield
  telecom: 59266, // Grandstream desk phone
  mobile: 47141, // Galaxy Tab A9
  office: 56198, // Tool chest
  services: 39583, // Reconditioned monitor
  appliance: 47074, // Réfrigérateur LG, porte fermée sur fond blanc
  smart: 41026, // Canon EOS 90D, trois quarts objectif monté
}
