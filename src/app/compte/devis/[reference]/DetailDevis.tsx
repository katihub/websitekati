'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { normalisePhone, useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible, telechargerApi } from '@/lib/api'
import { LIBELLES_DEVIS, LIBELLES_PARTIE, dateCourte, fcfa, type DevisMarketplace, type PartieDevis } from '@/lib/devis-marketplace'
import { useLocalites } from '@/lib/localites'
import { LIBELLE_MODE, livraisonADomicile, type DeliveryMode } from '@/lib/modes-livraison'
import { memoriserSuivi, useJetonSuivi } from '@/lib/suivi'
import { useMarketplaceLanguage } from '@/lib/language'

/**
 * UN DEVIS MARKETPLACE, VU PAR SON CLIENT.
 *
 * Une section par boutique, avec sa reponse. Le client coche les parties
 * confirmees qu'il retient, donne son adresse et le mode de livraison de
 * chaque boutique, et accepte : la commande est creee au prix du devis et il
 * passe au paiement de l'acompte, comme pour toute commande.
 *
 * SANS COMPTE (`sansCompte`), le devis s'ouvre par le jeton de son lien : les
 * memes ecrans, servis par les routes `sans-compte` du backend.
 */
const ton = (statut: PartieDevis['statut']) =>
  statut === 'confirmee' || statut === 'acceptee' ? 'border-primary text-primary' : statut === 'refusee' ? 'border-warn text-warn' : 'border-rule text-ink-2'

function intersection(listes: string[][]) {
  return listes.length ? listes.reduce((commun, liste) => commun.filter((v) => liste.includes(v))) : []
}

export function DetailDevis({ reference, sansCompte = false, jetonUrl }: { reference: string; sansCompte?: boolean; jetonUrl?: string }) {
  const { locale } = useMarketplaceLanguage()
  const en = locale === 'en'
  const { open: ouvrirCompte } = useAccount()
  const router = useRouter()
  const localites = useLocalites()
  // Sans compte : le jeton du lien, ou celui garde par ce navigateur ; `undefined` tant qu'il n'est pas resolu.
  const jeton = useJetonSuivi(reference, jetonUrl, sansCompte)
  const base = sansCompte ? `/marketplace/devis/sans-compte/${encodeURIComponent(reference)}` : `/marketplace/devis/${encodeURIComponent(reference)}`
  const acces = jeton ? { jetonSuivi: jeton } : {}
  const [devis, setDevis] = useState<DevisMarketplace | null>(null)
  const [erreur, setErreur] = useState('')
  const [connexion, setConnexion] = useState(false)
  const [retenues, setRetenues] = useState<string[] | null>(null)
  const [modes, setModes] = useState<Record<string, DeliveryMode>>({})
  const [notesAgence, setNotesAgence] = useState<Record<string, string>>({})
  const [adresse, setAdresse] = useState({ ville: '', quartier: '', repere: '', telephone: '' })
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ type: 'erreur' | 'info'; texte: string; actualiser?: boolean } | null>(null)
  const verrou = useRef(false)

  const charger = useCallback(async () => {
    if (sansCompte && !jeton) {
      if (jeton === null) setErreur('Ce devis s’ouvre avec le lien reçu par e-mail.')
      return
    }
    try {
      setDevis(await api<DevisMarketplace>(base, jeton ? { jetonSuivi: jeton } : {}))
      setErreur('')
    } catch (e) {
      if (e instanceof ErreurApi && e.code === 401) setConnexion(true)
      else setErreur(e instanceof ErreurApi ? e.message : 'Ce devis n’a pas pu être chargé.')
    }
  }, [base, sansCompte, jeton])

  useEffect(() => {
    if (!apiDisponible || jeton === undefined) return
    const minuterie = window.setTimeout(() => void charger(), 0)
    return () => window.clearTimeout(minuterie)
  }, [charger, jeton])

  const acceptables = useMemo(() => devis?.parties.filter((p) => p.acceptable) ?? [], [devis])
  const choisies = acceptables.filter((p) => (retenues ?? acceptables.map((a) => a.id)).includes(p.id))
  const modeDe = (p: PartieDevis): DeliveryMode => modes[p.id] && p.livraison.modes.includes(modes[p.id]!) ? modes[p.id]! : p.livraison.modes[0]!
  // Seule une livraison a domicile depend des villes desservies ; le retrait et l'agence vont partout.
  const aDomicile = choisies.some((p) => livraisonADomicile(modeDe(p)))
  const communes = intersection(choisies.filter((p) => livraisonADomicile(modeDe(p))).map((p) => p.livraison.villes))
  const villes = aDomicile ? communes : [...new Set([...localites.map((l) => l.ville), ...choisies.flatMap((p) => p.livraison.villes)])]
  const enAgence = choisies.some((p) => modeDe(p) === 'agence')
  const ville = villes.includes(adresse.ville) ? adresse.ville : villes[0] ?? ''
  const totalRetenu = choisies.reduce((s, p) => s + p.totalFcfa, 0)

  if (connexion) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">{en ? 'Sign in to view this quote.' : 'Connectez-vous pour consulter ce devis.'}</p>
      <button type="button" onClick={ouvrirCompte} className="press mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">{en ? 'Sign in' : 'Se connecter'}</button>
    </div>
  }
  if (!devis && !erreur) return <p className="text-small text-ink-3" role="status">{en ? 'Loading quote…' : 'Chargement du devis…'}</p>
  if (!devis) return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{erreur}</p>{sansCompte ? null : <Link href="/compte/devis" className="mt-3 inline-flex text-micro text-secondary underline">← {en ? 'My quotes' : 'Mes devis'}</Link>}</div>

  async function telecharger() {
    try { await telechargerApi(`${base}/pdf`, `devis-${reference}.pdf`, acces) }
    catch (e) { setMessage({ type: 'erreur', texte: e instanceof ErreurApi ? e.message : 'Le PDF n’a pas pu être téléchargé.' }) }
  }

  async function actualiser() {
    setEnvoi(true); setMessage(null)
    try {
      setDevis(await api<DevisMarketplace>(`${base}/actualisation`, { methode: 'POST', ...acces }))
      setMessage({ type: 'info', texte: 'Les prix du devis ont été mis à jour avec les prix publiés.' })
    } catch (e) { setMessage({ type: 'erreur', texte: e instanceof ErreurApi ? e.message : 'L’actualisation a échoué.' }) }
    finally { setEnvoi(false) }
  }

  async function accepter(event: FormEvent) {
    event.preventDefault()
    if (verrou.current || !devis) return
    const telephone = normalisePhone(adresse.telephone)
    if (!choisies.length) return setMessage({ type: 'erreur', texte: 'Choisissez au moins une boutique à retenir.' })
    if (!ville) return setMessage({ type: 'erreur', texte: 'Les boutiques retenues ne livrent pas une même ville : retenez-les séparément.' })
    if (aDomicile && (adresse.quartier.trim().length < 2 || adresse.repere.trim().length < 3)) return setMessage({ type: 'erreur', texte: 'Indiquez un quartier et un repère précis pour la livraison.' })
    const sansNote = choisies.find((p) => modeDe(p) === 'agence' && (notesAgence[p.id] ?? '').trim().length < 3)
    if (sansNote) return setMessage({ type: 'erreur', texte: `Précisez l’agence de voyage où ${sansNote.boutique.nom} doit déposer votre colis.` })
    if (!telephone) return setMessage({ type: 'erreur', texte: 'Indiquez un numéro camerounais valide, commençant par 6.' })
    verrou.current = true; setEnvoi(true); setMessage(null)
    try {
      const resultat = await api<{ reference: string; commande: string; jetonCommande?: string }>(`${base}/acceptation`, {
        methode: 'POST',
        ...acces,
        corps: {
          partieIds: choisies.map((p) => p.id),
          livraisons: choisies.map((p) => ({ boutiqueId: p.boutiqueId, mode: modeDe(p), ...(modeDe(p) === 'agence' ? { noteAgence: notesAgence[p.id]!.trim() } : {}) })),
          adresse: { ville, ...(aDomicile ? { quartier: adresse.quartier.trim(), repere: adresse.repere.trim() } : {}), telephoneDestinataire: telephone },
        },
      })
      if (resultat.jetonCommande) memoriserSuivi(resultat.commande, resultat.jetonCommande)
      router.push(`/marketplace/commande/${encodeURIComponent(resultat.commande)}/paiement${resultat.jetonCommande ? `?suivi=${encodeURIComponent(resultat.jetonCommande)}` : ''}`)
    } catch (e) {
      const prix = e instanceof ErreurApi && e.code === 409 && /actualisez/i.test(e.message)
      setMessage({ type: 'erreur', texte: e instanceof ErreurApi ? e.message : 'La réponse n’a pas été reçue. Réessayez : une même acceptation ne crée pas deux commandes.', actualiser: prix })
      verrou.current = false; setEnvoi(false)
    }
  }

  return <div className="grid gap-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {sansCompte ? <p className="text-micro text-ink-3">{en ? 'Guest quote · keep the email link to return to this page.' : 'Devis sans compte · gardez le lien reçu par e-mail, il ouvre cette page.'}</p> : <Link href="/compte/devis" className="text-micro text-secondary underline underline-offset-2">← {en ? 'My quotes' : 'Mes devis'}</Link>}
        <h1 className="mt-2 text-h3 font-semibold text-ink">{en ? 'Quote' : 'Devis'} <span className="t-num">{devis.reference}</span></h1>
        <p className="text-small text-ink-2">{en ? 'Requested on ' : 'Demandé le '}{new Intl.DateTimeFormat(en ? 'en-CM' : 'fr-CM').format(new Date(devis.creeLe))}{devis.entreprise ? `${en ? ' for ' : ' pour '}${devis.entreprise}` : ''} · {en ? devis.statut.replaceAll('_', ' ') : LIBELLES_DEVIS[devis.statut]}</p>
      </div>
      <button type="button" onClick={() => void telecharger()} className="press min-h-11 rounded-control border border-rule px-4 text-small font-semibold" data-testid="devis-pdf">{en ? 'Download PDF' : 'Télécharger le PDF'}</button>
    </header>

    {devis.statut === 'accepte' && devis.commande ? <p className="rounded-well border border-primary p-4 text-small" role="status">
      {en ? 'This quote became order ' : 'Ce devis est devenu la commande '}<b className="t-num">{devis.commande.reference}</b>. <Link className="text-secondary underline" href={`/marketplace/commande/${encodeURIComponent(devis.commande.reference)}/paiement`}>{en ? 'View order and payment' : 'Voir la commande et son paiement'}</Link>
    </p> : null}
    {!devis.prixAJour && devis.statut === 'ouvert' ? <p className="rounded-well border border-warn p-4 text-small text-warn" role="status">
      {en ? 'Some prices have changed since your request. ' : 'Certains prix ont changé depuis votre demande. '}<button type="button" className="font-semibold underline" disabled={envoi} onClick={() => void actualiser()}>{en ? 'Refresh quote' : 'Actualiser le devis'}</button>
    </p> : null}

    <section className="grid gap-4" aria-label="Parties du devis par boutique">
      {devis.parties.map((partie) => <article key={partie.id} className="rounded-well border border-rule p-4" data-testid={`partie-${partie.reference}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h4 font-semibold"><Link href={`/boutiques/${partie.boutique.slug}`} className="hover:underline">{partie.boutique.nom}</Link>{partie.boutique.ville ? <span className="font-normal text-ink-3"> · {partie.boutique.ville}</span> : null}</h2>
            <p className="t-num text-micro text-ink-3">{partie.reference}</p>
          </div>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-semibold ${ton(partie.statut)}`}>{partie.expiree ? 'Réponse expirée' : LIBELLES_PARTIE[partie.statut]}</span>
        </div>
        <table className="mt-3 w-full text-small">
          <thead><tr className="text-left text-micro text-ink-3"><th className="py-1 font-semibold">Article</th><th className="py-1 text-right font-semibold">Quantité</th><th className="py-1 text-right font-semibold">Prix unitaire</th><th className="py-1 text-right font-semibold">Total</th></tr></thead>
          <tbody>{partie.lignes.map((ligne) => {
            const confirmee = ligne.quantiteConfirmee !== null && (partie.statut === 'confirmee' || partie.statut === 'acceptee')
            return <tr key={ligne.id} className="border-t border-rule">
              <td className="py-2 pr-2">{ligne.offreTitreCapture}{ligne.libelleVarianteCapture ? <span className="text-ink-3"> — {ligne.libelleVarianteCapture}</span> : null}{ligne.prixActuelFcfa !== null && ligne.prixActuelFcfa !== ligne.prixUnitaireFcfa ? <span className="block text-micro text-warn">Prix actuel : {fcfa(ligne.prixActuelFcfa)}</span> : null}</td>
              <td className="t-num py-2 text-right">{confirmee && ligne.quantiteConfirmee !== ligne.quantiteDemandee ? <><b>{ligne.quantiteConfirmee}</b><span className="text-ink-3"> / {ligne.quantiteDemandee}</span></> : confirmee ? ligne.quantiteConfirmee : ligne.quantiteDemandee}</td>
              <td className="t-num py-2 text-right">{fcfa(ligne.prixUnitaireFcfa)}</td>
              <td className="t-num py-2 text-right">{fcfa(ligne.totalFcfa)}</td>
            </tr>
          })}</tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 text-small">
          <div className="grid gap-1 text-ink-2">
            {partie.delaiLivraisonJours !== null && partie.statut !== 'refusee' ? <span>Délai annoncé : {partie.delaiLivraisonJours} jour(s)</span> : null}
            {partie.valideJusquau && partie.statut === 'confirmee' ? <span>Réponse valable jusqu’au {dateCourte(partie.valideJusquau)}</span> : null}
            {partie.messageVendeur ? <span>« {partie.messageVendeur} »</span> : null}
            {partie.motifRefus ? <span className="text-warn">Motif : {partie.motifRefus}</span> : null}
            {partie.statut === 'en_attente' ? <span>La boutique n’a pas encore répondu.</span> : null}
          </div>
          <b className="t-num">{partie.statut === 'refusee' ? '—' : fcfa(partie.totalFcfa)}</b>
        </div>
      </article>)}
    </section>

    {devis.statut === 'ouvert' && acceptables.length ? <form onSubmit={(event) => void accepter(event)} className="grid gap-4 rounded-well border border-ink p-4" aria-labelledby="accepter-titre" data-testid="accepter-devis">
      <h2 id="accepter-titre" className="text-h4 font-semibold">Accepter le devis et commander</h2>
      <fieldset className="grid gap-2">
        <legend className="text-small font-semibold">Boutiques retenues</legend>
        {acceptables.map((partie) => <div key={partie.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-rule p-3">
          <label className="flex items-center gap-2 text-small">
            <input type="checkbox" className="size-5" checked={choisies.some((p) => p.id === partie.id)} onChange={(event) => {
              const actuelles = retenues ?? acceptables.map((a) => a.id)
              setRetenues(event.currentTarget.checked ? [...actuelles, partie.id] : actuelles.filter((id) => id !== partie.id))
            }} />
            {partie.boutique.nom} · <span className="t-num">{fcfa(partie.totalFcfa)}</span>
          </label>
          <select aria-label={`Livraison ${partie.boutique.nom}`} value={modeDe(partie)} onChange={(event) => setModes({ ...modes, [partie.id]: event.currentTarget.value as DeliveryMode })} className="min-h-11 rounded-control border border-rule bg-surface px-3 text-small">
            {partie.livraison.modes.map((mode) => <option key={mode} value={mode}>{LIBELLE_MODE[mode]}</option>)}
          </select>
          {modeDe(partie) === 'agence' && choisies.some((p) => p.id === partie.id) ? <label className="w-full text-small font-semibold">Agence de voyage choisie
            <input value={notesAgence[partie.id] ?? ''} onChange={(event) => setNotesAgence({ ...notesAgence, [partie.id]: event.currentTarget.value })} maxLength={500} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="Ex. Général Express, gare de Bafoussam" />
          </label> : null}
        </div>)}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-small font-semibold">Ville de livraison
          <select value={ville} onChange={(event) => setAdresse({ ...adresse, ville: event.currentTarget.value })} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" disabled={!villes.length}>
            {villes.length ? villes.map((v) => <option key={v} value={v}>{v}</option>) : <option value="">Aucune ville commune</option>}
          </select>
        </label>
        {aDomicile ? <><label className="text-small font-semibold">Quartier
          <input value={adresse.quartier} onChange={(event) => setAdresse({ ...adresse, quartier: event.currentTarget.value })} maxLength={80} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="Bonanjo" />
        </label>
        <label className="text-small font-semibold sm:col-span-2">Repère
          <input value={adresse.repere} onChange={(event) => setAdresse({ ...adresse, repere: event.currentTarget.value })} maxLength={240} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="Immeuble, entrée, point de repère" />
        </label></> : null}
        <label className="text-small font-semibold">Téléphone du destinataire
          <input value={adresse.telephone} onChange={(event) => setAdresse({ ...adresse, telephone: event.currentTarget.value })} inputMode="tel" autoComplete="tel" className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="6XX XX XX XX" />
        </label>
      </div>
      {message ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className={`rounded-control border p-3 text-small ${message.type === 'erreur' ? 'border-warn text-warn' : 'border-primary text-primary'}`}>
        {message.texte}{message.actualiser ? <> <button type="button" className="font-semibold underline" onClick={() => void actualiser()}>Actualiser le devis</button></> : null}
      </p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-2">Total retenu : <b className="t-num text-ink">{fcfa(totalRetenu)}</b> · {enAgence ? 'l’expédition en agence se paie en totalité à la commande.' : 'un acompte sera demandé, le solde à la livraison.'}</p>
        <button type="submit" disabled={envoi || !choisies.length} className="press min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface disabled:opacity-50">{envoi ? 'Création de la commande…' : 'Accepter et commander'}</button>
      </div>
    </form> : null}
    {message && !(devis.statut === 'ouvert' && acceptables.length) ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className="text-small text-ink-2">{message.texte}</p> : null}
  </div>
}
