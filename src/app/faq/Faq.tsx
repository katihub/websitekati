'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { TexteRiche } from '@/components/marketplace/TexteRiche'
import { useMarketplaceLanguage } from '@/lib/language'

export interface FaqContenu {
  titre: string
  intro: string
  rubriques: Array<{ id: string; titre: string; questions: Array<{ id: string; question: string; reponse: string }> }>
}

const sansAccents = (texte: string) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * LA FAQ, REDIGEE DEPUIS LE PANEL. Une recherche filtre les questions, chaque
 * question a son ancre (/faq#id) pour etre partagee, et la langue suit le
 * choix du visiteur ; sans anglais publie, le francais s'affiche avec une mention.
 */
export function Faq({ fr, en }: { fr: FaqContenu | null; en: FaqContenu | null }) {
  const { locale } = useMarketplaceLanguage()
  const anglais = locale === 'en'
  const faq = anglais && en ? en : fr
  const [recherche, setRecherche] = useState('')
  const rubriques = useMemo(() => {
    const mots = sansAccents(recherche.trim()).split(/\s+/).filter(Boolean)
    if (!faq || !mots.length) return faq?.rubriques ?? []
    return faq.rubriques
      .map((rubrique) => ({ ...rubrique, questions: rubrique.questions.filter((q) => mots.every((mot) => sansAccents(`${q.question} ${q.reponse}`).includes(mot))) }))
      .filter((rubrique) => rubrique.questions.length)
  }, [faq, recherche])

  if (!faq) {
    return <main className="mx-auto w-full max-w-[46rem] px-4 pt-10 pb-band md:pt-14">
      <h1 className="text-h3 font-semibold text-ink">{anglais ? 'Frequently asked questions' : 'Questions fréquentes'}</h1>
      <p className="mt-4 text-small text-ink-2">{anglais ? 'The FAQ is not available right now.' : 'La FAQ est momentanément indisponible.'} <Link href="/contact" className="text-secondary underline">{anglais ? 'Contact us' : 'Contactez-nous'}</Link></p>
    </main>
  }

  return <main className="mx-auto w-full max-w-[46rem] px-4 pt-10 pb-band md:pt-14" data-testid="faq">
    <h1 className="text-h3 font-semibold tracking-[-0.01em] text-ink">{faq.titre}</h1>
    <p className="mt-3 text-body text-ink-2"><TexteRiche texte={faq.intro} /></p>
    {anglais && !en ? <p className="mt-3 rounded-well border border-rule bg-space p-3 text-small text-ink-2" data-testid="faq-anglais-a-venir">English version coming soon. The French answers below are up to date.</p> : null}
    <label className="mt-6 block">
      <span className="sr-only">{anglais ? 'Search the FAQ' : 'Rechercher dans la FAQ'}</span>
      <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={anglais ? 'Search a question…' : 'Rechercher une question…'}
        className="min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small text-ink" data-testid="faq-recherche"/>
    </label>
    {rubriques.length ? rubriques.map((rubrique) => <section key={rubrique.id} id={rubrique.id} className="mt-8">
      <h2 className="text-title font-bold tracking-[-0.02em] text-ink">{rubrique.titre}</h2>
      <div className="mt-3 flex flex-col divide-y divide-rule rounded-well border border-rule">
        {rubrique.questions.map((question) => <details key={question.id} id={question.id} className="group px-4 py-3" open={Boolean(recherche.trim())}>
          <summary className="cursor-pointer list-none text-body font-semibold text-ink marker:hidden">{question.question}</summary>
          <div className="mt-2 whitespace-pre-line text-small leading-[1.65] text-ink-2"><TexteRiche texte={question.reponse} /></div>
        </details>)}
      </div>
    </section>) : <p className="mt-8 text-small text-ink-2" data-testid="faq-aucun-resultat">{anglais ? 'No question matches your search.' : 'Aucune question ne correspond à votre recherche.'} <Link href="/contact" className="text-secondary underline">{anglais ? 'Ask us' : 'Posez-nous la vôtre'}</Link></p>}
  </main>
}
