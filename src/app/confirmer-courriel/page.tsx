import { Suspense } from 'react'

import { ConfirmerCourriel } from './ConfirmerCourriel'

export default function Page() {
  return <Suspense fallback={<p className="p-8 text-center">Confirmation en cours…</p>}><ConfirmerCourriel /></Suspense>
}
