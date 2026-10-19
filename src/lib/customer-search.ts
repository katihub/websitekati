'use client'

export function enregistrerRechercheClient(requete: string, rayon?: string) {
  const texte = requete.trim()
  if (texte.length < 2) return

  void fetch('/api/customer-searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requete: texte, ...(rayon ? { rayon } : {}) }),
    keepalive: true,
  }).catch(() => undefined)
}
