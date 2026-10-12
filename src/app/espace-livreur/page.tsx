import type { Metadata } from 'next'

import { MissionsLivreur } from './MissionsLivreur'

export const metadata: Metadata = {
  title: 'Missions livreur — KatiHub',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <MissionsLivreur />
}
