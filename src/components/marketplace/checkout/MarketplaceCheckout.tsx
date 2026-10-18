'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, ErreurApi } from '@/lib/api'
import { cartLineKey, useCart } from '@/lib/cart'
import { useSession } from '@/lib/session'
import { avecRetour, useIci } from '@/lib/retour'
import { useAccount, normalisePhone } from '@/lib/account'
import { enregistrerAdresse, libelleAdresse, useCarnetAdresses } from '@/lib/carnet-adresses'
import { quartiersDe, useLocalites } from '@/lib/localites'
import { checkedTotal, groupDeliveries, livrableDans, type DeliveryGroup, type MarketplaceOrder } from '@/lib/marketplace-checkout'
import { DESCRIPTION_MODE, LIBELLE_MODE, livraisonADomicile, type DeliveryMode } from '@/lib/modes-livraison'
import { usePolitiqueKati } from '@/lib/kati'
import { estimerReglement, montantAssurance } from '@/lib/reglement'
import { minimumDe } from '@/lib/stock'
import { delaiLivraisonMarketplace } from '@/lib/marketplace-delivery'
import { memoriserSuivi } from '@/lib/suivi'
import { ReglementCommande, useDisponibleKati, useOptionsServices, type ChoixReglement } from './ReglementCommande'
import { ShopIcon } from '../ShopIcon'
import { CheckoutHeading, ProductThumb, Summary, TrustStrip, money } from './CheckoutUi'
import { useCheckedCart } from './useCheckedCart'
import { fraisBoutique, useTarifsLivraison } from './useTarifsLivraison'
import styles from './checkout.module.css'

const AUTRE = '__autre__'
const NOUVELLE = 'nouvelle'
const COURRIEL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * LA COMMANDE EN UNE PAGE (lot 3) : les articles, les coordonnees, la livraison
 * de chaque boutique, les options et le paiement, sans etape intermediaire.
 * Sans compte, le client donne son nom, son telephone et son e-mail : il recoit
 * par e-mail le lien qui suit et paie sa commande.
 */
export function MarketplaceCheckout({ selectedKeys }: { selectedKeys: string[] | null }) {
  const cart = useCart()
  const { session, chargement } = useSession()
  const account = useAccount()
  const router = useRouter()
  const ici = useIci()
  const lines = cart.lines.filter(line => selectedKeys === null || selectedKeys.includes(cartLineKey(line)))
  const { checked, loading, error: serviceError, refresh } = useCheckedCart(lines)
  const groups = groupDeliveries(checked)
  const total = checkedTotal(checked)
  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  const localites = useLocalites()
  const carnet = useCarnetAdresses(Boolean(session))
  const { tarifs, erreur: tarifsErreur, recharger: rechargerTarifs } = useTarifsLivraison()
  const [address, setAddress] = useState({ ville: '', quartier: '', repere: '', telephoneDestinataire: '' })
  const [adresseChoisie, setAdresseChoisie] = useState<string>('')
  const [garderAdresse, setGarderAdresse] = useState(true)
  const [contact, setContact] = useState({ nom: '', telephone: '', courriel: '' })
  const [modes, setModes] = useState<Record<string, DeliveryMode>>({})
  const [notesAgence, setNotesAgence] = useState<Record<string, string>>({})
  const [terms, setTerms] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<{ body: string; key: string } | null>(null)
  const lock = useRef(false)

  // Les villes proposees : celles des listes KatiHub, puis celles des offres et de la grille.
  const villes = [...new Set([
    ...localites.map(l => l.ville),
    ...checked.flatMap(item => item.offer?.villesLivraison ?? []),
    ...(tarifs ?? []).map(t => t.ville),
  ])]
  // Le carnet : l'adresse choisie, ou par defaut la premiere enregistree.
  const enregistree = adresseChoisie === NOUVELLE ? null : carnet.find(a => a.id === adresseChoisie) ?? carnet[0] ?? null
  const adresse = enregistree
    ? { ville: enregistree.ville, quartier: enregistree.quartier ?? '', repere: enregistree.repere ?? '', telephoneDestinataire: enregistree.telephoneDestinataire ?? address.telephoneDestinataire }
    : address
  const ville = adresse.ville || villes[0] || ''
  const quartiers = quartiersDe(localites, ville)
  const quartierLibre = !quartiers.length || (adresse.quartier !== '' && !quartiers.includes(adresse.quartier))

  const limitsExceeded = lines.length > 50 || groups.length > 20
  const groupTotal = (group: DeliveryGroup) => group.lines.reduce((sum, item) => sum + (item.offer?.prixFcfa ?? item.line.price) * item.line.qty, 0)
  /** Les frais de la boutique dans ce mode ; `null` s'il n'est pas proposable ici, avec la raison. */
  function feeFor(group: DeliveryGroup, mode: DeliveryMode): { fee: number | null; raison: string } {
    if (mode === 'retrait') return group.adresseRetrait ? { fee: 0, raison: '' } : { fee: null, raison: 'adresse de retrait à venir' }
    if (livraisonADomicile(mode) && !livrableDans(group, ville)) return { fee: null, raison: `non proposée à ${ville}` }
    if (!tarifs) return { fee: null, raison: '…' }
    const fee = fraisBoutique(tarifs, ville, mode, groupTotal(group))
    return { fee, raison: fee === null ? `non proposée à ${ville}` : '' }
  }
  // Le mode retenu : celui choisi s'il est proposable, sinon le premier qui l'est.
  function deliveryMode(group: DeliveryGroup) {
    const offerts = group.modes.filter(mode => feeFor(group, mode).fee !== null)
    return offerts.includes(modes[group.id]) ? modes[group.id] : offerts[0] ?? group.modes[0]
  }
  const groupFees = groups.map(group => feeFor(group, deliveryMode(group)).fee)
  const fees = tarifs && groupFees.every(fee => fee !== null) ? groupFees.reduce<number>((sum, fee) => sum + (fee ?? 0), 0) : null
  const aDomicile = groups.some(group => livraisonADomicile(deliveryMode(group)))
  const enAgence = groups.some(group => deliveryMode(group) === 'agence')
  const blocked = loading || Boolean(serviceError) || !lines.length || checked.some(item => item.issue) || groups.some(group => !group.modes.length) || !Number.isSafeInteger(total) || limitsExceeded || fees === null

  // Les choix de reglement : l'assurance est cochee par defaut ; l'agence impose le paiement complet.
  const [choix, setChoix] = useState<ChoixReglement>({ mode: 'acompte', assurance: true, installations: [], katiUtilises: 0 })
  const modePaiement = enAgence ? 'complet' : choix.mode
  const options = useOptionsServices(lines.flatMap(line => line.offerId ? [line.offerId] : []))
  const disponibleKati = useDisponibleKati(Boolean(session))
  const politiqueKati = usePolitiqueKati()
  const installationsRetenues = (options?.installations ?? []).filter(installation => choix.installations.includes(installation.categorieId))
  const katiUtilises = session ? choix.katiUtilises : 0
  const reglement = estimerReglement({
    mode: modePaiement,
    produitsFcfa: total,
    fraisFcfa: fees ?? 0,
    assuranceFcfa: choix.assurance && options?.assurance.active ? montantAssurance(total, options.assurance.tauxBps) : 0,
    installationFcfa: installationsRetenues.reduce((sum, installation) => sum + installation.prixFcfa, 0),
    remiseKatiFcfa: politiqueKati && katiUtilises ? katiUtilises / politiqueKati.katiParFcfa : 0,
  })

  function verifier(): string {
    if (blocked) return 'Vérifiez les articles et les options de livraison avant de commander.'
    if (!session) {
      if (contact.nom.trim().length < 2) return 'Indiquez votre nom.'
      if (!normalisePhone(contact.telephone)) return 'Indiquez votre numéro de mobile camerounais, commençant par 6.'
      if (!COURRIEL.test(contact.courriel.trim())) return 'Indiquez votre adresse e-mail : le lien de suivi de la commande y sera envoyé.'
    }
    if (aDomicile && (adresse.quartier.trim().length < 2 || adresse.repere.trim().length < 3)) return 'Indiquez un quartier et un repère suffisamment précis pour la livraison.'
    if (!normalisePhone(adresse.telephoneDestinataire || (session ? '' : contact.telephone))) return 'Indiquez le numéro du destinataire, un mobile camerounais commençant par 6.'
    const sansNote = groups.find(group => deliveryMode(group) === 'agence' && (notesAgence[group.id] ?? '').trim().length < 3)
    if (sansNote) return `Précisez l’agence de voyage (et sa ville) où ${sansNote.name} doit déposer votre colis.`
    if (!terms) return 'Acceptez les conditions de vente pour commander.'
    return ''
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || chargement) return
    const probleme = verifier()
    setError(probleme)
    if (probleme) return
    lock.current = true; setPending(true)
    const telephoneDestinataire = normalisePhone(adresse.telephoneDestinataire || contact.telephone)!
    const body = {
      lignes: lines.map(line => ({ offreId: line.offerId, quantite: line.qty })),
      livraisons: groups.map(group => {
        const mode = deliveryMode(group)
        return { boutiqueId: group.id, mode, ...(mode === 'agence' ? { noteAgence: notesAgence[group.id]!.trim() } : {}) }
      }),
      adresse: {
        ville,
        ...(aDomicile ? { quartier: adresse.quartier.trim(), repere: adresse.repere.trim() } : {}),
        telephoneDestinataire,
      },
      totalAttenduFcfa: total,
      fraisLivraisonAttendusFcfa: fees ?? undefined,
      modePaiement,
      assurance: Boolean(choix.assurance && options?.assurance.active),
      installations: installationsRetenues.map(installation => installation.categorieId),
      ...(katiUtilises ? { katiUtilises } : {}),
      ...(session ? {} : { nom: contact.nom.trim(), telephone: normalisePhone(contact.telephone)!, courriel: contact.courriel.trim().toLowerCase() }),
    }
    const serialized = JSON.stringify(body)
    // Retry an identical body with the same key even after a network timeout.
    if (!request.current || request.current.body !== serialized) request.current = { body: serialized, key: crypto.randomUUID() }
    try {
      if (session && aDomicile && !enregistree && garderAdresse) await enregistrerAdresse({ ville, quartier: adresse.quartier.trim(), repere: adresse.repere.trim(), telephoneDestinataire })
      const order = session
        ? await api<MarketplaceOrder>('/marketplace/commandes', { methode: 'POST', corps: body, cleIdempotence: request.current.key })
        : await api<MarketplaceOrder & { jeton: string }>('/marketplace/commandes/sans-compte', { methode: 'POST', corps: body, cleIdempotence: request.current.key, anonyme: true })
      if (!order || typeof order.reference !== 'string' || !order.reference) throw new Error('Réponse de commande illisible')
      cart.consume(lines)
      const jeton = 'jeton' in order && typeof order.jeton === 'string' ? order.jeton : null
      if (jeton) memoriserSuivi(order.reference, jeton)
      router.push(`/marketplace/commande/${encodeURIComponent(order.reference)}/paiement${jeton ? `?suivi=${encodeURIComponent(jeton)}` : ''}`)
    } catch (cause) {
      setError(cause instanceof ErreurApi ? cause.code === 401 ? 'Votre session a expiré. Reconnectez-vous pour continuer.' : cause.message : 'La réponse n’a pas été reçue. Réessayez : une même demande ne créera pas deux commandes.')
      if (cause instanceof ErreurApi && cause.code === 409) { refresh(); void rechargerTarifs() }
      lock.current = false; setPending(false)
    }
  }

  if (!lines.length) return <div className={styles.page}><div className={styles.shell}><CheckoutHeading title="Passer ma commande" subtitle="Livraison et paiement de vos achats." step={2}/><section className={styles.empty}><ShopIcon name="bag"/><h2>Aucun article sélectionné.</h2><Link className={styles.primary} href="/panier">Revenir au panier</Link></section></div></div>
  const compact = checked.map(item => ({ ...item.line, price: item.offer?.prixFcfa ?? item.line.price }))
  return <div className={styles.page}><div className={styles.shell}>
    <CheckoutHeading title="Passer ma commande" subtitle="Vos articles, la livraison et le paiement, sur une seule page." step={2}/>
    <form id="marketplace-checkout" className={styles.layout} onSubmit={submit} noValidate><div className={styles.checkoutMain}>
      <section className={styles.panel} aria-label="Vos articles">
        <h2><ShopIcon name="bag"/>Vos articles</h2>
        <ul className={styles.lignesCommande}>{lines.map(line => {
          const key = cartLineKey(line)
          const live = checked.find(item => cartLineKey(item.line) === key)?.offer
          const minimum = Math.max(minimumDe(live), line.quantiteMinimale ?? 1)
          return <li key={key}><ProductThumb line={line}/><div><b>{line.name}</b><small>{live?.boutique.nom ?? line.boutiqueNom}</small></div>
            <div className={styles.quantity} role="group" aria-label={`Quantité de ${line.name}`}><button type="button" disabled={line.qty <= minimum || pending} aria-label={`Diminuer ${line.name}`} onClick={() => cart.setQty(key, line.qty - 1)}>−</button><output>{line.qty}</output><button type="button" disabled={line.qty >= Math.min(live?.disponible ?? 99, 99) || pending} aria-label={`Augmenter ${line.name}`} onClick={() => cart.setQty(key, line.qty + 1)}>+</button></div>
            <strong>{money((live?.prixFcfa ?? line.price) * line.qty)}</strong>
            <button type="button" className={styles.edit} disabled={pending} aria-label={`Retirer ${line.name}`} onClick={() => cart.remove(key)}><ShopIcon name="trash"/></button></li>
        })}</ul>
      </section>

      {!session && !chargement ? <section className={styles.panel} aria-label="Vos coordonnées" data-testid="sans-compte">
        <h2><ShopIcon name="phone"/>Vos coordonnées</h2>
        <p>Commandez sans compte : le lien de suivi et de paiement vous est envoyé par e-mail.</p>
        <div className={styles.fields}>
          <label>Nom complet<input required autoComplete="name" maxLength={80} value={contact.nom} onChange={event => setContact({ ...contact, nom: event.target.value })}/></label>
          <label>Téléphone mobile<input required type="tel" autoComplete="tel" maxLength={20} value={contact.telephone} placeholder="6 77 12 34 56" onChange={event => setContact({ ...contact, telephone: event.target.value })}/></label>
          <label className={styles.wide}>E-mail<input required type="email" autoComplete="email" maxLength={320} value={contact.courriel} placeholder="vous@exemple.cm" onChange={event => setContact({ ...contact, courriel: event.target.value })}/></label>
        </div>
        <div className={styles.accountPrompt} data-testid="arguments-compte"><ShopIcon name="shield"/><div><b>Avec un compte, c’est encore mieux :</b>
          <ul className={styles.argumentsCompte}><li>vous gagnez des KATI sur chaque commande, à dépenser sur la suivante ;</li><li>vous suivez toutes vos commandes au même endroit ;</li><li>vos adresses sont enregistrées pour la prochaine fois ;</li><li>vous retrouvez vos devis et vos retours.</li></ul>
          <button type="button" onClick={account.open}>Se connecter</button><Link href={avecRetour('/inscription', ici)}>Créer un compte</Link></div></div>
      </section> : null}

      <section className={styles.panel} aria-label="Adresse">
        <h2><ShopIcon name="pin"/>{aDomicile ? 'Adresse de livraison' : 'Ville et destinataire'}</h2>
        <p>{aDomicile ? 'Le quartier et le repère aident le livreur à vous trouver.' : 'Le retrait et l’expédition en agence n’ont pas besoin d’adresse : seulement la ville et un numéro à joindre.'}</p>
        {carnet.length ? <label className={styles.carnet}>Mes adresses<select value={enregistree?.id ?? NOUVELLE} disabled={pending} onChange={event => setAdresseChoisie(event.target.value)}>
          {carnet.map(a => <option key={a.id} value={a.id}>{libelleAdresse(a)}</option>)}
          <option value={NOUVELLE}>Une nouvelle adresse…</option>
        </select></label> : null}
        <div className={styles.fields}>
          <label>Ville<select required value={ville} disabled={Boolean(enregistree) || pending} onChange={event => setAddress({ ...address, ville: event.target.value, quartier: '' })}>{villes.length ? villes.map(value => <option key={value}>{value}</option>) : <option value="">Chargement des villes…</option>}{enregistree && !villes.includes(enregistree.ville) ? <option>{enregistree.ville}</option> : null}</select></label>
          {aDomicile ? <>
            {quartiers.length && !enregistree ? <label>Quartier<select value={quartierLibre ? AUTRE : adresse.quartier} disabled={pending} onChange={event => setAddress({ ...address, quartier: event.target.value === AUTRE ? ' ' : event.target.value })}><option value="" disabled>Choisissez…</option>{quartiers.map(q => <option key={q}>{q}</option>)}<option value={AUTRE}>Autre quartier…</option></select></label> : null}
            {quartierLibre || enregistree ? <label>{quartiers.length && !enregistree ? 'Autre quartier' : 'Quartier'}<input required minLength={2} maxLength={80} value={adresse.quartier.trimStart()} readOnly={Boolean(enregistree)} autoComplete="address-level3" placeholder="Ex. Akwa, Bonamoussadi…" onChange={event => setAddress({ ...address, quartier: event.target.value })}/></label> : null}
            <label>Repère<input required minLength={3} maxLength={240} value={adresse.repere} readOnly={Boolean(enregistree)} placeholder="Ex. face à la pharmacie…" onChange={event => setAddress({ ...address, repere: event.target.value })}/></label>
          </> : null}
          <label>Téléphone du destinataire<input type="tel" autoComplete="tel" maxLength={20} value={adresse.telephoneDestinataire} placeholder={session ? '6 77 12 34 56' : 'Votre mobile, par défaut'} onChange={event => setAddress({ ...address, telephoneDestinataire: event.target.value })}/></label>
        </div>
        {session && aDomicile && !enregistree ? <label className={styles.terms}><input type="checkbox" checked={garderAdresse} onChange={event => setGarderAdresse(event.target.checked)}/><span>Enregistrer cette adresse dans mon carnet</span></label> : null}
      </section>

      <section className={styles.panel} aria-label="Livraison par boutique">
        <h2><ShopIcon name="truck"/>Livraison par boutique</h2><p>Chaque boutique prépare ses articles séparément.</p>
        {loading ? <p role="status">Vérification des prix, du stock et des livraisons…</p> : null}
        {!loading && !serviceError ? groups.map(group => <div className={styles.deliveryGroup} key={group.id}>
          <div><span className={styles.shopMonogram}>{group.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span><b>{group.name}</b><small>{group.lines.reduce((sum, item) => sum + item.line.qty, 0)} article(s)</small></div>
          <fieldset><legend>Mode de livraison</legend>{group.modes.length ? group.modes.map(mode => {
            const { fee, raison } = feeFor(group, mode)
            return <label key={mode} data-unavailable={fee === null}><input type="radio" name={`delivery-${group.id}`} disabled={fee === null || pending} checked={deliveryMode(group) === mode} onChange={() => setModes({ ...modes, [group.id]: mode })}/><span>{LIBELLE_MODE[mode]} · <b data-testid={`frais-${group.id}-${mode}`}>{fee === null ? raison : fee ? money(fee) : mode === 'retrait' ? 'gratuit' : 'offerte'}</b>
              <small>{mode === 'retrait' && group.adresseRetrait ? `À retirer : ${group.adresseRetrait}${group.ville ? `, ${group.ville}` : ''}.` : livraisonADomicile(mode) ? `Livraison sous ${Math.max(...group.lines.map(item => delaiLivraisonMarketplace(item.offer?.delaiMaxJours)))} jours maximum.` : DESCRIPTION_MODE[mode]}</small></span></label>
          }) : <p className={styles.warning}>Aucun mode commun pour ces articles.</p>}
          {deliveryMode(group) === 'agence' ? <label className={styles.noteAgence}>Agence de voyage choisie<textarea required minLength={3} maxLength={500} rows={2} value={notesAgence[group.id] ?? ''} placeholder="Ex. Général Express, gare routière de Bafoussam" data-testid={`note-agence-${group.id}`} onChange={event => setNotesAgence({ ...notesAgence, [group.id]: event.target.value })}/></label> : null}
          {tarifs && group.modes.length && group.modes.every(mode => feeFor(group, mode).fee === null) ? <p className={styles.warning}>Cette boutique ne livre pas encore à {ville}.</p> : null}</fieldset>
        </div>) : null}
      </section>

      <ReglementCommande produitsFcfa={total} options={options} disponibleKati={session ? disponibleKati : null} choix={choix} onChange={setChoix} completImpose={enAgence}/>
      <section className={styles.panel}>
        <div className={styles.depositExplanation} data-testid="a-payer-maintenant"><b>{money(reglement.aPayerMaintenantFcfa)}</b><span>{reglement.aPayerMaintenantFcfa === 0 ? 'Rien à payer maintenant : vos KATI couvrent l’acompte. La commande sera confirmée dès son enregistrement.' : `À régler par Orange Money ou MTN Mobile Money, juste après l’enregistrement de la commande${modePaiement === 'acompte' ? ' : l’acompte de 10 % des produits' : ''}${reglement.assuranceFcfa + reglement.installationFcfa ? ' et les services' : ''}${reglement.remiseKatiFcfa ? `, moins ${money(reglement.remiseKatiFcfa)} payés en KATI` : ''}.`}</span></div>
        <p data-testid="a-payer-livraison">{reglement.aPayerLivraisonFcfa ? `À la livraison : ${money(reglement.aPayerLivraisonFcfa)}${modePaiement === 'acompte' && fees ? `, dont ${money(fees)} de frais de livraison` : ''}.` : 'Rien à régler au livreur.'}</p>
        <label className={styles.terms}><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)}/><span>J’ai vérifié ma commande et j’accepte les <Link href="/conditions-generales-vente">conditions de vente</Link>.</span></label>
      </section>
      {(!loading && !serviceError ? checked.filter(item => item.issue) : []).map(item => <p role="alert" className={styles.warning} key={cartLineKey(item.line)}>{item.line.name} : {item.issue}</p>)}
      {limitsExceeded ? <p className={styles.warning} role="alert">Une commande est limitée à 50 articles distincts et 20 boutiques. Réduisez votre sélection dans le panier.</p> : null}
      {serviceError ? <p role="alert" className={styles.warning}>{serviceError}<button type="button" onClick={refresh}>Réessayer</button></p> : null}
      {tarifsErreur ? <p role="alert" className={styles.warning}>{tarifsErreur}<button type="button" onClick={() => void rechargerTarifs()}>Réessayer</button></p> : null}
      <TrustStrip/><Link className={styles.continueShopping} href="/panier">Retour au panier</Link>
    </div>
    <Summary total={total} count={count} compactLines={compact} fees={fees} reglement={reglement}>
      {error ? <p role="alert" className={styles.warning}>{error}</p> : null}
      <button className={styles.primary} disabled={pending || chargement || blocked}>{pending ? 'Enregistrement…' : reglement.aPayerMaintenantFcfa ? `Commander et payer ${money(reglement.aPayerMaintenantFcfa)}` : 'Confirmer ma commande'}<ShopIcon name="arrow"/></button>
      <p className={styles.note}><ShopIcon name="info"/>Les prix et le stock sont revérifiés par le serveur à la validation.</p>
    </Summary></form>
  </div></div>
}
