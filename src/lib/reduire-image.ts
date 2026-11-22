/**
 * LA PHOTO, REDUITE DANS LE NAVIGATEUR AVANT DE PARTIR.
 *
 * Une photo de telephone pese 3 a 6 Mo ; sur une connexion mobile camerounaise,
 * l'envoyer telle quelle prenait a lui seul plus de temps que l'analyse. A
 * 1 024 pixels de cote, une marque ou une reference reste lisible et le fichier
 * tombe autour de 150 Ko. Le format de sortie est toujours JPEG : une photo
 * HEIC que le navigateur sait lire repart dans un format que le serveur accepte.
 */
export const estHeic = (fichier: File) => /\.(heic|heif)$/i.test(fichier.name) || ['image/heic', 'image/heif'].includes(fichier.type.toLowerCase())

async function convertirHeic(fichier: File): Promise<Blob> {
  const { default: heic2any } = await import('heic2any')
  const resultat = await heic2any({ blob: fichier, toType: 'image/jpeg', quality: 0.94 })
  return Array.isArray(resultat) ? resultat[0]! : resultat
}

export async function reduireImage(fichier: File, cote = 1024, qualite = 0.82): Promise<Blob> {
  const source = estHeic(fichier) ? await convertirHeic(fichier) : fichier
  const image = await createImageBitmap(source)
  try {
    const echelle = Math.min(1, cote / Math.max(image.width, image.height))
    const largeur = Math.max(1, Math.round(image.width * echelle))
    const hauteur = Math.max(1, Math.round(image.height * echelle))
    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const contexte = canvas.getContext('2d')
    if (!contexte) throw new Error('canvas indisponible')
    // Un PNG transparent devient blanc plutot que noir en JPEG.
    contexte.fillStyle = '#fff'
    contexte.fillRect(0, 0, largeur, hauteur)
    contexte.drawImage(image, 0, 0, largeur, hauteur)
    const typeSortie = source.type === 'image/png' || source.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    return await new Promise<Blob>((resoudre, rejeter) => {
      canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('conversion impossible'))), typeSortie, qualite)
    })
  } finally {
    image.close()
  }
}

export type ImagePreparee = { fichier: File; compressee: boolean; convertieHeic: boolean; octetsAvant: number; octetsApres: number }

/** Convertit HEIC et ne remplace l'original que si le resultat est réellement plus léger. */
export async function preparerImage(fichier: File): Promise<ImagePreparee> {
  const convertieHeic = estHeic(fichier)
  // Les photos produit gardent davantage de definition que les images de recherche.
  const reduite = await reduireImage(fichier, 2048, 0.92)
  const utiliserReduite = convertieHeic || reduite.size < fichier.size * 0.95
  if (!utiliserReduite) return { fichier, compressee: false, convertieHeic: false, octetsAvant: fichier.size, octetsApres: fichier.size }
  const extension = reduite.type === 'image/webp' ? 'webp' : 'jpg'
  const nom = fichier.name.replace(/\.[^.]+$/, '') || 'photo'
  const preparee = new File([reduite], `${nom}.${extension}`, { type: reduite.type, lastModified: fichier.lastModified })
  return { fichier: preparee, compressee: true, convertieHeic, octetsAvant: fichier.size, octetsApres: preparee.size }
}
