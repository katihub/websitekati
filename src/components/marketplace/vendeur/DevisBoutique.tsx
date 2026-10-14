'use client'

import { useCallback, useEffect, useState } from 'react'

import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { ErreurApi, api, telechargerApi } from '@/lib/api'
import { LIBELLES_PARTIE, dateCourte, fcfa, type PartieDevisBoutique } from '@/lib/devis-marketplace'
import styles from '@/app/espace-vendeur/seller-workspace.module.css'

/**
 * LES DEMANDES DE DEVIS RECUES PAR LA BOUTIQUE.
 *
 * Seulement sa partie : le client peut avoir demande d'autres articles a
 * d'autres boutiques, elle ne les voit pas. Les prix sont ceux qu'elle publie ;
 * elle confirme les quantites qu'elle peut fournir, son delai et la duree de
 * validite de sa reponse, ou elle refuse en expliquant pourquoi. La reponse
 * part directement au client.
 */

type Fenetre = { type: 'confirmer' | 'refuser'; partie: PartieDevisBoutique } | null
const REPONDABLE = ['en_attente', 'confirmee']

export function DevisBoutique({ shopId }: { shopId: string }) {
  const [parties, setParties] = useState<PartieDevisBoutique[] | null>(null)
  const [message, setMessage] = useState('')
  const [fenetre, setFenetre] = useState<Fenetre>(null)

  const charger = useCallback(async () => {
    try { setParties(await api<PartieDevisBoutique[]>(`/marketplace/boutiques/${shopId}/devis`)) }
    catch (e) { setMessage(e instanceof ErreurApi ? e.message : 'Les devis n’ont pas pu être chargés.'); setParties([]) }
  }, [shopId])

  useEffect(() => {
    const minuterie = window.setTimeout(() => void charger(), 0)
    return () => window.clearTimeout(minuterie)
  }, [charger])

  async function repondre(donnees: FormData) {
    if (!fenetre) return
    const { partie, type } = fenetre
    const corps = type === 'refuser'
      ? { decision: 'refusee', motif: String(donnees.get('motif') ?? '').trim(), message: String(donnees.get('message') ?? '').trim() || undefined }
      : {
          decision: 'confirmee',
          lignes: partie.lignes.map((ligne) => ({ ligneId: ligne.id, quantiteConfirmee: Number(donnees.get(`quantite-${ligne.id}`) ?? 0) })),
          delaiLivraisonJours: Number(donnees.get('delai')),
          validiteJours: Number(donnees.get('validite')),
          message: String(donnees.get('message') ?? '').trim() || undefined,
        }
    if (type === 'confirmer') {
      const lignes = (corps as { lignes: Array<{ quantiteConfirmee: number }> }).lignes
      if (lignes.some((l) => !Number.isInteger(l.quantiteConfirmee) || l.quantiteConfirmee < 0)) throw new Error('Les quantités sont des nombres entiers positifs.')
      if (!lignes.some((l) => l.quantiteConfirmee > 0)) throw new Error('Aucune quantité confirmée : refusez plutôt le devis, avec un motif.')
    }
    await api(`/marketplace/boutiques/${shopId}/devis/${partie.id}/reponse`, { methode: 'POST', corps })
    setFenetre(null)
    setMessage(type === 'refuser' ? `Refus envoyé au client pour ${partie.reference}.` : `Confirmation envoyée au client pour ${partie.reference}.`)
    await charger()
  }

  async function pdf(partie: PartieDevisBoutique) {
    try { await telechargerApi(`/marketplace/boutiques/${shopId}/devis/${partie.id}/pdf`, `devis-${partie.reference}.pdf`) }
    catch (e) { setMessage(e instanceof ErreurApi ? e.message : 'Le PDF n’a pas pu être téléchargé.') }
  }

  const enAttente = parties?.filter((p) => p.statut === 'en_attente').length ?? 0
  return <div className={styles.featureGrid} data-testid="devis-boutique">
    <section className={styles.featureList} style={{ gridColumn: '1 / -1' }}>
      <header><h2>Demandes de devis</h2><span>{parties ? `${parties.length} devis · ${enAttente} à traiter` : 'Chargement…'}</span></header>
      {message ? <p className={styles.feedback} role="status">{message}</p> : null}
      {parties && !parties.length ? <p className={styles.blank}>Aucune demande de devis pour le moment. Les clients peuvent en demander depuis votre boutique, une fiche produit ou leur panier.</p> : null}
      {parties?.length ? <ul>{parties.map((partie) => <li key={partie.id} data-testid={`devis-${partie.reference}`} style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{partie.reference}{partie.devis.entreprise ? ` · ${partie.devis.entreprise}` : ''}</strong>
          <small>Demandé le {dateCourte(partie.devis.creeLe)}{partie.devis.client.nom ? ` par ${partie.devis.client.nom}` : ''}{partie.devis.client.ville ? `, ${partie.devis.client.ville}` : ''}</small>
          {partie.devis.message ? <em>« {partie.devis.message} »</em> : null}
          <small>{partie.lignes.map((l) => `${l.quantiteConfirmee !== null && partie.statut !== 'en_attente' ? `${l.quantiteConfirmee}/` : ''}${l.quantiteDemandee} × ${l.offreTitreCapture}${l.libelleVarianteCapture ? ` (${l.libelleVarianteCapture})` : ''} à ${fcfa(l.prixUnitaireFcfa)}`).join(' · ')}</small>
          {partie.statut === 'confirmee' && partie.valideJusquau ? <small>Délai annoncé : {partie.delaiLivraisonJours} j · valable jusqu’au {dateCourte(partie.valideJusquau)}</small> : null}
          {partie.motifRefus ? <em>Motif du refus : {partie.motifRefus}</em> : null}
        </div>
        <div className={styles.offerMeta}>
          <span>{fcfa(partie.totalFcfa)}</span>
          <b data-status={partie.statut === 'confirmee' || partie.statut === 'acceptee' ? 'publiee' : partie.statut}>{partie.expiree ? 'Réponse expirée' : LIBELLES_PARTIE[partie.statut]}</b>
          <span className={styles.variantActions}>
            {REPONDABLE.includes(partie.statut) && partie.devis.statut === 'ouvert' ? <>
              <button type="button" className={styles.lienAction} onClick={() => setFenetre({ type: 'confirmer', partie })}>{partie.statut === 'confirmee' ? 'Modifier la réponse' : 'Confirmer'}</button>
              <button type="button" className={styles.lienAction} onClick={() => setFenetre({ type: 'refuser', partie })}>Refuser</button>
            </> : null}
            <button type="button" className={styles.lienAction} onClick={() => void pdf(partie)}>PDF</button>
          </span>
        </div>
      </li>)}</ul> : null}
    </section>

    {fenetre?.type === 'confirmer' ? <FenetreAction
      key={`c-${fenetre.partie.id}`}
      ouverte
      titre={`Confirmer le devis ${fenetre.partie.reference}`}
      description="Indiquez ce que vous pouvez fournir, aux prix publiés. Le client recevra votre réponse et pourra l’accepter pour commander."
      libelleValider="Envoyer la confirmation"
      onValider={repondre}
      onFermer={() => setFenetre(null)}
    >
      {fenetre.partie.lignes.map((ligne) => <ChampTexte key={ligne.id} nom={`quantite-${ligne.id}`} libelle={`${ligne.offreTitreCapture}${ligne.libelleVarianteCapture ? ` — ${ligne.libelleVarianteCapture}` : ''}`} aide={`Demandé : ${ligne.quantiteDemandee} à ${fcfa(ligne.prixUnitaireFcfa)}. Mettez 0 si l’article n’est pas disponible.`} inputMode="numeric" pattern="[0-9]+" required defaultValue={String(ligne.quantiteConfirmee ?? ligne.quantiteDemandee)} />)}
      <div className="grid grid-cols-2 gap-3">
        <ChampTexte nom="delai" libelle="Délai de livraison (jours)" inputMode="numeric" pattern="[0-9]+" required defaultValue={String(fenetre.partie.delaiLivraisonJours ?? 3)} />
        <ChampTexte nom="validite" libelle="Réponse valable (jours)" aide="De 1 à 30 jours." inputMode="numeric" pattern="([1-9]|[12][0-9]|30)" required defaultValue="15" />
      </div>
      <ChampTexte nom="message" libelle="Message au client (facultatif)" multiligne maxLength={2000} defaultValue={fenetre.partie.messageVendeur ?? ''} />
    </FenetreAction> : null}

    {fenetre?.type === 'refuser' ? <FenetreAction
      key={`r-${fenetre.partie.id}`}
      ouverte
      titre={`Refuser le devis ${fenetre.partie.reference}`}
      description="Le client en sera informé avec votre motif. Les autres boutiques de son devis ne sont pas concernées."
      libelleValider="Envoyer le refus"
      onValider={repondre}
      onFermer={() => setFenetre(null)}
    >
      <ChampTexte nom="motif" libelle="Motif" multiligne required minLength={5} maxLength={1000} placeholder="Ex. Rupture chez notre fournisseur jusqu’à fin du mois." />
    </FenetreAction> : null}
  </div>
}
