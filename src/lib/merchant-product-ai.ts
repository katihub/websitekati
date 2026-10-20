export type MerchantProductDraft = {
  nom: string
  marque: string
  categorie: string
  sousCategorie: string
  accessoireCategorie?: string
  description: string
  descriptionCourte: string
  ficheTechnique: string
  metaTitre: string
  metaDescription: string
}

export type MerchantProductSuggestion = {
  nom: string
  marque: string
  categorieId: string | null
  descriptionCourte: string
  description: string
  ficheTechnique: string
  metaTitre: string
  metaDescription: string
  pointsAValider: string[]
}

const LIMITES = {
  nom: 150,
  marque: 120,
  descriptionCourte: 300,
  description: 12_000,
  ficheTechnique: 12_000,
  metaTitre: 70,
  metaDescription: 170,
  point: 240,
  points: 8,
} as const

function objet(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function texte(record: Record<string, unknown>, key: string, max: number): string | null {
  const value = record[key]
  return typeof value === 'string' ? value.trim().slice(0, max).trim() : null
}

/** Vérifie la sortie du fournisseur avant qu'elle puisse modifier le formulaire. */
export function lireSuggestionProduit(value: unknown): MerchantProductSuggestion | null {
  const record = objet(value)
  if (!record) return null
  const nom = texte(record, 'nom', LIMITES.nom)
  const marque = texte(record, 'marque', LIMITES.marque)
  const descriptionCourte = texte(record, 'descriptionCourte', LIMITES.descriptionCourte)
  const description = texte(record, 'description', LIMITES.description)
  const ficheTechnique = texte(record, 'ficheTechnique', LIMITES.ficheTechnique)
  const metaTitre = texte(record, 'metaTitre', LIMITES.metaTitre)
  const metaDescription = texte(record, 'metaDescription', LIMITES.metaDescription)
  const categorieId = record.categorieId === null
    ? null
    : typeof record.categorieId === 'string'
      ? record.categorieId.trim().slice(0, 100)
      : undefined
  const points = record.pointsAValider
  if ([nom, marque, descriptionCourte, description, ficheTechnique, metaTitre, metaDescription].some((item) => item === null)) return null
  if (categorieId === undefined || !Array.isArray(points)) return null
  const pointsAValider = points
    .filter((point): point is string => typeof point === 'string')
    .map((point) => point.trim().slice(0, LIMITES.point).trim())
    .filter(Boolean)
    .slice(0, LIMITES.points)
  if (pointsAValider.length !== points.length) return null
  return { nom: nom!, marque: marque!, categorieId, descriptionCourte: descriptionCourte!, description: description!, ficheTechnique: ficheTechnique!, metaTitre: metaTitre!, metaDescription: metaDescription!, pointsAValider }
}
