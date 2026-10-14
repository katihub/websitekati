'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { useAccount } from '@/lib/account'
import { api } from '@/lib/api'
import type { DevisMarketplace } from '@/lib/devis-marketplace'
import { useSession } from '@/lib/session'

/**
 * « DEMANDER UN DEVIS » : depuis le panier ou depuis une fiche produit.
 *
 * Le devis reprend les prix publies ; chaque boutique concernee recoit sa
 * partie et y repond. Il faut etre connecte : sans session, le bouton mene a la
 * connexion, qui ramene ici, et la selection reste ou elle est.
 */
export function BoutonDemandeDevis({ lignes, className, libelle = 'Demander un devis', onEnvoye }: {
  lignes: Array<{ offreId: string; quantite: number }>
  className?: string
  libelle?: string
  onEnvoye?: (devis: DevisMarketplace) => void
}) {
  const { session } = useSession()
  const router = useRouter()
  const account = useAccount()
  const [ouverte, setOuverte] = useState(false)
  const articles = lignes.length

  // Sans session : la page de connexion, qui ramene ici ensuite. La selection reste dans le panier.
  const connexion = account.open

  async function envoyer(donnees: FormData) {
    const entreprise = String(donnees.get('entreprise') ?? '').trim()
    const message = String(donnees.get('message') ?? '').trim()
    const devis = await api<DevisMarketplace>('/marketplace/devis', {
      methode: 'POST',
      corps: { lignes, entreprise: entreprise || undefined, message: message || undefined },
    })
    setOuverte(false)
    onEnvoye?.(devis)
    router.push(`/compte/devis/${encodeURIComponent(devis.reference)}`)
  }

  return <>
    <button type="button" className={className} disabled={!lignes.length} data-testid="demander-devis" onClick={() => (session ? setOuverte(true) : connexion())}>
      {libelle}
    </button>
    {ouverte ? <FenetreAction
      ouverte
      titre="Demander un devis"
      description={<>Le devis reprend les prix publiés de {articles > 1 ? `ces ${articles} articles` : 'cet article'}. Chaque boutique concernée reçoit sa partie, confirme les quantités disponibles et son délai. Vous l’acceptez ensuite en ligne pour commander.</>}
      libelleValider="Envoyer la demande"
      onValider={envoyer}
      onFermer={() => setOuverte(false)}
    >
      <ChampTexte nom="entreprise" libelle="Entreprise (facultatif)" aide="Le nom qui figurera sur le devis PDF." maxLength={160} placeholder="Ex. Batiplus SARL" />
      <ChampTexte nom="message" libelle="Message aux boutiques (facultatif)" multiligne maxLength={2000} placeholder="Délai souhaité, conditionnement, lieu de livraison…" />
    </FenetreAction> : null}
  </>
}
