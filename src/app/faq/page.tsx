import type { Metadata } from 'next'

import { lireContenuBilingue } from '@/lib/catalogue-en-direct'
import { Faq, type FaqContenu } from './Faq'

export const metadata: Metadata = {
  title: 'Questions fréquentes — KatiMarket',
  description: 'Commander, payer, être livré, la garantie et le paiement en plusieurs fois : les réponses aux questions les plus fréquentes sur KatiMarket.',
}

/** La FAQ publique, redigee et publiee depuis le panel (contenu `faq`). */
export default async function FaqPage() {
  const { fr, en } = await lireContenuBilingue<FaqContenu>('faq')
  return <Faq fr={fr?.contenu ?? null} en={en?.contenu ?? null} />
}
