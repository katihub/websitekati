/**
 * LA PHOTO, REDUITE DANS LE NAVIGATEUR AVANT DE PARTIR.
 *
 * Une photo de telephone pese 3 a 6 Mo ; sur une connexion mobile camerounaise,
 * l'envoyer telle quelle prenait a lui seul plus de temps que l'analyse. A
 * 1 024 pixels de cote, une marque ou une reference reste lisible et le fichier
 * tombe autour de 150 Ko. Le format de sortie est toujours JPEG : une photo
 * HEIC que le navigateur sait lire repart dans un format que le serveur accepte.
 */
export async function reduireImage(fichier: File, cote = 1024, qualite = 0.82): Promise<Blob> {
  const image = await createImageBitmap(fichier)
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
    return await new Promise<Blob>((resoudre, rejeter) => {
      canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('conversion impossible'))), 'image/jpeg', qualite)
    })
  } finally {
    image.close()
  }
}
