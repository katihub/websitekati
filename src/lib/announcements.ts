export interface Announcement {
  id: number
  texte: string
  ordre: number
}

export const ANNONCES_PAR_DEFAUT: Announcement[] = [
  { id: 1, texte: 'Livraison rapide partout au Cameroun', ordre: 10 },
  { id: 2, texte: 'Paiement sécurisé', ordre: 20 },
  { id: 3, texte: 'Une équipe à votre écoute 24/7', ordre: 30 },
]

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''

function estAnnonce(value: unknown): value is Announcement {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return Number.isInteger(Number(row.id)) && Number.isFinite(Number(row.ordre)) && typeof row.texte === 'string' && row.texte.trim().length > 0 && row.texte.length <= 120
}

export async function lireAnnonces(): Promise<Announcement[]> {
  if (!API) return ANNONCES_PAR_DEFAUT
  try {
    const response = await fetch(`${API}/v1/vitrine/annonces`, {
      next: { revalidate: 300, tags: ['annonces'] },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return ANNONCES_PAR_DEFAUT
    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) return ANNONCES_PAR_DEFAUT
    const rows = payload.filter(estAnnonce).sort((a, b) => a.ordre - b.ordre || a.id - b.id)
    return rows.length ? rows : ANNONCES_PAR_DEFAUT
  } catch {
    return ANNONCES_PAR_DEFAUT
  }
}
