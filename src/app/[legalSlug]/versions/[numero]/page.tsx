import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPageView } from '@/components/marketplace/LegalPageView'
import { legalPages, type LegalSlug } from '@/components/marketplace/legal-content'
import { lireVersionContenu } from '@/lib/catalogue-en-direct'
import { versPageLegale, type PageContenu } from '@/lib/pages-contenu'

type Props = { params: Promise<{ legalSlug: string; numero: string }> }

const isLegalSlug = (value: string): value is LegalSlug => Object.prototype.hasOwnProperty.call(legalPages, value)

export const metadata: Metadata = { robots: { index: false, follow: true } }

/** Une ancienne version d'une page legale, telle qu'elle a ete publiee. */
export default async function VersionPageLegale({ params }: Props) {
  const { legalSlug, numero } = await params
  const n = Number(numero)
  if (!isLegalSlug(legalSlug) || !Number.isInteger(n) || n < 1) notFound()
  const [fr, en] = await Promise.all([lireVersionContenu<PageContenu>(legalSlug, n, 'fr'), lireVersionContenu<PageContenu>(legalSlug, n, 'en')])
  if (!fr) notFound()
  return <LegalPageView
    slug={legalSlug}
    fr={versPageLegale(fr.contenu)}
    en={en?.langue === 'en' ? versPageLegale(en.contenu) : null}
    version={{ numero: fr.numero, publieLe: fr.publieLe, enVigueur: fr.enVigueur }}
  />
}
