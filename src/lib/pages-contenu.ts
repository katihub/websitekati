import type { LegalPage } from '@/components/marketplace/legal-content'

/** Une page telle que le panel la redige et que l'API la rend. */
export interface PageContenu {
  titre: string
  accroche?: string
  intro: string
  sections: Array<{ cle?: string; titre: string; paragraphes: string[]; puces?: string[]; blocs?: Array<{ titre: string; texte: string }> }>
}

/** La forme des pages legales de la vitrine, pour garder leur mise en page. */
export function versPageLegale(page: PageContenu): LegalPage {
  return {
    title: page.titre,
    eyebrow: page.accroche ?? '',
    intro: page.intro,
    sections: page.sections.map((section) => ({
      title: section.titre,
      paragraphs: section.paragraphes,
      ...(section.puces?.length ? { bullets: section.puces } : {}),
    })),
  }
}

/** Une section d'une page a structure fixe (« A propos »), retrouvee par sa cle. */
export function sectionDe(page: PageContenu | null | undefined, cle: string) {
  return page?.sections.find((section) => section.cle === cle) ?? null
}
