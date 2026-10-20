'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { ApercuPieces, PIECES_MAX_PAR_MESSAGE, TYPES_PIECES, taillePiece, verifierPieces, type VerificationPieces } from '@/components/marketplace/ApercuPieces'
import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { ErreurApi, api, telechargerApi } from '@/lib/api'
import { formatPrice } from '@/lib/format'
import { formatKati, type KatiCommande } from '@/lib/kati'
import { LIBELLE_MODE, type DeliveryMode } from '@/lib/modes-livraison'
import { useJetonSuivi } from '@/lib/suivi'

type Evenement = { id: string; type: string; versStatut: string | null; motif: string | null; creeLe: string }
type Ligne = { id: string; offreTitreCapture: string; quantite: number; quantiteLivree: number; quantiteRetournee: number; quantiteRemboursee: number; totalNetFcfa: number; quantiteRefusee?: number; refus?: { motif: string; remboursementDuFcfa: number; rembourseLe: string | null } | null }
type Expedition = { id: string; reference: string; statut: string; ville: string; montantACollecterFcfa: number; livreeLe: string | null; evenements: Evenement[] }
type SousCommande = { id: string; reference: string; statut: string; modeLivraison?: DeliveryMode; noteAgence?: string | null; boutique: { nom: string; slug: string }; lignes: Ligne[]; expeditions: Expedition[] }
type Commande = { id: string; reference: string; statut: string; totalFermeTtc: number; acompteDu: number; acompteRecu: number; resteAPayer: number; sousCommandes: SousCommande[]; kati?: KatiCommande }

/**
 * La commande : celle du compte connecte, ou, avec le jeton de son lien, une
 * commande passee sans compte. Les reclamations demandent un compte.
 */
async function lireCommande(reference: string, jeton: string | null, signal?: AbortSignal) {
  const commande = jeton
    ? await api<Commande>(`/marketplace/commandes/sans-compte/${encodeURIComponent(reference)}`, { signal, jetonSuivi: jeton })
    : await api<Commande>(`/marketplace/commandes/${encodeURIComponent(reference)}`, { signal })
  const demandes = jeton ? [] : await api<Demande[]>(`/marketplace/demandes-client?commandeId=${encodeURIComponent(commande.id)}`, { signal })
  return { commande, demandes }
}
type Retour = { id: string; statut: string; quantite: number; montantRembourseFcfa: number; referenceRetour: string | null; motifDecision?: string | null; motifArbitrage?: string | null; motifContestation?: string | null }
type Piece = { id: string; nomCapture: string; typeMime: string; tailleOctets: number; empreinteSha256: string }
type Message = { id: string; auteurType: string; contenu: string; creeLe: string; pieces: Piece[] }
type Demande = { id: string; reference: string; statut: string; objet: string; modifieLe: string; boutique: { nom: string }; ligne: Ligne | null; messages: Message[]; retour: Retour | null; capacites: { repondre: boolean; expedier: boolean; contester: boolean } }

const CATEGORIES = [
  ['produit_non_conforme', 'Produit non conforme'],
  ['produit_endommage', 'Produit endommagé'],
  ['produit_manquant', 'Produit manquant'],
  ['livraison', 'Problème de livraison'],
  ['remboursement', 'Remboursement'],
  ['autre', 'Autre demande'],
] as const

const AUTEURS: Record<string, string> = { client: 'Vous', vendeur: 'La boutique', equipe: 'KatiMarket' }

type Fenetre =
  | { type: 'ouverture'; sousCommande: SousCommande; ligne: Ligne; expedition?: Expedition }
  | { type: 'message' | 'retour'; demande: Demande }
  | { type: 'expedition' | 'contestation'; demande: Demande; retour: Retour }
  | { type: 'pieces'; demande: Demande; message: Message; verification: VerificationPieces }
  | null

export function SuiviMarketplace({ reference, jetonUrl }: { reference: string; jetonUrl?: string }) {
  // Le jeton du lien, ou celui garde par ce navigateur ; `undefined` tant qu'il n'est pas resolu.
  const jeton = useJetonSuivi(reference, jetonUrl)
  const [commande, setCommande] = useState<Commande | null>(null)
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState('')
  const [chargement, setChargement] = useState(true)
  const [fenetre, setFenetre] = useState<Fenetre>(null)

  const charger = useCallback(async (signal?: AbortSignal) => {
    setErreur('')
    try {
      const lu = await lireCommande(reference, jeton ?? null, signal)
      setCommande(lu.commande)
      setDemandes(lu.demandes)
    } catch (cause) {
      if (!signal?.aborted) setErreur(cause instanceof ErreurApi ? cause.message : 'Le suivi est momentanément indisponible.')
    } finally {
      if (!signal?.aborted) setChargement(false)
    }
  }, [reference, jeton])

  useEffect(() => {
    if (jeton === undefined) return
    const controleur = new AbortController()
    lireCommande(reference, jeton, controleur.signal)
      .then((lu) => {
        if (!controleur.signal.aborted) {
          setCommande(lu.commande)
          setDemandes(lu.demandes)
          setErreur('')
        }
      })
      .catch((cause: unknown) => {
        if (!controleur.signal.aborted) {
          setErreur(cause instanceof ErreurApi ? cause.message : 'Le suivi est momentanément indisponible.')
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) setChargement(false)
      })
    return () => controleur.abort()
  }, [reference, jeton])

  function ouvrir(prochaine: Fenetre) {
    setErreur('')
    setSucces('')
    setFenetre(prochaine)
  }

  /** Enregistre, recharge et dit ce qui a ete fait. Une erreur remonte a la fenetre, qui l'affiche. */
  async function enregistrer(appel: () => Promise<unknown>, messageSucces: string) {
    await appel()
    setFenetre(null)
    setSucces(messageSucces)
    await charger()
  }

  function ouvrirDemande(donnees: FormData) {
    if (!commande || fenetre?.type !== 'ouverture') return Promise.resolve()
    const { sousCommande, ligne, expedition } = fenetre
    return enregistrer(() => api('/marketplace/demandes-client', {
      methode: 'POST',
      corps: {
        commandeId: commande.id,
        sousCommandeId: sousCommande.id,
        ligneId: ligne.id,
        ...(expedition ? { expeditionId: expedition.id } : {}),
        categorie: donnees.get('categorie'),
        objet: String(donnees.get('objet') ?? '').trim(),
        description: String(donnees.get('description') ?? '').trim(),
      },
    }), 'Votre demande est ouverte. La boutique a été prévenue.')
  }

  function demanderRetour(demande: Demande, donnees: FormData) {
    const ligne = demande.ligne
    if (!ligne) return Promise.resolve()
    return enregistrer(() => api(`/marketplace/demandes-client/${demande.id}/retour`, {
      methode: 'POST',
      corps: { ligneId: ligne.id, quantite: Number(donnees.get('quantite') ?? 1), motif: String(donnees.get('motif') ?? '').trim() },
    }), 'Votre demande de retour est envoyée. La boutique va l’examiner.')
  }

  function repondre(demande: Demande, donnees: FormData) {
    return enregistrer(() => api(`/marketplace/demandes-client/${demande.id}/messages`, {
      methode: 'POST', corps: { contenu: String(donnees.get('contenu') ?? '').trim() },
    }), 'Message envoyé.')
  }

  function expedierRetour(retour: Retour, donnees: FormData) {
    return enregistrer(() => api(`/marketplace/demandes-client/retours/${retour.id}/expedition`, {
      methode: 'POST', corps: { referenceRetour: String(donnees.get('referenceRetour') ?? '').trim() },
    }), 'Expédition du retour enregistrée. La boutique confirmera sa réception.')
  }

  function contesterRetour(retour: Retour, donnees: FormData) {
    return enregistrer(() => api(`/marketplace/demandes-client/retours/${retour.id}/contestation`, {
      methode: 'POST', corps: { motif: String(donnees.get('motif') ?? '').trim() },
    }), 'Votre contestation est transmise à KatiMarket pour arbitrage.')
  }

  function choisirPieces(demande: Demande, fichiers: FileList | null) {
    const message = demande.messages.findLast((element) => element.auteurType === 'client')
    if (!message || !fichiers?.length) return
    ouvrir({ type: 'pieces', demande, message, verification: verifierPieces(Array.from(fichiers)) })
  }

  async function envoyerPieces(demande: Demande, message: Message, fichiers: File[]) {
    let envoyes = 0
    try {
      for (const fichier of fichiers) {
        const corps = new FormData()
        corps.append('fichier', fichier)
        await api(`/marketplace/demandes-client/${demande.id}/messages/${message.id}/pieces`, { methode: 'POST', corps })
        envoyes += 1
      }
    } catch (cause) {
      // Les pieces deja deposees le restent : on le dit, pour qu'aucune ne soit renvoyee en double.
      if (envoyes) await charger()
      const raison = cause instanceof Error ? cause.message : 'La pièce n’a pas pu être jointe.'
      throw new Error(envoyes ? `${envoyes} fichier(s) joint(s), puis échec : ${raison}` : raison)
    }
    setFenetre(null)
    setSucces(`${envoyes} pièce(s) jointe(s) au dossier.`)
    await charger()
  }

  async function telechargerPiece(demandeId: string, piece: Piece) {
    setErreur('')
    try {
      await telechargerApi(`/marketplace/demandes-client/${demandeId}/pieces/${piece.id}`, piece.nomCapture)
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : 'La pièce n’a pas pu être téléchargée.')
    }
  }

  if (chargement) return <main className="mx-auto max-w-5xl px-5 py-14"><p role="status">Chargement du suivi…</p></main>
  if (!commande) return <main className="mx-auto max-w-3xl px-5 py-14"><p role="alert">{erreur || 'Commande introuvable.'}</p></main>

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <header className="flex flex-col gap-5 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div><p className="t-label text-ink-3">Suivi marketplace</p><h1 className="mt-2 text-h2 font-semibold text-ink">Commande {commande.reference}</h1><p className="mt-2 text-small text-ink-2">Statut : {libelle(commande.statut)}</p></div>
        <div className="rounded-well bg-ink px-5 py-4 text-white"><span className="block text-micro opacity-70">Solde à la livraison</span><strong className="t-num text-h4">{formatPrice(commande.resteAPayer)}</strong></div>
      </header>
      {commande.kati && commande.kati.points > 0 ? (
          <p className="mt-6 rounded-well border border-rule bg-space px-4 py-3 text-small text-ink" data-testid="kati-commande">
            Cette commande vous a rapporté <strong>{formatKati(commande.kati.points)}</strong>{commande.kati.liberes ? ', déjà disponibles' : commande.kati.disponibleLe ? `, disponibles le ${new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(commande.kati.disponibleLe))}` : ''}. <Link href="/compte/kati" className="text-secondary underline underline-offset-2">Mes KATI</Link>
          </p>
        ) : null}

      {jeton ? (
        <div className="mt-6 rounded-well border border-rule bg-space px-4 py-3 text-small text-ink" data-testid="arguments-compte">
          Commande passée sans compte : gardez le lien reçu par e-mail, il ouvre cette page.{commande.acompteRecu < commande.acompteDu ? <> <Link href={`/marketplace/commande/${encodeURIComponent(commande.reference)}/paiement?suivi=${encodeURIComponent(jeton)}`} className="text-secondary underline underline-offset-2">Régler la commande</Link>.</> : null} Avec un compte KatiMarket, vous gagnez des KATI sur chaque commande, vous retrouvez vos adresses et vous pouvez signaler un problème en ligne. <Link href="/inscription" className="text-secondary underline underline-offset-2">Créer un compte</Link>
        </div>
      ) : null}
      {erreur ? <p className="mt-5 rounded-well border border-warn p-3 text-small text-warn" role="alert">{erreur}</p> : null}
      <p role="status" className={succes ? 'mt-5 rounded-well border border-primary p-3 text-small text-primary' : 'sr-only'}>{succes}</p>

      <section className="mt-8 grid gap-5">
        {commande.sousCommandes.map((groupe) => (
          <article key={groupe.id} className="rounded-well border border-rule bg-space p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-h4 font-semibold">{groupe.boutique.nom}</h2><p className="text-micro text-ink-3">{groupe.reference} · {libelle(groupe.statut)}{groupe.modeLivraison ? ` · ${LIBELLE_MODE[groupe.modeLivraison]}` : ''}{groupe.noteAgence ? ` · ${groupe.noteAgence}` : ''}</p></div></div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <ul className="divide-y divide-rule">
                {groupe.lignes.map((ligne) => (
                  <li key={ligne.id} className="py-3">
                    <div className="flex justify-between gap-4"><span className={ligne.quantiteRefusee ? 'line-through text-ink-3' : undefined}>{ligne.offreTitreCapture} × {ligne.quantite}</span><strong className="t-num">{formatPrice(ligne.totalNetFcfa)}</strong></div>
                    {ligne.quantiteRefusee ? (
                      // La boutique n'avait pas l'article : la ligne est sortie de la commande.
                      <p className="mt-1 text-micro text-warn" data-testid="ligne-refusee">Article indisponible, retiré de la commande{ligne.refus ? ` : ${ligne.refus.motif}` : ''}.{ligne.refus?.remboursementDuFcfa ? (ligne.refus.rembourseLe ? ` ${formatPrice(ligne.refus.remboursementDuFcfa)} d’acompte vous ont été remboursés.` : ` ${formatPrice(ligne.refus.remboursementDuFcfa)} d’acompte vous seront remboursés par Mobile Money.`) : ' Le montant à régler à la livraison est réduit d’autant.'}</p>
                    ) : <>
                      <p className="mt-1 text-micro text-ink-3">Livré : {ligne.quantiteLivree} · Retourné : {ligne.quantiteRetournee} · Remboursé : {ligne.quantiteRemboursee}</p>
                      {jeton ? null : <button type="button" className="mt-1 min-h-11 text-small font-semibold text-secondary underline" onClick={() => ouvrir({ type: 'ouverture', sousCommande: groupe, ligne, expedition: groupe.expeditions[0] })}>Signaler un problème</button>}
                    </>}
                  </li>
                ))}
              </ul>
              <div className="grid gap-3">
                {groupe.expeditions.map((expedition) => (
                  <div key={expedition.id} className="rounded-control border border-rule p-4"><div className="flex justify-between gap-3"><strong>{expedition.reference}</strong><span className="text-micro font-semibold text-primary">{libelle(expedition.statut)}</span></div><p className="mt-1 text-micro text-ink-3">{expedition.ville} · À encaisser : {formatPrice(expedition.montantACollecterFcfa)}</p><ol className="mt-3 border-l border-rule pl-4">{expedition.evenements.slice(-4).reverse().map((evt) => <li key={evt.id} className="mb-2 text-micro"><b>{libelle(evt.type)}</b><span className="block text-ink-3">{date(evt.creeLe)}{evt.motif ? ` · ${evt.motif}` : ''}</span></li>)}</ol></div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Mes demandes et retours</h2>
        {demandes.length === 0 ? <p className="mt-3 text-small text-ink-3">Aucun dossier ouvert sur cette commande.</p> : (
          <div className="mt-4 grid gap-4">{demandes.map((demande) => (
            <article key={demande.id} className="rounded-well border border-rule p-4">
              <div className="flex flex-wrap justify-between gap-2"><strong>{demande.objet}</strong><span className="text-micro font-semibold text-primary">{libelle(demande.statut)}</span></div>
              <p className="mt-1 text-micro text-ink-3">{demande.reference} · {demande.boutique.nom}</p>

              <ol className="mt-4 grid gap-3" aria-label={`Échanges du dossier ${demande.reference}`}>
                {demande.messages.map((message) => (
                  <li key={message.id} className={`rounded-control p-3 text-small ${message.auteurType === 'client' ? 'bg-space' : 'border border-rule'}`}>
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><b>{AUTEURS[message.auteurType] ?? 'Intervenant'}</b><time dateTime={message.creeLe} className="text-micro text-ink-3">{date(message.creeLe)}</time></p>
                    <p className="mt-1 whitespace-pre-line break-words">{message.contenu}</p>
                    {message.pieces.length ? <ul className="mt-2 flex flex-wrap gap-2">{message.pieces.map((piece) => (
                      <li key={piece.id}><button type="button" className="min-h-11 text-small font-semibold text-secondary underline" onClick={() => void telechargerPiece(demande.id, piece)}>{piece.nomCapture} · {taillePiece(piece.tailleOctets)}</button></li>
                    ))}</ul> : null}
                  </li>
                ))}
              </ol>

              {demande.retour ? <RetourResume retour={demande.retour} /> : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {demande.capacites.repondre ? <button type="button" onClick={() => ouvrir({ type: 'message', demande })} className="min-h-11 rounded-control bg-ink px-4 text-small font-semibold text-white">Répondre</button> : null}
                <label className="inline-flex min-h-11 cursor-pointer items-center rounded-control border border-rule px-4 text-small font-semibold focus-within:outline focus-within:outline-2">
                  Joindre des preuves
                  <input type="file" multiple accept={TYPES_PIECES.join(',')} className="sr-only" onChange={(event) => { choisirPieces(demande, event.currentTarget.files); event.currentTarget.value = '' }} />
                </label>
                {demande.retour && demande.capacites.expedier ? <button type="button" onClick={() => ouvrir({ type: 'expedition', demande, retour: demande.retour! })} className="min-h-11 rounded-control bg-secondary px-4 text-small font-semibold">Déclarer le colis expédié</button> : null}
                {demande.retour && demande.capacites.contester ? <button type="button" onClick={() => ouvrir({ type: 'contestation', demande, retour: demande.retour! })} className="min-h-11 rounded-control border border-warn px-4 text-small font-semibold text-warn">Contester la décision</button> : null}
                {!demande.retour && demande.ligne && demande.ligne.quantiteLivree > demande.ligne.quantiteRetournee ? <button type="button" onClick={() => ouvrir({ type: 'retour', demande })} className="min-h-11 rounded-control border border-rule px-4 text-small font-semibold">Demander un retour</button> : null}
              </div>
              <p className="mt-2 text-micro text-ink-3">PDF, JPEG, PNG ou WebP · 10 Mio maximum · {PIECES_MAX_PAR_MESSAGE} fichiers par envoi.</p>
            </article>
          ))}</div>
        )}
      </section>

      <FenetreAction
        ouverte={fenetre?.type === 'ouverture'}
        titre={fenetre?.type === 'ouverture' ? `Signaler un problème : ${fenetre.ligne.offreTitreCapture}` : ''}
        description="La boutique est prévenue et dispose d’un délai pour répondre. Vous pourrez ensuite joindre des photos."
        libelleValider="Ouvrir la demande"
        onFermer={() => setFenetre(null)}
        onValider={ouvrirDemande}
      >
        <label className="block text-small font-semibold">Catégorie<select name="categorie" required className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal">{CATEGORIES.map(([valeur, texte]) => <option key={valeur} value={valeur}>{texte}</option>)}</select></label>
        <ChampTexte nom="objet" libelle="Objet" aide="5 à 180 caractères." required minLength={5} maxLength={180} />
        <ChampTexte nom="description" libelle="Description" aide="Ce que vous avez constaté, et quand. 10 caractères minimum." multiligne required minLength={10} maxLength={5000} />
      </FenetreAction>

      <FenetreAction
        ouverte={fenetre?.type === 'message'}
        titre="Répondre"
        libelleValider="Envoyer le message"
        onFermer={() => setFenetre(null)}
        onValider={(donnees) => (fenetre?.type === 'message' ? repondre(fenetre.demande, donnees) : Promise.resolve())}
      >
        <ChampTexte nom="contenu" libelle="Votre message" multiligne required minLength={2} maxLength={5000} />
      </FenetreAction>

      <FenetreAction
        ouverte={fenetre?.type === 'retour'}
        titre="Demander un retour"
        description="La boutique accepte ou refuse le retour. S’il est accepté, vous indiquerez ensuite la référence d’expédition du colis."
        libelleValider="Demander le retour"
        onFermer={() => setFenetre(null)}
        onValider={(donnees) => (fenetre?.type === 'retour' ? demanderRetour(fenetre.demande, donnees) : Promise.resolve())}
      >
        {fenetre?.type === 'retour' && fenetre.demande.ligne ? (
          <ChampTexte nom="quantite" libelle="Quantité à retourner" inputMode="numeric" required pattern="[1-9][0-9]*" defaultValue="1"
            aide={`Au plus ${fenetre.demande.ligne.quantiteLivree - fenetre.demande.ligne.quantiteRetournee} pour ${fenetre.demande.ligne.offreTitreCapture}.`} />
        ) : null}
        <ChampTexte nom="motif" libelle="Motif du retour" aide="10 caractères minimum." multiligne required minLength={10} maxLength={1000} />
      </FenetreAction>

      <FenetreAction
        ouverte={fenetre?.type === 'expedition'}
        titre="Déclarer le colis expédié"
        description="La référence permet à la boutique de suivre le colis. Elle ne pourra plus être modifiée."
        libelleValider="Enregistrer l’expédition"
        onFermer={() => setFenetre(null)}
        onValider={(donnees) => (fenetre?.type === 'expedition' ? expedierRetour(fenetre.retour, donnees) : Promise.resolve())}
      >
        <ChampTexte nom="referenceRetour" libelle="Référence de suivi du colis retour" required minLength={3} maxLength={120} />
      </FenetreAction>

      <FenetreAction
        ouverte={fenetre?.type === 'contestation'}
        titre="Contester la décision"
        description="KatiMarket examine les échanges et les preuves du dossier, puis rend une décision qui s’impose aux deux parties."
        libelleValider="Envoyer la contestation"
        irreversible="Je comprends qu’une contestation ne peut être ouverte qu’une seule fois sur ce retour, et que la décision de KatiMarket sera définitive."
        onFermer={() => setFenetre(null)}
        onValider={(donnees) => (fenetre?.type === 'contestation' ? contesterRetour(fenetre.retour, donnees) : Promise.resolve())}
      >
        <ChampTexte nom="motif" libelle="Pourquoi contestez-vous ?" aide="10 caractères minimum." multiligne required minLength={10} maxLength={1000} />
      </FenetreAction>

      <FenetreAction
        ouverte={fenetre?.type === 'pieces'}
        titre="Joindre des preuves"
        description="Vérifiez les fichiers : une fois jointes, les pièces restent au dossier et ne peuvent pas être retirées."
        libelleValider={fenetre?.type === 'pieces' ? `Joindre ${fenetre.verification.acceptees.length} fichier(s)` : 'Joindre'}
        onFermer={() => setFenetre(null)}
        onValider={() => (fenetre?.type === 'pieces' && fenetre.verification.acceptees.length
          ? envoyerPieces(fenetre.demande, fenetre.message, fenetre.verification.acceptees)
          : Promise.reject(new Error('Aucun fichier valide à joindre.')))}
      >
        {fenetre?.type === 'pieces' ? <ApercuPieces verification={fenetre.verification} /> : null}
      </FenetreAction>

      <Link href="/compte/commandes" className="mt-10 inline-flex text-small text-secondary underline">← Toutes mes commandes</Link>
    </main>
  )
}

function RetourResume({ retour }: { retour: Retour }) {
  const motif = retour.motifArbitrage ?? retour.motifDecision
  return (
    <div className="mt-4 rounded-control bg-space p-3 text-small">
      <p><b>Retour :</b> {libelle(retour.statut)}{retour.montantRembourseFcfa ? ` · ${formatPrice(retour.montantRembourseFcfa)} remboursés` : ''}</p>
      {retour.referenceRetour ? <p className="mt-1 text-micro text-ink-3">Colis retour : {retour.referenceRetour}</p> : null}
      {motif ? <p className="mt-1 text-micro text-ink-2">{retour.motifArbitrage ? 'Décision de KatiMarket' : 'Motif de la boutique'} : {motif}</p> : null}
      {retour.motifContestation ? <p className="mt-1 text-micro text-ink-2">Votre contestation : {retour.motifContestation}</p> : null}
    </div>
  )
}

function libelle(valeur: string) { return valeur.replaceAll('_', ' ') }
function date(valeur: string) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur)) }
