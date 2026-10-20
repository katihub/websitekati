'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { ErreurApi, api, apiDisponible } from '@/lib/api'
import { formatKati } from '@/lib/kati'
import { estCodeParrainage, lireParrainageGarde, normaliserCode, rattacher, type MonParrainage } from '@/lib/parrainage'

const date = (valeur: string) => new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(valeur))
const pourcentage = (bps: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(bps / 100)} %`

/**
 * « PARRAINEZ VOS PROCHES ». Le code et le lien du client, a partager ; ses
 * filleuls et ses commissions ; et, tant qu'il n'a ni parrain ni commande
 * livree, la saisie du code de la personne qui l'a invite.
 */
export function CarteParrainage() {
  const [parrainage, setParrainage] = useState<MonParrainage | null>(null)
  const [saisie, setSaisie] = useState('')
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [copie, setCopie] = useState(false)

  useEffect(() => {
    if (!apiDisponible) return
    let actif = true
    api<MonParrainage>('/marketplace/kati/parrainage')
      .then((valeur) => {
        if (!actif) return
        setParrainage(valeur)
        // Le code du lien suivi avant l'inscription est propose d'office.
        if (valeur.peutEtreParraine) setSaisie(lireParrainageGarde()?.code ?? '')
      })
      .catch(() => { /* la page des KATI reste utilisable sans la carte */ })
    return () => { actif = false }
  }, [])

  if (!parrainage) return null

  async function valider(event: FormEvent) {
    event.preventDefault()
    if (!parrainage || !saisie.trim()) return
    setEnvoi(true); setMessage(null)
    try {
      const garde = lireParrainageGarde()
      const resultat = await rattacher(saisie, garde && garde.code === saisie.trim().toUpperCase() ? garde.jeton : undefined)
      setParrainage({ ...parrainage, parrain: resultat, peutEtreParraine: false })
      setMessage({ type: 'succes', texte: `C’est noté : votre parrain sera récompensé de vos commandes jusqu’au ${date(resultat.jusquau)}.` })
    } catch (cause) {
      setMessage({ type: 'erreur', texte: cause instanceof ErreurApi ? cause.message : 'Le code n’a pas pu être enregistré.' })
    } finally {
      setEnvoi(false)
    }
  }

  async function copier() {
    if (!parrainage) return
    try {
      await navigator.clipboard.writeText(parrainage.lien)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2_000)
    } catch { /* presse-papiers indisponible : le lien reste affiche */ }
  }

  const texteWhatsApp = `Je commande sur KatiMarket. Inscris-toi avec mon lien et gagne des KATI sur tes achats : ${parrainage.lien}`

  return (
    <section aria-labelledby="parrainage-titre" className="grid gap-4 rounded-well border border-rule p-5" data-testid="carte-parrainage">
      <div>
        <h2 id="parrainage-titre" className="text-h4 font-semibold text-ink">Parrainez vos proches</h2>
        <p className="mt-1 text-small text-ink-2">
          Chaque commande livrée de vos filleuls vous rapporte <strong className="text-ink">{pourcentage(parrainage.commissionBps)}</strong> de son montant en KATI, pendant {parrainage.dureeMois} mois. Ils gagnent leurs KATI comme tout client.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="text-micro text-ink-3">Votre code</span>
        <strong className="t-num text-h4 tracking-wide text-ink" data-testid="code-parrainage">{parrainage.code}</strong>
        <span className="text-micro text-ink-3">Votre lien</span>
        <span className="break-all text-small text-ink">{parrainage.lien}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copier()} className="press min-h-11 rounded-control border border-rule px-4 text-small font-semibold">{copie ? 'Lien copié' : 'Copier le lien'}</button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texteWhatsApp)}`} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-11 items-center rounded-control bg-secondary px-4 text-small font-bold text-on-surface">Partager sur WhatsApp</a>
      </div>
      <p className="text-small text-ink-2" data-testid="bilan-parrainage">
        {parrainage.filleuls ? `${parrainage.filleuls} filleul${parrainage.filleuls > 1 ? 's' : ''}` : 'Aucun filleul pour l’instant'} · {formatKati(parrainage.commissionsGagnees)} de commissions
      </p>

      {parrainage.parrain ? (
        <p className="rounded-well bg-space p-3 text-micro text-ink-2">Vous avez été parrainé le {date(parrainage.parrain.depuis)} : votre parrain est récompensé de vos commandes jusqu’au {date(parrainage.parrain.jusquau)}.</p>
      ) : parrainage.peutEtreParraine ? (
        <form onSubmit={(event) => void valider(event)} className="grid gap-2 border-t border-rule pt-4">
          <label className="text-small font-semibold text-ink">Quelqu’un vous a invité ? Son code de parrainage
            <input value={saisie} onChange={(event) => setSaisie(normaliserCode(event.currentTarget.value))} minLength={8} maxLength={8} pattern="[A-Z]{2}[0-9]{6}" placeholder="AM482731" autoComplete="off" className="mt-1 w-full rounded-control border border-rule bg-surface p-3 text-small font-normal uppercase" />
          </label>
          <button type="submit" disabled={envoi || !estCodeParrainage(saisie)} className="press min-h-11 justify-self-start rounded-control border border-ink px-4 text-small font-semibold disabled:opacity-50">{envoi ? 'Enregistrement…' : 'Valider le code'}</button>
          <p className="text-micro text-ink-3">Un seul parrain, à choisir avant votre première commande livrée.</p>
        </form>
      ) : null}
      {message ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className={`text-small ${message.type === 'erreur' ? 'text-warn' : 'text-primary'}`}>{message.texte}</p> : null}
    </section>
  )
}
