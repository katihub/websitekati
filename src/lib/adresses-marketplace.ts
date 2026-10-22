/**
 * LES ANCIENNES ADRESSES DU MAGASIN NOWTECH, TRADUITES VERS LA MARKETPLACE.
 *
 * `/categorie/<slug>`, `/rayon/<slug>`, `/marque/<slug>` et `/produit/<slug>`
 * sont des pages de l'ancien catalogue NowTech : sur une base marketplace,
 * elles n'ont rien a montrer. Des liens y menaient encore depuis des endroits
 * visibles — les bannieres de secours de l'accueil, celles saisies dans le
 * panel avant la marketplace, une ligne de panier ancienne. Ils passent ici :
 *
 * - un rayon ou une famille connus vont a la categorie marketplace ou leurs
 *   produits ont ete ranges a la publication du catalogue NowTech ;
 * - les autres familles et rayons, au catalogue complet ;
 * - une marque ou un produit, a la recherche, qui retrouve par les mots.
 *
 * Toute autre adresse est rendue telle quelle.
 */
const CATEGORIES: Readonly<Record<string, string>> = {
  // Rayons de l'ancien catalogue.
  'ordinateurs-accessoires': 'informatique',
  'securite-biometrie': 'securite-surveillance',
  'reseaux-switchs-routeurs': 'informatique-reseau-et-wi-fi',
  'impression-copie-scan': 'informatique-imprimantes-et-scanners',
  'onduleurs-energie': 'maison-et-energie-onduleurs-et-batteries',
  'tv-son-video': 'electronique-televisions',
  'connectiques-adaptateurs': 'informatique-accessoires-informatiques',
  'stockage-disques-nas': 'informatique-stockage',
  'telecom-telephonie': 'informatique-reseau-et-wi-fi',
  'bureautique-atelier': 'informatique-bureautique-et-caisse',
  'telephones-tablettes': 'electronique-telephones-et-smartphones',
  'photo-drones-objets-connectes': 'electronique-photo-et-cameras',
  electromenager: 'electromenager',
  // Familles citees par les bannieres d'origine.
  'televisions-tv-ecrans-plats': 'electronique-televisions',
  'imprimantes-copieurs': 'informatique-imprimantes-et-scanners',
}

const mots = (slug: string) => decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim()

export function adresseMarketplace(href: string): string {
  const ancienne = /^\/(categorie|rayon|marque|produit)\/([^/?#]+)\/?(?:[?#].*)?$/.exec(href)
  if (!ancienne) return href
  const [, genre, slug] = ancienne as unknown as [string, string, string]
  if (genre === 'categorie' || genre === 'rayon') {
    const cible = CATEGORIES[slug]
    return cible ? `/categories/${cible}` : '/catalogue'
  }
  return `/recherche?${new URLSearchParams({ q: mots(slug) })}`
}
