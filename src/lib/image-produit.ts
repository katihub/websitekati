/**
 * L'IMAGE PRINCIPALE D'UN PRODUIT DANS UNE CARTE OU UN PANIER.
 *
 * La premiere photo publiee, validee par KatiHub. Sans photo, rien : la carte
 * affiche son pictogramme de categorie plutot qu'un visuel qui ne serait pas
 * celui du produit.
 */
export function imageProduit(produit: { nom: string; images?: Array<{ url: string; texteAlternatif: string | null }> }): { url: string; alt: string } | null {
  const photo = produit.images?.[0]
  if (photo) return { url: photo.url, alt: photo.texteAlternatif || produit.nom }
  return null
}
