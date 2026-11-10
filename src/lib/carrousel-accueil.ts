/**
 * LA LOGIQUE DES DEUX CARROUSELS DE L'ACCUEIL (grand bandeau et zone promo).
 *
 * Sans import, pour etre testee par `node --test` sans resolveur d'alias.
 */

/** Le rythme actuel du grand bandeau, repris pour la zone promo. */
export const INTERVALLE_DEFILEMENT_MS = 6500

/**
 * Les pieces reellement publiees dans le panel.
 *
 * `getBanners()` retombe sur les pieces livrees avec le site (servies sous
 * `/branding/`) quand l'API echoue ou ne renvoie rien. Celles-ci ont ete
 * dessinees pour l'ancien site : le grand bandeau prefere alors son propre
 * contenu par defaut plutot que de les afficher.
 */
export function piecesDuPanel<T extends { large: { url: string } }>(pieces: readonly T[]): T[] {
  return pieces.filter((piece) => !piece.large.url.startsWith('/branding/'))
}

/** Une seule image reste fixe ; a partir de deux, elles defilent. */
export function defileAutomatiquement(nombre: number, mouvementReduit: boolean): boolean {
  return nombre >= 2 && !mouvementReduit
}

/** L'indice voisin, en bouclant dans les deux sens. */
export function indiceSuivant(actuel: number, sens: number, nombre: number): number {
  if (nombre <= 0) return 0
  return (((actuel + sens) % nombre) + nombre) % nombre
}
