import type { MetadataRoute } from 'next'

import { SITE } from '@/constants/site'

/**
 * LE MANIFESTE, POUR QUE LE SITE S'INSTALLE COMME UNE APPLICATION.
 *
 * POURQUOI CELA COMPTE ICI PLUS QU'AILLEURS. Ce catalogue s'achète depuis un
 * téléphone, sur une connexion comptée au volume, et se rouvre plusieurs fois
 * avant qu'une commande parte. Installé, il s'ouvre depuis l'écran d'accueil
 * sans barre d'adresse, garde sa session, et démarre sur une coquille déjà en
 * cache plutôt que sur un écran blanc.
 *
 * `display: standalone` ET NON `fullscreen`. Une boutique n'est pas un jeu :
 * la barre d'état du téléphone — heure, réseau, batterie — reste visible,
 * parce qu'on consulte un prix entre deux choses et qu'on veut savoir l'heure.
 *
 * LES DEUX MARQUAGES D'ICONE SONT LA PARCE QU'ANDROID DECOUPE. `any` sert
 * l'icône telle quelle ; `maskable` autorise le système à la rogner en cercle
 * ou en goutte selon le lanceur. Déclarer la même image pour les deux est
 * volontaire : le logo tient dans la zone sûre.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — matériel informatique, réseau, sécurité et énergie`,
    short_name: SITE.name,
    description:
      'Plus de 4 000 références en stock à Douala et Yaoundé : informatique, réseau, ' +
      'vidéosurveillance, énergie. Retrait le jour même.',
    start_url: '/',
    /* La portée couvre tout le site : une commande ouverte depuis l'icône doit
       rester dans l'application, y compris la page de paiement. */
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr',
    dir: 'ltr',
    categories: ['shopping', 'business'],
    /* Le fond est celui de la page, pas du blanc arbitraire : l'écran de
       démarrage se confond avec le premier rendu au lieu de clignoter. */
    background_color: '#ffffff',
    /* Le vert de la marque, qui teinte la barre système. Il reste le vert ici
       même si l'orange a pris les boutons : cette couleur-là dit l'identité. */
    theme_color: '#0b5d1e',
    icons: [
      { src: '/icones/nowtech-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/nowtech-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icones/nowtech-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Catalogue', url: '/catalogue' },
      { name: 'Mes commandes', url: '/compte/commandes' },
    ],
  }
}
