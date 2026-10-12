import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalPageView } from '@/components/marketplace/LegalPageView'
import { legalPages, type LegalSlug } from '@/components/marketplace/legal-content'

type Props = { params: Promise<{ legalSlug: string }> }

function isLegalSlug(value: string): value is LegalSlug {
  return Object.prototype.hasOwnProperty.call(legalPages, value)
}

export function generateStaticParams() {
  return Object.keys(legalPages).map(legalSlug => ({ legalSlug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) return {}
  return { title: legalPages[legalSlug].title, description: legalPages[legalSlug].intro }
}

export default async function LegalRoute({ params }: Props) {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) notFound()
  return <LegalPageView slug={legalSlug} page={legalPages[legalSlug]} />
}
