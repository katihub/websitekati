import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { legalPages, type LegalSlug } from '@/components/marketplace/legal-content'
import { lireHistoriqueContenu } from '@/lib/catalogue-en-direct'
import { LocalizedText } from '@/lib/language'

type Props = { params: Promise<{ legalSlug: string }> }

const isLegalSlug = (value: string): value is LegalSlug => Object.prototype.hasOwnProperty.call(legalPages, value)
const date = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(iso))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legalSlug } = await params
  return isLegalSlug(legalSlug) ? { title: `${legalPages[legalSlug].title} — versions`, robots: { index: false, follow: true } } : {}
}

/** Les versions publiees d'une page legale, la plus recente d'abord : on sait quel texte s'appliquait a une date. */
export default async function VersionsPageLegale({ params }: Props) {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) notFound()
  const versions = await lireHistoriqueContenu(legalSlug)
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-band md:pt-14">
      <Link href={`/${legalSlug}`} className="t-label text-ink-3 hover:underline">{legalPages[legalSlug].title}</Link>
      <h1 className="mt-1 text-h3 font-semibold tracking-[-0.01em] text-ink"><LocalizedText fr="Versions publiées" en="Published versions" /></h1>
      {versions.length ? <ul className="mt-7 flex flex-col gap-2" data-testid="versions-page-legale">
        {versions.map((version) => <li key={version.numero}>
          <Link href={version.statut === 'publie' ? `/${legalSlug}` : `/${legalSlug}/versions/${version.numero}`} className="press flex items-start justify-between gap-3 rounded-well border border-rule px-4 py-3 hover:border-ink">
            <span>
              <span className="block font-semibold text-ink">Version {version.numero}</span>
              {version.resume ? <span className="block text-micro text-ink-3">{version.resume}</span> : null}
            </span>
            <span className="shrink-0 text-right text-micro text-ink-2">
              {date(version.publieLe)}
              {version.statut === 'publie' ? <span className="block font-semibold text-primary"><LocalizedText fr="En vigueur" en="In force" /></span> : null}
            </span>
          </Link>
        </li>)}
      </ul> : <p className="mt-7 text-small text-ink-2"><LocalizedText fr="L’historique n’est pas disponible pour le moment." en="The history is not available at the moment." /></p>}
    </main>
  )
}
