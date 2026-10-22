import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalPageView } from '@/components/marketplace/LegalPageView'
import { legalPages, type LegalSlug } from '@/components/marketplace/legal-content'
import { lireContenuBilingue } from '@/lib/catalogue-en-direct'
import { versPageLegale, type PageContenu } from '@/lib/pages-contenu'

type Props = { params: Promise<{ legalSlug: string }> }

function isLegalSlug(value: string): value is LegalSlug {
  return Object.prototype.hasOwnProperty.call(legalPages, value)
}

export function generateStaticParams() {
  return Object.keys(legalPages).map(legalSlug => ({ legalSlug }))
}

/** Le texte publie depuis le panel ; celui du code tant qu'aucun n'est lisible. */
async function lirePage(slug: LegalSlug) {
  const { fr, en } = await lireContenuBilingue<PageContenu>(slug)
  return {
    fr: fr ? versPageLegale(fr.contenu) : legalPages[slug],
    en: en ? versPageLegale(en.contenu) : null,
    version: fr ? { numero: fr.numero, publieLe: fr.publieLe, enVigueur: true } : null,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) return {}
  const { fr } = await lirePage(legalSlug)
  return { title: fr.title, description: fr.intro }
}

export default async function LegalRoute({ params }: Props) {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) notFound()
  const page = await lirePage(legalSlug)
  return <LegalPageView slug={legalSlug} {...page} />
}
