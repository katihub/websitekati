/**
 * L'IMAGE PRINCIPALE D'UN PRODUIT DANS UNE CARTE OU UN PANIER.
 *
 * La premiere photo publiee, validee par KatiHub. A defaut, le visuel
 * d'illustration du telephone de demonstration, et sinon rien : la carte
 * affiche alors son pictogramme de categorie plutot qu'une image trompeuse.
 */
export function imageProduit(produit: { nom: string; images?: Array<{ url: string; texteAlternatif: string | null }> }): { url: string; alt: string } | null {
  const photo = produit.images?.[0]
  if (photo) return { url: photo.url, alt: photo.texteAlternatif || produit.nom }
  return /samsung.*a15/i.test(produit.nom) ? { url: '/marketplace-telephone-kati.png', alt: `Illustration de ${produit.nom}` } : null
}
