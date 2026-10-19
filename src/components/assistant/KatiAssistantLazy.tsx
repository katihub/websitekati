'use client'

import dynamic from 'next/dynamic'

/** Le panneau conversationnel reste hors du bundle initial jusqu'à l'hydratation. */
const Assistant = dynamic(
  () => import('./Assistant').then((module) => module.Assistant),
  { ssr: false, loading: () => null },
)

export function KatiAssistantLazy() {
  return <Assistant whatsapp={null} />
}
