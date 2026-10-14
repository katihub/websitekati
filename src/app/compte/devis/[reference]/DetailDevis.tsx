'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { normalisePhone, useAccount } from '@/lib/account'
import { ErreurApi, api, apiDisponible, telechargerApi } from '@/lib/api'
import { LIBELLES_DEVIS, LIBELLES_PARTIE, dateCourte, fcfa, type DevisMarketplace, type PartieDevis } from '@/lib/devis-marketplace'

/**
 * UN DEVIS MARKETPLACE, VU PAR SON CLIENT.
 *
 * Une section par boutique, avec sa reponse. Le client coche les parties
 * confirmees qu'il retient, donne son adresse et le mode de livraison de
 * chaque boutique, et accepte : la commande est creee au prix du devis et il
 * passe au paiement de l'acompte, comme pour toute commande.
 */

const MODES: Record<'vendeur' | 'katihub', string> = { katihub: 'Livraison KatiHub', vendeur: 'Livraison par la boutique' }
const ton = (statut: PartieDevis['statut']) =>
  statut === 'confirmee' || statut === 'acceptee' ? 'border-primary text-primary' : statut === 'refusee' ? 'border-warn text-warn' : 'border-rule text-ink-2'

function intersection(listes: string[][]) {
  return listes.length ? listes.reduce((commun, liste) => commun.filter((v) => liste.includes(v))) : []
}

export function DetailDevis({ reference }: { reference: string }) {
  const { open: ouvrirCompte } = useAccount()
  const router = useRouter()
  const [devis, setDevis] = useState<DevisMarketplace | null>(null)
  const [erreur, setErreur] = useState('')
  const [connexion, setConnexion] = useState(false)
  const [retenues, setRetenues] = useState<string[] | null>(null)
  const [modes, setModes] = useState<Record<string, 'vendeur' | 'katihub'>>({})
  const [adresse, setAdresse] = useState({ ville: '', quartier: '', repere: '', telephone: '' })
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ type: 'erreur' | 'info'; texte: string; actualiser?: boolean } | null>(null)
  const verrou = useRef(false)

  const charger = useCallback(async () => {
    try {
      setDevis(await api<DevisMarketplace>(`/marketplace/devis/${encodeURIComponent(reference)}`))
      setErreur('')
    } catch (e) {
      if (e instanceof ErreurApi && e.code === 401) setConnexion(true)
      else setErreur(e instanceof ErreurApi ? e.message : 'Ce devis n’a pas pu être chargé.')
    }
  }, [reference])

  useEffect(() => {
    if (!apiDisponible) return
    const minuterie = window.setTimeout(() => void charger(), 0)
    return () => window.clearTimeout(minuterie)
  }, [charger])

  const acceptables = useMemo(() => devis?.parties.filter((p) => p.acceptable) ?? [], [devis])
  const choisies = acceptables.filter((p) => (retenues ?? acceptables.map((a) => a.id)).includes(p.id))
  const villes = intersection(choisies.map((p) => p.livraison.villes))
  const ville = villes.includes(adresse.ville) ? adresse.ville : villes[0] ?? ''
  const totalRetenu = choisies.reduce((s, p) => s + p.totalFcfa, 0)

  if (connexion) {
    return <div className="rounded-well border border-rule bg-space p-4">
      <p className="text-small text-ink">Connectez-vous pour consulter ce devis.</p>
      <button type="button" onClick={ouvrirCompte} className="press mt-4 inline-flex min-h-11 items-center rounded-control bg-secondary px-5 text-small font-bold text-on-surface">Se connecter</button>
    </div>
  }
  if (!devis && !erreur) return <p className="text-small text-ink-3" role="status">Chargement du devis…</p>
  if (!devis) return <div className="rounded-well border border-rule bg-space p-4"><p className="text-small text-ink">{erreur}</p><Link href="/compte/devis" className="mt-3 inline-flex text-micro text-secondary underline">← Mes devis</Link></div>

  async function telecharger() {
    try { await telechargerApi(`/marketplace/devis/${encodeURIComponent(reference)}/pdf`, `devis-${reference}.pdf`) }
    catch (e) { setMessage({ type: 'erreur', texte: e instanceof ErreurApi ? e.message : 'Le PDF n’a pas pu être téléchargé.' }) }
  }

  async function actualiser() {
    setEnvoi(true); setMessage(null)
    try {
      setDevis(await api<DevisMarketplace>(`/marketplace/devis/${encodeURIComponent(reference)}/actualisation`, { methode: 'POST' }))
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
    if (adresse.quartier.trim().length < 2 || adresse.repere.trim().length < 3) return setMessage({ type: 'erreur', texte: 'Indiquez un quartier et un repère précis pour la livraison.' })
    if (!telephone) return setMessage({ type: 'erreur', texte: 'Indiquez un numéro camerounais valide, commençant par 6.' })
    verrou.current = true; setEnvoi(true); setMessage(null)
    try {
      const resultat = await api<{ reference: string; commande: string }>(`/marketplace/devis/${encodeURIComponent(reference)}/acceptation`, {
        methode: 'POST',
        corps: {
          partieIds: choisies.map((p) => p.id),
          livraisons: choisies.map((p) => ({ boutiqueId: p.boutiqueId, mode: modes[p.id] && p.livraison.modes.includes(modes[p.id]!) ? modes[p.id] : p.livraison.modes[0] })),
          adresse: { ville, quartier: adresse.quartier.trim(), repere: adresse.repere.trim(), telephoneDestinataire: telephone },
        },
      })
      router.push(`/marketplace/commande/${encodeURIComponent(resultat.commande)}/paiement`)
    } catch (e) {
      const prix = e instanceof ErreurApi && e.code === 409 && /actualisez/i.test(e.message)
      setMessage({ type: 'erreur', texte: e instanceof ErreurApi ? e.message : 'La réponse n’a pas été reçue. Réessayez : une même acceptation ne crée pas deux commandes.', actualiser: prix })
      verrou.current = false; setEnvoi(false)
    }
  }

  return <div className="grid gap-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Link href="/compte/devis" className="text-micro text-secondary underline underline-offset-2">← Mes devis</Link>
        <h1 className="mt-2 text-h3 font-semibold text-ink">Devis <span className="t-num">{devis.reference}</span></h1>
        <p className="text-small text-ink-2">Demandé le {dateCourte(devis.creeLe)}{devis.entreprise ? ` pour ${devis.entreprise}` : ''} · {LIBELLES_DEVIS[devis.statut]}</p>
      </div>
      <button type="button" onClick={() => void telecharger()} className="press min-h-11 rounded-control border border-rule px-4 text-small font-semibold" data-testid="devis-pdf">Télécharger le PDF</button>
    </header>

    {devis.statut === 'accepte' && devis.commande ? <p className="rounded-well border border-primary p-4 text-small" role="status">
      Ce devis est devenu la commande <b className="t-num">{devis.commande.reference}</b>. <Link className="text-secondary underline" href={`/marketplace/commande/${encodeURIComponent(devis.commande.reference)}/paiement`}>Voir la commande et son paiement</Link>
    </p> : null}
    {!devis.prixAJour && devis.statut === 'ouvert' ? <p className="rounded-well border border-warn p-4 text-small text-warn" role="status">
      Certains prix ont changé depuis votre demande. <button type="button" className="font-semibold underline" disabled={envoi} onClick={() => void actualiser()}>Actualiser le devis</button>
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
          <select aria-label={`Livraison ${partie.boutique.nom}`} value={modes[partie.id] ?? partie.livraison.modes[0]} onChange={(event) => setModes({ ...modes, [partie.id]: event.currentTarget.value as 'vendeur' | 'katihub' })} className="min-h-11 rounded-control border border-rule bg-surface px-3 text-small">
            {partie.livraison.modes.map((mode) => <option key={mode} value={mode}>{MODES[mode]}</option>)}
          </select>
        </div>)}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-small font-semibold">Ville de livraison
          <select value={ville} onChange={(event) => setAdresse({ ...adresse, ville: event.currentTarget.value })} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" disabled={!villes.length}>
            {villes.length ? villes.map((v) => <option key={v} value={v}>{v}</option>) : <option value="">Aucune ville commune</option>}
          </select>
        </label>
        <label className="text-small font-semibold">Quartier
          <input value={adresse.quartier} onChange={(event) => setAdresse({ ...adresse, quartier: event.currentTarget.value })} maxLength={80} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="Bonanjo" />
        </label>
        <label className="text-small font-semibold sm:col-span-2">Repère
          <input value={adresse.repere} onChange={(event) => setAdresse({ ...adresse, repere: event.currentTarget.value })} maxLength={240} className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="Immeuble, entrée, point de repère" />
        </label>
        <label className="text-small font-semibold">Téléphone du destinataire
          <input value={adresse.telephone} onChange={(event) => setAdresse({ ...adresse, telephone: event.currentTarget.value })} inputMode="tel" autoComplete="tel" className="mt-1 block min-h-11 w-full rounded-control border border-rule bg-surface px-3 text-small font-normal" placeholder="6XX XX XX XX" />
        </label>
      </div>
      {message ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className={`rounded-control border p-3 text-small ${message.type === 'erreur' ? 'border-warn text-warn' : 'border-primary text-primary'}`}>
        {message.texte}{message.actualiser ? <> <button type="button" className="font-semibold underline" onClick={() => void actualiser()}>Actualiser le devis</button></> : null}
      </p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-2">Total retenu : <b className="t-num text-ink">{fcfa(totalRetenu)}</b> · un acompte sera demandé, le solde à la livraison.</p>
        <button type="submit" disabled={envoi || !choisies.length} className="press min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface disabled:opacity-50">{envoi ? 'Création de la commande…' : 'Accepter et commander'}</button>
      </div>
    </form> : null}
    {message && !(devis.statut === 'ouvert' && acceptables.length) ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className="text-small text-ink-2">{message.texte}</p> : null}
  </div>
}
