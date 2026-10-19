import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { requete?: unknown; rayon?: unknown } | null
  const requete = typeof body?.requete === 'string' ? body.requete.trim() : ''
  const rayon = typeof body?.rayon === 'string' ? body.rayon.trim() : undefined

  if (requete.length < 2 || requete.length > 200) {
    return NextResponse.json({ message: 'Recherche invalide.' }, { status: 400 })
  }
  if (!API) return new NextResponse(null, { status: 503 })

  try {
    const response = await fetch(`${API}/v1/catalogue/requetes-clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requete, ...(rayon ? { rayon } : {}) }),
      cache: 'no-store',
    })
    return new NextResponse(null, { status: response.ok ? 204 : response.status })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
