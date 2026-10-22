'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { TexteRiche } from '@/components/marketplace/TexteRiche'
import { useMarketplaceLanguage } from '@/lib/language'
import { sectionDe, type PageContenu } from '@/lib/pages-contenu'

/**
 * LES TEXTES DE « A PROPOS », REDIGES DEPUIS LE PANEL. La page garde sa mise en
 * page ; chaque emplacement lit sa section par sa cle. Le texte du code sert de
 * secours tant que l'API ne repond pas, et l'anglais suit la langue choisie.
 */
export const A_PROPOS_DEFAUT: PageContenu = {
  titre: 'Les boutiques du Cameroun, au même endroit',
  intro: 'KatiMarket est une marketplace camerounaise : des boutiques indépendantes y présentent leurs produits, et vous comparez, commandez, payez et suivez votre livraison sur un seul site.',
  sections: [
    {
      cle: 'acheter', titre: 'Acheter sur KatiMarket', paragraphes: [],
      blocs: [
        { titre: 'Des boutiques vérifiées', texte: 'Une boutique ne vend qu’après vérification de son dossier par KatiMarket. Elle s’engage sur l’exactitude de ses offres, la conformité de ses produits et le suivi après-vente.' },
        { titre: 'Chaque offre dit qui vend', texte: 'La fiche produit et votre commande indiquent toujours la boutique, son prix, sa garantie et ses conditions de livraison. Un même produit peut être proposé par plusieurs boutiques.' },
        { titre: 'Un paiement encadré', texte: 'Vous réglez un acompte par Orange Money ou MTN Mobile Money, puis le solde à la livraison. Votre code secret reste dans l’application de votre opérateur, jamais dans un message.' },
        { titre: 'La livraison qui vous convient', texte: 'Kati Express, livraison par la boutique, retrait gratuit à la boutique ou expédition en agence : les options possibles s’affichent pendant la commande, avec leurs frais.' },
      ],
    },
    { cle: 'categories', titre: 'Ce que vous y trouvez', paragraphes: [] },
    { cle: 'vendeur', titre: 'Vous avez une boutique ?', paragraphes: ['Rejoignez KatiMarket pour présenter vos produits à des acheteurs de tout le Cameroun. Vous gérez vos offres, vos stocks et vos commandes depuis votre espace vendeur.'] },
    { cle: 'question', titre: 'Une question ?', paragraphes: ['Kati, l’assistante KatiMarket, répond à toute heure, et l’équipe reprend votre demande si besoin.'] },
  ],
}

const Textes = createContext<{ fr: PageContenu; en: PageContenu | null }>({ fr: A_PROPOS_DEFAUT, en: null })

export function AProposTextes({ fr, en, children }: { fr: PageContenu | null; en: PageContenu | null; children: ReactNode }) {
  return <Textes.Provider value={{ fr: fr ?? A_PROPOS_DEFAUT, en }}>{children}</Textes.Provider>
}

function usePage() {
  const { fr, en } = useContext(Textes)
  const { locale } = useMarketplaceLanguage()
  return locale === 'en' && en ? en : fr
}

/** Le titre ou l'introduction de la page, pour l'en-tete commun des pages interieures. */
export function AProposValeur({ champ }: { champ: 'titre' | 'intro' }) {
  const page = usePage()
  return champ === 'titre' ? <>{page.titre}</> : <TexteRiche texte={page.intro} />
}

export function AProposTitre({ cle, className }: { cle: string; className?: string }) {
  const section = sectionDe(usePage(), cle)
  return section ? <h2 className={className}>{section.titre}</h2> : null
}

export function AProposParagraphes({ cle, className }: { cle: string; className?: string }) {
  const section = sectionDe(usePage(), cle)
  return <>{section?.paragraphes.map((texte, i) => <p key={i} className={className}><TexteRiche texte={texte} /></p>)}</>
}

export function AProposBlocs({ cle }: { cle: string }) {
  const section = sectionDe(usePage(), cle)
  return <div className="grid gap-x-14 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
    {section?.blocs?.map((bloc) => <div key={bloc.titre}>
      <h3 className="mb-3 text-body font-semibold">{bloc.titre}</h3>
      <p className="text-small leading-[1.65] text-ink-2"><TexteRiche texte={bloc.texte} /></p>
    </div>)}
  </div>
}
