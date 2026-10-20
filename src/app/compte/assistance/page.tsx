import type { Metadata } from 'next'
import { connection } from 'next/server'

import { CentreAssistance } from './CentreAssistance'

export const metadata: Metadata = {
  title: 'Mes demandes — KatiMarket',
  robots: { index: false, follow: false },
}

export default async function Page() {
  await connection()
  return <CentreAssistance />
}
