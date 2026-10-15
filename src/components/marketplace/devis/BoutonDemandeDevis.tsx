'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { normalisePhone, useAccount } from '@/lib/account'
import { api } from '@/lib/api'
import type { DevisMarketplace } from '@/lib/devis-marketplace'
import { useSession } from '@/lib/session'
import { memoriserSuivi } from '@/lib/suivi'

/**
 * « DEMANDER UN DEVIS » : depuis le panier ou depuis une fiche produit.
 *
 * Le devis reprend les prix publies ; chaque boutique concernee recoit sa
 * partie et y repond. Sans compte, le client donne son nom, son telephone et son
 * e-mail : le lien de suivi du devis lui est envoye par e-mail.
 */
/** Un devis d'entreprise va jusqu'a 9 999 unites par ligne ; le panier reste a 99. */
const QUANTITE_MAX = 9_999

export function BoutonDemandeDevis({ lignes, className, libelle = 'Demander un devis', onEnvoye }: {
  /** `nom` affiche la ligne dans la fenetre, ou le client ajuste sa quantite (jusqu'a 9 999). */
  lignes: Array<{ offreId: string; quantite: number; nom?: string }>
  className?: string
  libelle?: string
  onEnvoye?: (devis: DevisMarketplace) => void
}) {
  const { session } = useSession()
  const router = useRouter()
  const account = useAccount()
  const [ouverte, setOuverte] = useState(false)
  const articles = lignes.length


  async function envoyer(donnees: FormData) {
    const entreprise = String(donnees.get('entreprise') ?? '').trim()
    const message = String(donnees.get('message') ?? '').trim()
    const quantites = lignes.map((ligne) => {
      const valeur = Number(String(donnees.get(`quantite-${ligne.offreId}`) ?? ligne.quantite).trim())
      if (!Number.isInteger(valeur) || valeur < 1 || valeur > QUANTITE_MAX) throw new Error(`La quantité de ${ligne.nom ?? 'chaque article'} va de 1 à ${QUANTITE_MAX.toLocaleString('fr-FR')}.`)
      return { offreId: ligne.offreId, quantite: valeur }
    })
    const corps = { lignes: quantites, entreprise: entreprise || undefined, message: message || undefined }
    if (session) {
      const devis = await api<DevisMarketplace>('/marketplace/devis', { methode: 'POST', corps })
      setOuverte(false)
      onEnvoye?.(devis)
      router.push(`/compte/devis/${encodeURIComponent(devis.reference)}`)
      return
    }
    // Sans compte : les coordonnees, et le lien de suivi envoye par e-mail.
    const nom = String(donnees.get('nom') ?? '').trim()
    const telephone = normalisePhone(String(donnees.get('telephone') ?? ''))
    const courriel = String(donnees.get('courriel') ?? '').trim().toLowerCase()
    if (nom.length < 2) throw new Error('Indiquez votre nom.')
    if (!telephone) throw new Error('Indiquez votre numéro de mobile camerounais, commençant par 6.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) throw new Error('Indiquez votre adresse e-mail : le lien de suivi du devis y sera envoyé.')
    const devis = await api<DevisMarketplace & { jeton: string }>('/marketplace/devis/sans-compte', { methode: 'POST', anonyme: true, corps: { ...corps, nom, telephone, courriel } })
    memoriserSuivi(devis.reference, devis.jeton)
    setOuverte(false)
    onEnvoye?.(devis)
    router.push(`/devis/${encodeURIComponent(devis.reference)}?suivi=${encodeURIComponent(devis.jeton)}`)
  }

  return <>
    <button type="button" className={className} disabled={!lignes.length} data-testid="demander-devis" onClick={() => setOuverte(true)}>
      {libelle}
    </button>
    {ouverte ? <FenetreAction
      ouverte
      titre="Demander un devis"
      description={<>Le devis reprend les prix publiés de {articles > 1 ? `ces ${articles} articles` : 'cet article'}. Chaque boutique concernée reçoit sa partie, confirme les quantités disponibles et son délai. Vous l’acceptez ensuite en ligne pour commander.{session ? null : <> Sans compte, le lien de suivi vous est envoyé par e-mail ; <button type="button" className="font-semibold text-secondary underline" onClick={() => { setOuverte(false); account.open() }}>se connecter</button> le range dans votre espace.</>}</>}
      libelleValider="Envoyer la demande"
      onValider={envoyer}
      onFermer={() => setOuverte(false)}
    >
      {lignes.map((ligne) => <ChampTexte key={ligne.offreId} nom={`quantite-${ligne.offreId}`} libelle={`Quantité — ${ligne.nom ?? 'article'}`} inputMode="numeric" pattern="[0-9]{1,4}" required defaultValue={String(ligne.quantite)} aide={lignes.length === 1 ? `Jusqu’à ${QUANTITE_MAX.toLocaleString('fr-FR')} unités pour un achat d’entreprise.` : undefined} />)}
      {session ? null : <>
        <ChampTexte nom="nom" libelle="Votre nom" required minLength={2} maxLength={80} autoComplete="name" />
        <ChampTexte nom="telephone" libelle="Téléphone mobile" required type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="6 77 12 34 56" />
        <ChampTexte nom="courriel" libelle="E-mail" required type="email" inputMode="email" autoComplete="email" maxLength={320} aide="Le lien de suivi du devis y sera envoyé." />
      </>}
      <ChampTexte nom="entreprise" libelle="Entreprise (facultatif)" aide="Le nom qui figurera sur le devis PDF." maxLength={160} placeholder="Ex. Batiplus SARL" />
      <ChampTexte nom="message" libelle="Message aux boutiques (facultatif)" multiligne maxLength={2000} placeholder="Délai souhaité, conditionnement, lieu de livraison…" />
    </FenetreAction> : null}
  </>
}
