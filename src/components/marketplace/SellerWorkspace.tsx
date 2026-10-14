'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { api, ErreurApi, telechargerApi } from '@/lib/api'
import {
  connexionLocaleActive,
  seDeconnecterLocalement,
  surChangementLocal,
} from '@/lib/connexion-locale'
import { supabase } from '@/lib/supabase'
import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'
import { ApercuPieces, TYPES_PIECES, taillePiece, verifierPieces, type VerificationPieces } from './ApercuPieces'
import { MerchantLogin } from './MerchantLogin'
import { VILLES_CAMEROUN } from '@/constants/villes'
import { EditeurFicheProduit } from './vendeur/EditeurFicheProduit'
import { DevisBoutique } from './vendeur/DevisBoutique'
import { cheminCategorie, libelleMois, useCategoriesMarketplace, type CategorieProduit } from './vendeur/categories'
import { FenetreNouvelleVariante, FenetrePrixVariante, revisionOuverte, type RevisionVariante } from './vendeur/FenetresVariante'
import { ShopIcon, type ShopIconName } from './ShopIcon'
import styles from '@/app/espace-vendeur/seller-workspace.module.css'

type Shop = {
  id: string
  vendeurId: string
  nom: string
  slug: string
  description: string | null
  statut: 'inactive' | 'active' | 'suspendue' | 'archivee'
  modesLivraison: string[]
  villesLivraison: string[]
  ville?: string | null
}

type ShopSpace = Shop & {
  vendeur: {
    type: string
    nomLegal: string
    statutVerification: 'brouillon' | 'soumis' | 'en_verification' | 'approuve' | 'modification_demandee' | 'refuse'
    statut: 'inactif' | 'actif' | 'sous_surveillance' | 'suspendu' | 'exclu'
  }
  mesRoles: string[]
}

type SellerDocument = {
  id: string
  type: string
  statut: 'soumis' | 'en_verification' | 'valide' | 'refuse' | 'expire'
  expireLe: string | null
  motifDecision: string | null
  creeLe: string
  modifieLe: string
  /** Renseignes quand le fichier a ete depose depuis l'espace vendeur. */
  nomFichier?: string | null
  typeMime?: string | null
  tailleOctets?: number | null
  statutAnalyse?: 'non_analysee' | 'en_quarantaine' | 'saine' | 'infectee'
}

type ProductProposal = {
  id: string
  slug: string
  nom: string
  description: string | null
  marque: string | null
  categorie: string | null
  /** La categorie choisie dans la liste KatiHub, avec la garantie minimale qu'elle impose. */
  categorieDetail?: CategorieProduit
  statut: 'soumis' | 'en_verification' | 'actif' | 'modification_demandee' | 'refuse' | 'archive'
  creeLe: string
}

type Offer = {
  id: string
  referenceVendeur: string
  statut: string
  prixFcfa: number | null
  libelleVariante: string | null
  attributsVariante: Record<string, string> | null
  ordreVariante: number
  produit: { id: string; nom: string; slug: string; statut: string; proposeParBoutiqueId: string | null }
  stock: { quantite: number; quantiteReservee: number } | null
  revisions: RevisionVariante[]
}

type ShopOrder = {
  id: string; reference: string; statut: string; modeLivraison: string
  totalNetProduits: number; netVendeurPrevu: number; creeLe: string
  lignes: Array<{ id: string; produitNomCapture: string; quantite: number; totalNetFcfa: number }>
}

type ShopDelivery = {
  id: string; reference: string; statut: string; modeLivraison: string; ville: string
  livraisonPrevueDebut: string | null; livraisonPrevueFin: string | null; creeLe: string
  sousCommande: { reference: string }
}

type ShopPayment = { id: string; reference: string; netVendeurPrevu: number; creeLe: string;
  commande: { statutPaiement: string; payeLe: string | null };
  transactionsFinancieres: Array<{ id: string; type: string; libelle: string; creeLe: string;
    ecritures: Array<{ sens: string; montantFcfa: number }> }> }
type SellerFinance = {
  soldes: { disponibleFcfa: number; geleFcfa: number }
  destinations: Array<{ id: string; type: string; stockageCle: string; expireLe: string | null }>
  retraits: Array<{ id: string; reference: string; montantFcfa: number; statut: string; creeLe: string; motifDecision: string | null; referenceExterne: string | null }>
  transactions: Array<{ id: string; type: string; libelle: string; creeLe: string; ecritures: Array<{ sens: string; compte: string; montantFcfa: number }> }>
}
type ShopReview = { id: string; note: number; dimension: string; commentaire: string | null; statut: string; creeLe: string;
  reponse: { contenu: string; creeLe: string } | null;
  ligne: { produitNomCapture: string; sousCommande: { reference: string } } }
type ShopCustomer = { id: string; nom: string | null; sansCompte: boolean; commandes: number; derniereCommandeLe: string | null }
type ShopMember = { id: string; nom: string; courriel: string; roles: string[]; actif: boolean;
  inviteLe: string | null; premiereConnexionLe: string | null; desactiveLe: string | null }
type DisputePiece = { id: string; nomCapture: string; tailleOctets: number }
type ShopDispute = { id: string; reference: string; statut: string; objet: string; modifieLe: string;
  commande: { reference: string }; client?: { courriel: string }; messages: Array<{ id: string; auteurType: string; contenu: string; creeLe: string; pieces: DisputePiece[] }>;
  retour: null | { id: string; statut: string; motifClient: string; motifDecision: string | null; motifContestation: string | null; referenceRetour: string | null };
  capacites: { repondre: boolean; decider: boolean; recevoir: boolean; contester: boolean } }

type Listing<T> = { total: number; elements: T[] }
type Section = 'documents' | 'products' | 'offers' | 'orders' | 'deliveries' | 'payments' | 'finance' | 'reviews' | 'customers' | 'members' | 'disputes'
type Access = 'allowed' | 'denied' | 'error'
const initialAccess: Record<Section, Access> = { documents: 'allowed', products: 'allowed', offers: 'allowed', orders: 'allowed', deliveries: 'allowed', payments: 'allowed', finance: 'allowed', reviews: 'allowed', customers: 'allowed', members: 'allowed', disputes: 'allowed' }

const DOCUMENT_LABELS: Record<string, string> = {
  identite: 'Pièce d’identité (CNI ou passeport)',
  domicile: 'Justificatif de domicile',
  rccm: 'Registre du commerce (RCCM)',
  niu: 'Attestation fiscale (NIU)',
  rib: 'Relevé d’identité bancaire (RIB)',
}

const STATUS_LABELS: Record<string, string> = {
  non_soumis: 'Dossier à compléter',
  soumis: 'Dossier soumis',
  en_verification: 'Vérification en cours',
  approuve: 'Boutique vérifiée',
  modification_demandee: 'Modification demandée',
  refuse: 'Dossier refusé',
  inactive: 'Inactive',
  active: 'Active',
  suspended: 'Suspendue',
  closed: 'Fermée',
  actif: 'Actif',
  inactif: 'Inactif',
  sous_surveillance: 'Sous surveillance',
  suspendu: 'Suspendu',
  exclu: 'Exclu',
  valide: 'Validé',
  expire: 'Expiré',
  modification_demandee_produit: 'À modifier',
  brouillon: 'Brouillon',
  publiee: 'Publiée',
  suspendue: 'Suspendue',
  archivee: 'Archivée',
  nouvelle: 'Nouvelle',
  acceptee: 'Acceptée',
  en_preparation: 'En préparation',
  prete: 'Prête',
  remise_transporteur: 'Remise au transporteur',
  retiree_client: 'Retirée par le client',
  en_livraison: 'En livraison',
  livree: 'Livrée',
  planifiee: 'Planifiée',
  a_affecter: 'À affecter',
  affectee: 'Affectée',
  prise_en_charge: 'Prise en charge',
}

const money = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
const offerPrice = (offer: Offer) => offer.prixFcfa ?? offer.revisions[0]?.prixFcfa ?? null
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function errorText(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Une erreur inattendue est survenue.'
}

export function SellerWorkspace() {
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [space, setSpace] = useState<ShopSpace | null>(null)
  const [documents, setDocuments] = useState<SellerDocument[]>([])
  const [products, setProducts] = useState<ProductProposal[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [orders, setOrders] = useState<Listing<ShopOrder>>({ total: 0, elements: [] })
  const [deliveries, setDeliveries] = useState<Listing<ShopDelivery>>({ total: 0, elements: [] })
  const [payments, setPayments] = useState<Listing<ShopPayment>>({ total: 0, elements: [] })
  const [finance, setFinance] = useState<SellerFinance | null>(null)
  const [reviews, setReviews] = useState<Listing<ShopReview>>({ total: 0, elements: [] })
  const [customers, setCustomers] = useState<{ elements: ShopCustomer[] }>({ elements: [] })
  const [members, setMembers] = useState<ShopMember[]>([])
  const [disputes, setDisputes] = useState<ShopDispute[]>([])
  const [access, setAccess] = useState<Record<Section, Access>>(initialAccess)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [panel, setPanel] = useState<'overview' | 'verification' | 'products' | 'offers' | 'quotes' | 'orders' | 'deliveries' | 'payments' | 'reviews' | 'customers' | 'settings' | 'members' | 'disputes'>('overview')

  const loadDetails = useCallback(async (shopId: string) => {
    const [nextSpace, ...sections] = await Promise.allSettled([
      api<ShopSpace>(`/vendeurs/mes-boutiques/${shopId}`),
      api<SellerDocument[]>(`/vendeurs/mes-boutiques/${shopId}/documents`),
      api<ProductProposal[]>(`/marketplace/boutiques/${shopId}/propositions-produits`),
      api<Offer[]>(`/marketplace/boutiques/${shopId}/offres`),
      api<Listing<ShopOrder>>(`/vendeurs/mes-boutiques/${shopId}/commandes`),
      api<Listing<ShopDelivery>>(`/vendeurs/mes-boutiques/${shopId}/livraisons`),
      api<Listing<ShopPayment>>(`/vendeurs/mes-boutiques/${shopId}/paiements`),
      api<Listing<ShopReview>>(`/vendeurs/mes-boutiques/${shopId}/avis`),
      api<{ elements: ShopCustomer[] }>(`/vendeurs/mes-boutiques/${shopId}/clients`),
      api<ShopMember[]>(`/vendeurs/mes-boutiques/${shopId}/membres`),
      api<SellerFinance>(`/marketplace/finance/boutiques/${shopId}`),
      api<ShopDispute[]>(`/marketplace/demandes-client/boutiques/${shopId}`),
    ])
    if (nextSpace.status === 'rejected') throw nextSpace.reason
    setSpace(nextSpace.value)
    const names: Section[] = ['documents', 'products', 'offers', 'orders', 'deliveries', 'payments', 'reviews', 'customers', 'members', 'finance', 'disputes']
    const nextAccess = { ...initialAccess }
    sections.forEach((result, index) => {
      const name = names[index]
      if (result.status === 'rejected') nextAccess[name] = result.reason instanceof ErreurApi && result.reason.code === 403 ? 'denied' : 'error'
    })
    setAccess(nextAccess)
    setDocuments(sections[0].status === 'fulfilled' ? sections[0].value as SellerDocument[] : [])
    setProducts(sections[1].status === 'fulfilled' ? sections[1].value as ProductProposal[] : [])
    setOffers(sections[2].status === 'fulfilled' ? sections[2].value as Offer[] : [])
    setOrders(sections[3].status === 'fulfilled' ? sections[3].value as Listing<ShopOrder> : { total: 0, elements: [] })
    setDeliveries(sections[4].status === 'fulfilled' ? sections[4].value as Listing<ShopDelivery> : { total: 0, elements: [] })
    setPayments(sections[5].status === 'fulfilled' ? sections[5].value as Listing<ShopPayment> : { total: 0, elements: [] })
    setReviews(sections[6].status === 'fulfilled' ? sections[6].value as Listing<ShopReview> : { total: 0, elements: [] })
    setCustomers(sections[7].status === 'fulfilled' ? sections[7].value as { elements: ShopCustomer[] } : { elements: [] })
    setMembers(sections[8].status === 'fulfilled' ? sections[8].value as ShopMember[] : [])
    setFinance(sections[9].status === 'fulfilled' ? sections[9].value as SellerFinance : null)
    setDisputes(sections[10].status === 'fulfilled' ? sections[10].value as ShopDispute[] : [])
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const nextShops = await api<Shop[]>('/vendeurs/mes-boutiques')
      setAuthenticated(true)
      setShops(nextShops)
      const nextId = selectedId && nextShops.some((shop) => shop.id === selectedId) ? selectedId : (nextShops[0]?.id ?? '')
      setSelectedId(nextId)
      if (nextId) await loadDetails(nextId)
      else setSpace(null)
    } catch (cause) {
      if (cause instanceof ErreurApi && (cause.code === 401 || cause.code === 403)) setAuthenticated(false)
      else setError(errorText(cause))
    } finally {
      setLoading(false)
    }
  }, [loadDetails, selectedId])

  useEffect(() => {
    const chargement = window.setTimeout(() => void load(), 0)
    const unsubscribe = connexionLocaleActive ? surChangementLocal(() => void load()) : undefined
    return () => {
      window.clearTimeout(chargement)
      unsubscribe?.()
    }
  }, [load])

  async function selectShop(id: string) {
    setSelectedId(id)
    setPanel('overview')
    setLoading(true)
    setError('')
    try { await loadDetails(id) } catch (cause) { setError(errorText(cause)) } finally { setLoading(false) }
  }

  async function logout() {
    const client = supabase()
    if (client) await client.auth.signOut()
    if (connexionLocaleActive) seDeconnecterLocalement()
    setAuthenticated(false)
    setSpace(null)
    setShops([])
  }

  if (loading && !space) return <WorkspaceLoading />
  if (!authenticated) return <MerchantLogin onSuccess={load} />

  const catalogueRole = space?.mesRoles.some(role => ['proprietaire', 'gestionnaire', 'magasinier'].includes(role)) ?? false
  const canPublish = catalogueRole && space?.statut === 'active' && ['actif', 'sous_surveillance'].includes(space.vendeur.statut)
  const validatedDocuments = documents.filter((document) => document.statut === 'valide').length
  const progress = space?.vendeur.statutVerification === 'approuve' ? 100 : access.documents === 'allowed' ? Math.min(100, Math.round((validatedDocuments / 5) * 100)) : null

  return (
    <main className={styles.workspace} data-seller-workspace>
      <aside className={styles.sidebar}>
        <div className={styles.shopSwitcher}>
          <small>VOTRE BOUTIQUE</small>
          <select value={selectedId} onChange={(event) => void selectShop(event.target.value)} aria-label="Boutique active">
            {shops.map((shop) => <option value={shop.id} key={shop.id}>{shop.nom}</option>)}
          </select>
        </div>
        <nav aria-label="Navigation vendeur">
          <button className={panel === 'overview' ? styles.activeNav : ''} onClick={() => setPanel('overview')}><ShopIcon name="home" />Vue d’ensemble</button>
          {space?.mesRoles.some(role => ['proprietaire', 'gestionnaire'].includes(role)) ? <button className={panel === 'verification' ? styles.activeNav : ''} onClick={() => setPanel('verification')}><ShopIcon name="shield" />Vérification</button> : null}
          {([
            ['products', 'package', 'Produits'],
            ['offers', 'tag', 'Offres'],
            ['quotes', 'clock', 'Devis'],
          ] as const).map(([value, icon, label]) => (
            <button key={value} className={panel === value ? styles.activeNav : ''} onClick={() => setPanel(value)}>
              <ShopIcon name={icon} />{label}
            </button>
          ))}
          {access.orders !== 'denied' ? <button className={panel === 'orders' ? styles.activeNav : ''} onClick={() => setPanel('orders')}><ShopIcon name="cart" />Commandes</button> : null}
          {access.deliveries !== 'denied' ? <button className={panel === 'deliveries' ? styles.activeNav : ''} onClick={() => setPanel('deliveries')}><ShopIcon name="truck" />Livraisons</button> : null}
          {access.disputes !== 'denied' ? <button className={panel === 'disputes' ? styles.activeNav : ''} onClick={() => setPanel('disputes')}><ShopIcon name="info" />Litiges et retours</button> : null}
          {access.finance !== 'denied' ? <button className={panel === 'payments' ? styles.activeNav : ''} onClick={() => setPanel('payments')}><ShopIcon name="wallet" />Finances</button> : null}
          {access.reviews !== 'denied' ? <button className={panel === 'reviews' ? styles.activeNav : ''} onClick={() => setPanel('reviews')}><ShopIcon name="star" />Avis clients</button> : null}
          {access.customers !== 'denied' ? <button className={panel === 'customers' ? styles.activeNav : ''} onClick={() => setPanel('customers')}><ShopIcon name="users" />Clients</button> : null}
          {space?.mesRoles.some(role => ['proprietaire', 'gestionnaire'].includes(role)) ? <button className={panel === 'settings' ? styles.activeNav : ''} onClick={() => setPanel('settings')}><ShopIcon name="settings" />Paramètres boutique</button> : null}
          {space?.mesRoles.some(role => ['proprietaire', 'gestionnaire'].includes(role)) ? <button disabled={access.members === 'denied'} className={panel === 'members' ? styles.activeNav : ''} onClick={() => setPanel('members')}><ShopIcon name="users" />Équipe</button> : null}
        </nav>
        <div className={styles.sidebarFoot}>
          <div className={styles.sidebarCallout}><strong>Votre vitrine publique</strong><p>Consultez la page que voient vos clients.</p><Link href={`/boutiques/${space?.slug ?? ''}`}>Ouvrir la boutique <ShopIcon name="arrow" /></Link></div>
          <Link href="/contact"><ShopIcon name="headphones" /> Centre d’aide</Link>
          <button onClick={() => void logout()}><ShopIcon name="arrow" /> Se déconnecter</button>
        </div>
      </aside>

      <section className={styles.content}>
        {error ? <div className={styles.error} role="alert">{error}<button onClick={() => void load()}>Réessayer</button></div> : null}
        {space ? <>
          <header className={styles.pageHead}>
            <div><h1>{panel === 'overview' ? `Bonjour, ${space.nom}` : panel === 'verification' ? 'Vérification de votre boutique' : panel === 'products' ? 'Produits proposés' : panel === 'offers' ? 'Offres de la boutique' : panel === 'orders' ? 'Commandes de la boutique' : panel === 'deliveries' ? 'Livraisons de la boutique' : panel === 'disputes' ? 'Litiges et retours' : panel === 'payments' ? 'Finances et retraits' : panel === 'reviews' ? 'Avis clients' : panel === 'customers' ? 'Clients' : panel === 'members' ? 'Équipe de la boutique' : 'Paramètres de la boutique'}</h1><p>{panel === 'overview' ? 'Voici ce qui se passe dans votre boutique.' : `${space.nom} · ${space.vendeur.nomLegal}`}</p></div>
            <div className={styles.headTools}><span className={styles.shopStatus} data-tone={canPublish ? 'good' : 'waiting'}><ShopIcon name={canPublish ? 'check' : 'clock'} />{STATUS_LABELS[space.vendeur.statutVerification] ?? space.vendeur.statutVerification}</span><Link href={`/boutiques/${space.slug}`} className={styles.viewShop}><ShopIcon name="bag" /> Voir ma boutique</Link></div>
          </header>

          {panel === 'overview' ? <Overview
            space={space} products={products} offers={offers} orders={orders} deliveries={deliveries} access={access}
            progress={progress} validatedDocuments={validatedDocuments} canPublish={canPublish}
            onPanel={setPanel}
          /> : null}
          {panel === 'verification' ? access.documents === 'allowed' ? <VerificationPanel shopId={space.id} documents={documents} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.documents} /> : null}
          {panel === 'products' ? access.products === 'allowed' ? <ProductsPanel shopId={space.id} products={products} canPublish={canPublish} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.products} /> : null}
          {panel === 'quotes' ? <DevisBoutique shopId={space.id} /> : null}
          {panel === 'offers' ? access.offers === 'allowed' ? <OffersPanel shop={space} products={products} offers={offers} canPublish={canPublish} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.offers} /> : null}
          {panel === 'orders' ? access.orders === 'allowed' ? <OrdersPanel listing={orders} /> : <SectionUnavailable access={access.orders} /> : null}
          {panel === 'deliveries' ? access.deliveries === 'allowed' ? <DeliveriesPanel listing={deliveries} /> : <SectionUnavailable access={access.deliveries} /> : null}
          {panel === 'disputes' ? access.disputes === 'allowed' ? <DisputesPanel disputes={disputes} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.disputes} /> : null}
          {panel === 'payments' ? access.finance === 'allowed' && finance ? <PaymentsPanel shopId={space.id} finance={finance} listing={payments} canWithdraw={space.mesRoles.includes('proprietaire')} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.finance} /> : null}
          {panel === 'reviews' ? access.reviews === 'allowed' ? <ReviewsPanel listing={reviews} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.reviews} /> : null}
          {panel === 'customers' ? access.customers === 'allowed' ? <CustomersPanel customers={customers.elements} /> : <SectionUnavailable access={access.customers} /> : null}
          {panel === 'settings' ? space.mesRoles.some(role => ['proprietaire', 'gestionnaire'].includes(role)) ? <SettingsPanel key={space.id} shop={space} onRefresh={load} /> : <SectionUnavailable access="denied" /> : null}
          {panel === 'members' ? access.members === 'allowed' ? <MembersPanel shopId={space.id} members={members} canManage={space.mesRoles.includes('proprietaire')} onRefresh={() => loadDetails(space.id)} /> : <SectionUnavailable access={access.members} /> : null}
        </> : <EmptyShop />}
      </section>
    </main>
  )
}

function WorkspaceLoading() {
  return <main className={styles.loading}><span /><p>Chargement de votre espace vendeur…</p></main>
}

function EmptyShop() {
  return <section className={styles.empty}><h1>Aucune boutique liée à ce compte</h1><p>Utilisez la même adresse électronique que celle indiquée dans votre candidature.</p><Link href="/devenir-vendeur">Créer une boutique</Link></section>
}

function Overview({ space, products, offers, orders, deliveries, access, progress, validatedDocuments, canPublish, onPanel }: {
  space: ShopSpace; products: ProductProposal[]; offers: Offer[]; orders: Listing<ShopOrder>; deliveries: Listing<ShopDelivery>; access: Record<Section, Access>; progress: number | null; validatedDocuments: number; canPublish: boolean; onPanel: (panel: 'verification' | 'products' | 'offers' | 'orders' | 'deliveries') => void
}) {
  const activeProducts = products.filter(item => item.statut === 'actif').length
  const publishedOffers = offers.filter(item => item.statut === 'publiee').length
  const leadOffer = offers.find(item => item.statut === 'publiee') ?? offers[0]
  const nextDelivery = deliveries.elements.find(item => !['livree', 'annulee'].includes(item.statut)) ?? deliveries.elements[0]
  const date = new Intl.DateTimeFormat('fr-CM', { dateStyle: 'full' }).format(new Date())
  const metrics: Array<{ label: string; value: number | string; detail: string; icon: ShopIconName; panel: 'orders' | 'deliveries' | 'products' | 'offers' }> = [
    { label: 'Commandes', value: access.orders === 'allowed' ? orders.total : '—', detail: 'reçues par la boutique', icon: 'cart', panel: 'orders' },
    { label: 'Livraisons', value: access.deliveries === 'allowed' ? deliveries.total : '—', detail: 'expéditions enregistrées', icon: 'truck', panel: 'deliveries' },
    { label: 'Produits actifs', value: access.products === 'allowed' ? activeProducts : '—', detail: 'dans votre catalogue', icon: 'package', panel: 'products' },
    { label: 'Offres publiées', value: access.offers === 'allowed' ? publishedOffers : '—', detail: 'visibles sur KatiHub', icon: 'tag', panel: 'offers' },
  ]

  return <div className={styles.dashboard}>
    <div className={styles.dashboardIntro}><p>{space.mesRoles.includes('magasinier') && !space.mesRoles.includes('gestionnaire') ? 'Vos produits et vos offres, au même endroit.' : 'Commandes, catalogue et livraisons au même endroit.'}</p><span><ShopIcon name="clock" /> {date}</span></div>
    {space.vendeur.statutVerification !== 'approuve' && access.documents !== 'denied' ? <section className={styles.activationNotice}>
      <div><strong>Votre dossier avance</strong><p>{access.documents === 'allowed' ? `${validatedDocuments} justificatif(s) validé(s). Complétez le dossier pour ouvrir la vente.` : 'Le suivi des justificatifs est réservé au gestionnaire du dossier.'}</p></div>
      <span>{progress === null ? '—' : `${progress}%`}</span>
      <button disabled={access.documents !== 'allowed'} onClick={() => onPanel('verification')}>Voir la vérification <ShopIcon name="arrow" /></button>
    </section> : null}
    <section className={styles.metricStrip} aria-label="Activité de la boutique">
      {metrics.filter(metric => access[metric.panel] !== 'denied').map(metric => <button key={metric.panel} onClick={() => onPanel(metric.panel)}>
        <span className={styles.metricIcon}><ShopIcon name={metric.icon} /></span><span className={styles.metricCopy}><small>{metric.label}</small><strong>{metric.value}</strong><em>{access[metric.panel] === 'allowed' ? metric.detail : 'Données indisponibles'}</em></span>
      </button>)}
    </section>
    <div className={styles.dashboardColumns}>
      <div className={styles.dashboardMain}>
        {access.orders !== 'denied' ? <section className={styles.dashboardPanel}>
          <header className={styles.dashboardPanelHead}><div><h2>Commandes récentes</h2><p>Les dernières commandes confiées à votre boutique.</p></div><button disabled={access.orders !== 'allowed'} onClick={() => onPanel('orders')}>Toutes les commandes <ShopIcon name="arrow" /></button></header>
          {access.orders !== 'allowed' ? <p className={styles.dashboardEmpty}>Les commandes ne sont pas accessibles avec ce rôle pour le moment.</p> : orders.elements.length ? <div className={styles.orderTableScroll}><table className={styles.orderTable}><thead><tr><th>Commande</th><th>Produit</th><th>Montant produits</th><th>Statut</th><th>Date</th></tr></thead><tbody>{orders.elements.slice(0, 5).map(order => <tr key={order.id}><td><button onClick={() => onPanel('orders')}>{order.reference}</button></td><td>{order.lignes.map(line => `${line.quantite} × ${line.produitNomCapture}`).join(', ')}</td><td>{money(order.totalNetProduits)}</td><td><span data-status={order.statut}>{STATUS_LABELS[order.statut] ?? order.statut.replaceAll('_', ' ')}</span></td><td>{new Intl.DateTimeFormat('fr-CM', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.creeLe))}</td></tr>)}</tbody></table></div> : <p className={styles.dashboardEmpty}>Aucune commande reçue pour l’instant. Vos nouvelles commandes apparaîtront ici.</p>}
        </section> : null}
        <section className={styles.quickPanel}><div><h2>Avancer aujourd’hui</h2><p>Deux gestes utiles pour garder votre boutique à jour.</p></div><div className={styles.quickActions}><button disabled={!canPublish || access.products !== 'allowed'} onClick={() => onPanel('products')}><ShopIcon name="package" /> Proposer un produit <ShopIcon name="arrow" /></button><button disabled={access.offers !== 'allowed'} onClick={() => onPanel('offers')}><ShopIcon name="grid" /> Gérer le stock <ShopIcon name="arrow" /></button></div></section>
      </div>
      <div className={styles.dashboardRail}>
        <section className={styles.dashboardPanel}><header className={styles.dashboardPanelHead}><h2>Offre à la une</h2><button disabled={access.offers !== 'allowed'} onClick={() => onPanel('offers')}>Mes offres <ShopIcon name="arrow" /></button></header>{access.offers !== 'allowed' ? <p className={styles.dashboardEmpty}>Offres indisponibles.</p> : leadOffer ? <div className={styles.offerSpotlight}><span className={styles.offerMark}><ShopIcon name="bag" /></span><div><strong>{leadOffer.produit.nom}</strong><b>{offerPrice(leadOffer) === null ? 'Prix en attente' : money(offerPrice(leadOffer)!)}</b><small>{leadOffer.referenceVendeur} · {STATUS_LABELS[leadOffer.statut] ?? leadOffer.statut}</small></div><span className={styles.stockCount}><strong>{leadOffer.stock ? Math.max(0, leadOffer.stock.quantite - leadOffer.stock.quantiteReservee) : '—'}</strong><small>disponibles</small></span></div> : <p className={styles.dashboardEmpty}>Votre première offre apparaîtra ici après validation.</p>}</section>
        {access.deliveries !== 'denied' ? <section className={styles.dashboardPanel}><header className={styles.dashboardPanelHead}><h2>Livraison à suivre</h2><button disabled={access.deliveries !== 'allowed'} onClick={() => onPanel('deliveries')}>Toutes <ShopIcon name="arrow" /></button></header>{access.deliveries !== 'allowed' ? <p className={styles.dashboardEmpty}>Livraisons indisponibles.</p> : nextDelivery ? <div className={styles.deliverySpotlight}><strong>{nextDelivery.reference}</strong><span data-status={nextDelivery.statut}>{STATUS_LABELS[nextDelivery.statut] ?? nextDelivery.statut.replaceAll('_', ' ')}</span><p><ShopIcon name="pin" /> {nextDelivery.ville} · Commande {nextDelivery.sousCommande.reference}</p><small>{nextDelivery.livraisonPrevueDebut ? `Prévue le ${new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(nextDelivery.livraisonPrevueDebut))}` : 'Date de livraison à préciser'}</small></div> : <p className={styles.dashboardEmpty}>Aucune livraison en cours.</p>}</section> : null}
        <section className={styles.supportPanel}><ShopIcon name="headphones" /><div><h2>Une question sur votre boutique ?</h2><p>L’équipe KatiHub peut vous accompagner.</p><Link href="/contact">Contacter le support <ShopIcon name="arrow" /></Link></div></section>
      </div>
    </div>
  </div>
}

function SectionUnavailable({ access }: { access: Access }) {
  return <section className={styles.featureList}><p className={styles.blank}>{access === 'denied' ? 'Votre rôle ne donne pas accès à cette rubrique.' : 'Cette rubrique est momentanément indisponible. Réessayez depuis le bouton en haut de page.'}</p></section>
}

function OrdersPanel({ listing }: { listing: Listing<ShopOrder> }) {
  return <section className={styles.featureList}><header><h2>Commandes reçues</h2><span>{listing.total} au total · {listing.elements.length} affichée{listing.elements.length > 1 ? 's' : ''}</span></header>{listing.elements.length ? <ul>{listing.elements.map(order => <li key={order.id}><div><strong>{order.reference}</strong><small>{new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(order.creeLe))} · {order.lignes.map(line => `${line.quantite} × ${line.produitNomCapture}`).join(', ')}</small><small>Produits : {money(order.totalNetProduits)} · Net vendeur prévu : {money(order.netVendeurPrevu)}</small></div><b data-status={order.statut}>{STATUS_LABELS[order.statut] ?? order.statut.replaceAll('_', ' ')}</b></li>)}</ul> : <p className={styles.blank}>Aucune commande pour cette boutique.</p>}</section>
}

function DeliveriesPanel({ listing }: { listing: Listing<ShopDelivery> }) {
  return <section className={styles.featureList}><header><h2>Suivi des livraisons</h2><span>{listing.total} au total · {listing.elements.length} affichée{listing.elements.length > 1 ? 's' : ''}</span></header>{listing.elements.length ? <ul>{listing.elements.map(delivery => <li key={delivery.id}><div><strong>{delivery.reference}</strong><small>Commande {delivery.sousCommande.reference} · {delivery.ville} · {delivery.modeLivraison === 'vendeur' ? 'Livraison boutique' : 'Livraison KatiHub'}</small><small>{delivery.livraisonPrevueDebut ? `Prévue le ${new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(delivery.livraisonPrevueDebut))}` : `Créée le ${new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(delivery.creeLe))}`}</small></div><b data-status={delivery.statut}>{STATUS_LABELS[delivery.statut] ?? delivery.statut.replaceAll('_', ' ')}</b></li>)}</ul> : <p className={styles.blank}>Aucune livraison pour cette boutique.</p>}</section>
}

function PaymentsPanel({ shopId, finance, listing, canWithdraw, onRefresh }: { shopId: string; finance: SellerFinance; listing: Listing<ShopPayment>; canWithdraw: boolean; onRefresh: () => Promise<void> }) {
  const [amount, setAmount] = useState('')
  const [destinationId, setDestinationId] = useState(finance.destinations[0]?.id ?? '')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const selectedDestinationId = destinationId || finance.destinations[0]?.id || ''
  async function requestWithdrawal(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    try {
      await api(`/marketplace/finance/boutiques/${shopId}/retraits`, { methode: 'POST', corps: { montantFcfa: Number(amount), documentDestinationId: selectedDestinationId } })
      setAmount(''); setMessage('Demande enregistrée. Le montant est gelé jusqu’à la décision KatiHub.'); await onRefresh()
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }
  async function cancelWithdrawal(id: string) {
    if (!window.confirm('Annuler cette demande et rendre le montant disponible ?')) return
    setPending(true); setMessage('')
    try { await api(`/marketplace/finance/boutiques/${shopId}/retraits/${id}/annulation`, { methode: 'POST' }); await onRefresh(); setMessage('La demande a été annulée et le montant dégelé.') }
    catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }
  return <div className={styles.detailStack}>
    <section className={styles.detailIntro}><span>COMPTABILITÉ DE LA BOUTIQUE</span><h2>Votre argent, de la vente au reversement</h2><p>Une commission devient acquise après la livraison, la fenêtre de retour et la résolution des litiges. Chaque demande immobilise immédiatement la somme pour empêcher un double retrait.</p></section>
    <section className={styles.financeBalances}><article><small>Disponible</small><strong>{money(finance.soldes.disponibleFcfa)}</strong><span>Retirable maintenant</span></article><article><small>Gelé</small><strong>{money(finance.soldes.geleFcfa)}</strong><span>Demandes en cours</span></article></section>
    <div className={styles.financeColumns}><section className={styles.featureList}><header><h2>Demandes de retrait</h2><span>{finance.retraits.length} récente(s)</span></header>{finance.retraits.length ? <ul>{finance.retraits.map(retrait => <li key={retrait.id}><div><strong>{retrait.reference}</strong><small>{money(retrait.montantFcfa)} · {new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(retrait.creeLe))}</small>{retrait.referenceExterne ? <small>Référence bancaire : {retrait.referenceExterne}</small> : null}{retrait.motifDecision ? <em>{retrait.motifDecision}</em> : null}</div><div className={styles.withdrawalStatus}><b data-status={retrait.statut}>{retrait.statut.replaceAll('_', ' ')}</b>{retrait.statut === 'demande' && canWithdraw ? <button disabled={pending} onClick={() => void cancelWithdrawal(retrait.id)}>Annuler</button> : null}</div></li>)}</ul> : <p className={styles.blank}>Aucun retrait demandé.</p>}</section>
      <section className={styles.actionPanel}><h2>Demander un retrait</h2><p>Minimum 5 000 FCFA. Seul le propriétaire peut confirmer la demande.</p><form onSubmit={requestWithdrawal}><label>Montant FCFA<input required type="number" min="5000" max={finance.soldes.disponibleFcfa} step="1" disabled={!canWithdraw} value={amount} onChange={event => setAmount(event.target.value)} /></label><label>Destination validée<select required disabled={!canWithdraw || !finance.destinations.length} value={selectedDestinationId} onChange={event => setDestinationId(event.target.value)}><option value="">Sélectionner…</option>{finance.destinations.map(destination => <option value={destination.id} key={destination.id}>{destination.type.toUpperCase()} · {destination.stockageCle.split('/').at(-1)}</option>)}</select></label>{!finance.destinations.length ? <p className={styles.feedback}>Ajoutez puis faites valider un RIB dans la rubrique Vérification.</p> : null}{message ? <p className={styles.feedback} role="status">{message}</p> : null}<button disabled={pending || !canWithdraw || !selectedDestinationId || Number(amount) < 5000 || Number(amount) > finance.soldes.disponibleFcfa}>{pending ? 'Traitement…' : 'Geler et demander le retrait'}</button></form></section></div>
    <section className={styles.featureList}><header><h2>Journal financier</h2><span>{finance.transactions.length} écriture(s)</span></header>{finance.transactions.length ? <ul>{finance.transactions.map(transaction => <li key={transaction.id}><div><strong>{transaction.libelle}</strong><small>{new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(transaction.creeLe))}</small>{transaction.ecritures.map((entry, index) => <small key={`${transaction.id}-${entry.compte}-${index}`}>{entry.compte.replaceAll('_', ' ')} · {entry.sens === 'credit' ? '+' : '−'}{money(entry.montantFcfa)}</small>)}</div><b>{transaction.type.replaceAll('_', ' ')}</b></li>)}</ul> : <p className={styles.blank}>Aucune écriture vendeur disponible.</p>}</section>
    <section className={styles.featureList}><header><h2>Commandes et paiements</h2><span>{listing.total} commande(s) · {listing.elements.length} affichée(s)</span></header>
      {listing.elements.length ? <ul>{listing.elements.map(item => <li key={item.id}><div><strong>{item.reference}</strong><small>{new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(item.creeLe))} · Paiement {item.commande.statutPaiement.replaceAll('_', ' ')}</small><small>Net vendeur prévu : {money(item.netVendeurPrevu)}{item.commande.payeLe ? ` · Payé le ${new Intl.DateTimeFormat('fr-CM').format(new Date(item.commande.payeLe))}` : ''}</small>{item.transactionsFinancieres.flatMap(transaction => transaction.ecritures.map(entry => <small key={`${transaction.id}-${entry.sens}`}>{transaction.libelle} · {entry.sens === 'credit' ? '+' : '−'}{money(entry.montantFcfa)}</small>))}</div><b data-status={item.commande.statutPaiement}>{item.commande.statutPaiement.replaceAll('_', ' ')}</b></li>)}</ul> : <p className={styles.blank}>Aucune commande à rapprocher pour le moment.</p>}
    </section>
  </div>
}

const AUTEURS_LITIGE: Record<string, string> = { client: 'Client', vendeur: 'Votre boutique', equipe: 'KatiHub' }
const RESPONSABLES_RETOUR = [
  ['vendeur', 'La boutique (produit non conforme, erreur de préparation)'],
  ['agent_livraison', 'La livraison (colis abîmé pendant le transport)'],
  ['indetermine', 'À déterminer par KatiHub'],
] as const

type FenetreLitige =
  | { type: 'reponse'; dispute: ShopDispute }
  | { type: 'autorise' | 'refuse' | 'reception' | 'contestation'; dispute: ShopDispute; retour: NonNullable<ShopDispute['retour']> }
  | { type: 'pieces'; dispute: ShopDispute; messageId: string; verification: VerificationPieces }
  | null

function DisputesPanel({ disputes, onRefresh }: { disputes: ShopDispute[]; onRefresh: () => Promise<void> }) {
  const [fenetre, setFenetre] = useState<FenetreLitige>(null)
  const [message, setMessage] = useState('')

  function ouvrir(prochaine: FenetreLitige) { setMessage(''); setFenetre(prochaine) }

  /** Une erreur remonte a la fenetre, qui l'affiche en gardant la saisie. */
  async function enregistrer(appel: () => Promise<unknown>, succes: string) {
    await appel()
    setFenetre(null)
    setMessage(succes)
    await onRefresh()
  }

  function valider(donnees: FormData): Promise<void> {
    if (!fenetre) return Promise.resolve()
    const motif = String(donnees.get('motif') ?? '').trim()
    switch (fenetre.type) {
      case 'reponse':
        return enregistrer(() => api(`/marketplace/demandes-client/${fenetre.dispute.id}/messages`, { methode: 'POST', corps: { contenu: String(donnees.get('contenu') ?? '').trim() } }), 'Réponse envoyée au client.')
      case 'autorise':
        return enregistrer(() => api(`/marketplace/demandes-client/retours/${fenetre.retour.id}/decision`, { methode: 'POST', corps: { decision: 'autorise', motif, responsable: String(donnees.get('responsable') ?? 'vendeur'), fraisRetourFcfa: 0 } }), 'Retour autorisé. Le client est prévenu et peut expédier le colis.')
      case 'refuse':
        return enregistrer(() => api(`/marketplace/demandes-client/retours/${fenetre.retour.id}/decision`, { methode: 'POST', corps: { decision: 'refuse', motif, responsable: 'client', fraisRetourFcfa: 0 } }), 'Retour refusé. Le client peut contester auprès de KatiHub.')
      case 'reception':
        return enregistrer(() => api(`/marketplace/demandes-client/retours/${fenetre.retour.id}/reception`, { methode: 'POST' }), 'Réception enregistrée. KatiHub peut procéder au remboursement.')
      case 'contestation':
        return enregistrer(() => api(`/marketplace/demandes-client/retours/${fenetre.retour.id}/contestation`, { methode: 'POST', corps: { motif } }), 'Contestation transmise à KatiHub pour arbitrage.')
      case 'pieces':
        return envoyerPieces(fenetre.dispute, fenetre.messageId, fenetre.verification.acceptees)
    }
  }

  async function envoyerPieces(dispute: ShopDispute, messageId: string, fichiers: File[]) {
    if (!fichiers.length) throw new Error('Aucun fichier valide à joindre.')
    let envoyes = 0
    try {
      for (const fichier of fichiers) {
        const corps = new FormData(); corps.append('fichier', fichier)
        await api(`/marketplace/demandes-client/${dispute.id}/messages/${messageId}/pieces`, { methode: 'POST', corps })
        envoyes += 1
      }
    } catch (cause) {
      if (envoyes) await onRefresh()
      const raison = errorText(cause)
      throw new Error(envoyes ? `${envoyes} fichier(s) joint(s), puis échec : ${raison}` : raison)
    }
    setFenetre(null)
    setMessage(`${envoyes} justificatif(s) ajouté(s) au dossier.`)
    await onRefresh()
  }

  function choisirPieces(dispute: ShopDispute, fichiers: FileList | null) {
    if (!fichiers?.length) return
    const propre = dispute.messages.findLast((item) => item.auteurType === 'vendeur')
    if (!propre) { setMessage('Répondez d’abord au client : un justificatif accompagne toujours votre message.'); return }
    ouvrir({ type: 'pieces', dispute, messageId: propre.id, verification: verifierPieces(Array.from(fichiers)) })
  }

  const decision = fenetre?.type === 'autorise' || fenetre?.type === 'refuse' ? fenetre : null

  return <div className={styles.detailStack}><section className={styles.detailIntro}><span>SERVICE APRÈS-VENTE</span><h2>Traiter chaque dossier jusqu’à sa résolution</h2><p>Répondez au client, motivez chaque décision et confirmez seulement les colis physiquement reçus. KatiHub arbitre les contestations et exécute le remboursement.</p></section>
    <p className={message ? styles.feedback : styles.srOnly} role="status">{message}</p>
    <section className={styles.featureList}><header><h2>Dossiers de la boutique</h2><span>{disputes.length} dossier(s)</span></header>{disputes.length ? <ul>{disputes.map(dispute => <li key={dispute.id} className={styles.disputeRow}><div>
      <strong>{dispute.reference} · {dispute.objet}</strong>
      <small>Commande {dispute.commande.reference} · mis à jour le {new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dispute.modifieLe))}</small>
      <p>Statut : {dispute.statut.replaceAll('_', ' ')}{dispute.retour ? ` · retour ${dispute.retour.statut.replaceAll('_', ' ')}` : ''}</p>
      {dispute.retour?.motifClient ? <em>Motif du client : {dispute.retour.motifClient}</em> : null}
      {dispute.retour?.referenceRetour ? <small>Colis retour : {dispute.retour.referenceRetour}</small> : null}
      <ol aria-label={`Échanges du dossier ${dispute.reference}`}>{dispute.messages.map(item => <li key={item.id}><blockquote><b>{AUTEURS_LITIGE[item.auteurType] ?? 'Intervenant'}</b> · <time dateTime={item.creeLe}>{new Intl.DateTimeFormat('fr-CM', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.creeLe))}</time><br />{item.contenu}{item.pieces.map(piece => <button key={piece.id} type="button" onClick={() => void telechargerApi(`/marketplace/demandes-client/${dispute.id}/pieces/${piece.id}`, piece.nomCapture)}>{piece.nomCapture}</button>)}</blockquote></li>)}</ol>
      <div className={styles.disputeActions}>
        {dispute.capacites.repondre ? <button onClick={() => ouvrir({ type: 'reponse', dispute })}>Répondre</button> : null}
        {dispute.capacites.decider && dispute.retour ? <><button onClick={() => ouvrir({ type: 'autorise', dispute, retour: dispute.retour! })}>Autoriser le retour</button><button onClick={() => ouvrir({ type: 'refuse', dispute, retour: dispute.retour! })}>Refuser le retour</button></> : null}
        {dispute.capacites.recevoir && dispute.retour ? <button onClick={() => ouvrir({ type: 'reception', dispute, retour: dispute.retour! })}>Confirmer la réception</button> : null}
        {dispute.capacites.contester && dispute.retour ? <button onClick={() => ouvrir({ type: 'contestation', dispute, retour: dispute.retour! })}>Contester</button> : null}
        <label>Ajouter une preuve<input className={styles.srOnly} type="file" multiple accept={TYPES_PIECES.join(',')} onChange={event => { choisirPieces(dispute, event.currentTarget.files); event.currentTarget.value = '' }} /></label>
      </div></div><b data-status={dispute.statut}>{dispute.statut.replaceAll('_', ' ')}</b></li>)}</ul> : <p className={styles.blank}>Aucun litige ouvert pour cette boutique.</p>}</section>

    <FenetreAction ouverte={fenetre?.type === 'reponse'} titre="Répondre au client" libelleValider="Envoyer la réponse" onFermer={() => setFenetre(null)} onValider={valider}>
      <ChampTexte nom="contenu" libelle="Votre réponse" aide="Le client la reçoit par courriel et la lit dans le suivi de sa commande." multiligne required minLength={2} maxLength={5000} />
    </FenetreAction>

    <FenetreAction
      ouverte={Boolean(decision)}
      titre={decision?.type === 'autorise' ? 'Autoriser le retour' : 'Refuser le retour'}
      description={decision?.type === 'autorise' ? 'Le client pourra expédier le colis. Le remboursement suivra votre confirmation de réception.' : 'Le client sera prévenu et pourra contester votre refus auprès de KatiHub.'}
      libelleValider={decision?.type === 'autorise' ? 'Autoriser' : 'Refuser'}
      irreversible="Je confirme cette décision : elle ne pourra plus être modifiée depuis cet espace, seulement contestée."
      onFermer={() => setFenetre(null)}
      onValider={valider}
    >
      {decision?.type === 'autorise' ? <fieldset className="grid gap-2"><legend className="text-small font-semibold">Origine du problème</legend>{RESPONSABLES_RETOUR.map(([valeur, texte], index) => <label key={valeur} className="flex min-h-11 items-center gap-3 rounded-control border border-rule px-3 text-small"><input type="radio" name="responsable" value={valeur} defaultChecked={index === 0} required className="size-5" />{texte}</label>)}</fieldset> : null}
      <ChampTexte nom="motif" libelle="Motif communiqué au client" aide="Il figure au dossier et sera lu en cas d’arbitrage." multiligne required minLength={5} maxLength={1000} />
    </FenetreAction>

    <FenetreAction
      ouverte={fenetre?.type === 'reception'}
      titre="Confirmer la réception du colis retour"
      description={fenetre?.type === 'reception' && fenetre.retour.referenceRetour ? `Colis ${fenetre.retour.referenceRetour}.` : undefined}
      libelleValider="Confirmer la réception"
      irreversible="J’ai le colis retour physiquement en main. Cette confirmation déclenche le remboursement du client et ne peut pas être annulée."
      onFermer={() => setFenetre(null)}
      onValider={valider}
    />

    <FenetreAction
      ouverte={fenetre?.type === 'contestation'}
      titre="Contester l’autorisation du retour"
      description="KatiHub examine les échanges et les preuves, puis rend une décision qui s’impose aux deux parties."
      libelleValider="Envoyer la contestation"
      irreversible="Je comprends qu’une seule contestation est possible sur ce retour."
      onFermer={() => setFenetre(null)}
      onValider={valider}
    >
      <ChampTexte nom="motif" libelle="Pourquoi contestez-vous ?" aide="10 caractères minimum." multiligne required minLength={10} maxLength={1000} />
    </FenetreAction>

    <FenetreAction
      ouverte={fenetre?.type === 'pieces'}
      titre="Ajouter des justificatifs"
      description="Vérifiez les fichiers : une fois ajoutés, ils restent au dossier et ne peuvent pas être retirés."
      libelleValider={fenetre?.type === 'pieces' ? `Ajouter ${fenetre.verification.acceptees.length} fichier(s)` : 'Ajouter'}
      onFermer={() => setFenetre(null)}
      onValider={valider}
    >
      {fenetre?.type === 'pieces' ? <ApercuPieces verification={fenetre.verification} /> : null}
    </FenetreAction>
  </div>
}

function ReviewsPanel({ listing, onRefresh }: { listing: Listing<ShopReview>; onRefresh: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  async function reply(event: FormEvent, id: string) {
    event.preventDefault(); setPending(id); setMessage('')
    try { await api(`/marketplace/reputation/avis/${id}/reponse`, { methode: 'POST', corps: { contenu: drafts[id]?.trim() } }); setDrafts({ ...drafts, [id]: '' }); await onRefresh(); setMessage('Votre réponse est publiée.') }
    catch (cause) { setMessage(errorText(cause)) } finally { setPending('') }
  }
  return <div className={styles.detailStack}><section className={styles.detailIntro}><span>PAROLE DES CLIENTS</span><h2>Chaque retour compte</h2><p>Répondez publiquement aux avis publiés. Les avis signalés ou masqués restent visibles ici pour le suivi, sans réponse publique.</p></section><section className={styles.featureList}><header><h2>Avis reçus</h2><span>{listing.total} au total</span></header>{message ? <p className={styles.feedback} role="status">{message}</p> : null}{listing.elements.length ? <ul>{listing.elements.map(review => <li key={review.id} className={styles.reviewItem}><div><strong><span className={styles.reviewStars} aria-label={`${review.note} étoiles sur 5`}>{'★'.repeat(review.note)}{'☆'.repeat(5 - review.note)}</span> · {review.ligne.produitNomCapture}</strong><small>Commande {review.ligne.sousCommande.reference} · {review.dimension} · {new Intl.DateTimeFormat('fr-CM').format(new Date(review.creeLe))}</small><p>{review.commentaire || 'Note sans commentaire.'}</p>{review.reponse ? <blockquote><b>Votre réponse</b><br />{review.reponse.contenu}</blockquote> : review.statut === 'publie' ? <form className={styles.replyForm} onSubmit={event => void reply(event, review.id)}><label htmlFor={`reply-${review.id}`}>Répondre à cet avis</label><textarea id={`reply-${review.id}`} required minLength={2} maxLength={2000} rows={2} value={drafts[review.id] ?? ''} onChange={event => setDrafts({ ...drafts, [review.id]: event.target.value })} placeholder="Merci pour votre retour…" /><button disabled={pending === review.id}>{pending === review.id ? 'Publication…' : 'Publier la réponse'}</button></form> : null}</div><b data-status={review.statut}>{review.statut}</b></li>)}</ul> : <p className={styles.blank}>Pas encore d’avis sur vos ventes.</p>}</section></div>
}

function CustomersPanel({ customers }: { customers: ShopCustomer[] }) {
  return <div className={styles.detailStack}><section className={styles.detailIntro}><span>RELATION CLIENT</span><h2>Les personnes qui ont commandé chez vous</h2><p>Les 30 clients les plus récents. Seuls le nom renseigné et l’historique de commande agrégé sont affichés ; les coordonnées personnelles restent protégées.</p></section><section className={styles.featureList}><header><h2>Clients récents</h2><span>{customers.length} affiché(s)</span></header>{customers.length ? <ul>{customers.map((customer, index) => <li key={customer.id}><div><strong>{customer.nom || `Client n°${index + 1}`}</strong><small>{customer.sansCompte ? 'Commande sans compte' : 'Compte client'} · {customer.commandes} commande{customer.commandes > 1 ? 's' : ''}</small></div><small>{customer.derniereCommandeLe ? new Intl.DateTimeFormat('fr-CM', { dateStyle: 'medium' }).format(new Date(customer.derniereCommandeLe)) : '—'}</small></li>)}</ul> : <p className={styles.blank}>Vos clients apparaîtront ici après leur première commande.</p>}</section></div>
}

function SettingsPanel({ shop, onRefresh }: { shop: ShopSpace; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState(shop.nom)
  const [description, setDescription] = useState(shop.description ?? '')
  const [cities, setCities] = useState(shop.villesLivraison.join(', '))
  const [city, setCity] = useState(shop.ville ?? shop.villesLivraison[0] ?? '')
  const [modes, setModes] = useState(shop.modesLivraison)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    try { await api(`/vendeurs/mes-boutiques/${shop.id}`, { methode: 'PATCH', corps: { nom: name.trim(), description: description.trim() || undefined, modesLivraison: modes, villesLivraison: cities.split(',').map(city => city.trim()).filter(Boolean), ville: city.trim() } }); await onRefresh(); setMessage('Modifications enregistrées.') }
    catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }
  return <div className={styles.detailStack}><section className={styles.detailIntro}><span>VOTRE VITRINE</span><h2>Les informations pratiques de la boutique</h2><p>Ces renseignements aident les clients à vous trouver et à connaître vos zones de livraison. Le statut, le lien public et la commission sont gérés par KatiHub.</p></section><section className={styles.settingsCard}><form onSubmit={event => void save(event)}><label>Nom affiché<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><label>Présentation<textarea rows={5} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Parlez de votre savoir-faire, de vos produits…" /></label><label>Ville de la boutique <small>Affichée aux clients sur vos fiches produit, à la place du nom de la boutique.</small><input required minLength={2} maxLength={60} list="villes-boutique" value={city} onChange={event => setCity(event.target.value)} placeholder="Douala" /><datalist id="villes-boutique">{VILLES_CAMEROUN.map(ville => <option key={ville} value={ville} />)}</datalist></label><fieldset><legend>Modes de livraison</legend><label><input type="checkbox" checked={modes.includes('katihub')} onChange={event => setModes(event.target.checked ? [...modes, 'katihub'] : modes.filter(mode => mode !== 'katihub'))} /> Livraison KatiHub</label><label><input type="checkbox" checked={modes.includes('vendeur')} onChange={event => setModes(event.target.checked ? [...modes, 'vendeur'] : modes.filter(mode => mode !== 'vendeur'))} /> Livraison par la boutique</label></fieldset><label>Villes desservies <small>Séparez les villes par une virgule.</small><input required value={cities} onChange={event => setCities(event.target.value)} placeholder="Douala, Yaoundé" /></label><div className={styles.settingsMeta}><span>Adresse publique : /boutiques/{shop.slug}</span><span>Statut : {STATUS_LABELS[shop.statut] ?? shop.statut}</span></div>{message ? <p className={styles.feedback} role="status">{message}</p> : null}<button type="submit" disabled={pending || modes.length === 0}>{pending ? 'Enregistrement…' : 'Enregistrer les modifications'}</button></form></section></div>
}

const MEMBER_ROLES: Record<string, string> = {
  proprietaire: 'Propriétaire', gestionnaire: 'Gestionnaire', magasinier: 'Magasinier',
  catalogue: 'Ancien rôle catalogue', support: 'Ancien rôle support',
  commandes: 'Ancien rôle commandes', finance: 'Ancien rôle finance', livraison: 'Ancien rôle livraison',
}

function MembersPanel({ shopId, members, canManage, onRefresh }: {
  shopId: string; members: ShopMember[]; canManage: boolean; onRefresh: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'gestionnaire' | 'magasinier'>('magasinier')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [showRevoked, setShowRevoked] = useState(false)
  const visibleMembers = members.filter(member => member.actif || showRevoked)
  const revokedCount = members.length - members.filter(member => member.actif).length

  async function invite(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage('')
    try {
      const result = await api<{ courrielEnvoye: boolean }>(`/vendeurs/mes-boutiques/${shopId}/membres`, {
        methode: 'POST', corps: { nom: name.trim(), courriel: email.trim().toLowerCase(), role },
      })
      setName(''); setEmail(''); await onRefresh()
      setMessage(result.courrielEnvoye
        ? 'Invitation enregistrée et envoyée par e-mail.'
        : 'Accès préparé, mais aucun e-mail n’a été envoyé. Demandez à cette personne de créer un compte avec la même adresse, puis de se connecter à l’espace marchand.')
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }

  return <div className={styles.detailStack}><section className={styles.detailIntro}><span>VOTRE ÉQUIPE</span><h2>Chacun sa place dans la boutique</h2><p>Le gestionnaire suit l’activité et consulte les paiements, sans pouvoir demander de retrait. Le magasinier s’occupe du catalogue et des échanges avec les clients. Seul le propriétaire attribue les accès.</p></section>
    {canManage ? <section className={styles.settingsCard}><h3>Inviter une personne</h3><p className={styles.memberHint}>Utilisez l’adresse avec laquelle elle se connectera à KatiHub. Si elle n’a pas encore de compte, elle pourra en créer un avec cette même adresse.</p><form className={styles.memberInvite} onSubmit={event => void invite(event)}><label>Nom complet<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Marie Nguema" /></label><label>Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="marie@exemple.cm" /></label><label>Rôle<select value={role} onChange={event => setRole(event.target.value as 'gestionnaire' | 'magasinier')}><option value="magasinier">Magasinier · produits et avis</option><option value="gestionnaire">Gestionnaire · gestion courante</option></select></label><button disabled={pending}>{pending ? 'Invitation en cours…' : 'Inviter dans la boutique'}</button></form>{message ? <p className={styles.feedback} role="status">{message}</p> : null}</section> : null}
    <section className={styles.featureList}><header><h2>Membres de la boutique</h2><span>{members.filter(member => member.actif).length} actif(s)</span></header>{visibleMembers.length ? <ul>{visibleMembers.map(member => <MemberRow key={member.id} shopId={shopId} member={member} canManage={canManage} onRefresh={onRefresh} />)}</ul> : <p className={styles.blank}>Aucun membre pour le moment.</p>}{revokedCount ? <button className={styles.revokedToggle} onClick={() => setShowRevoked(value => !value)}>{showRevoked ? 'Masquer les accès révoqués' : `Voir les accès révoqués (${revokedCount})`}</button> : null}</section>
  </div>
}

function MemberRow({ shopId, member, canManage, onRefresh }: {
  shopId: string; member: ShopMember; canManage: boolean; onRefresh: () => Promise<void>
}) {
  const currentRole = member.roles.includes('proprietaire') ? 'proprietaire' : member.roles.includes('gestionnaire') ? 'gestionnaire' : member.roles.includes('magasinier') ? 'magasinier' : member.roles[0] ?? ''
  const [role, setRole] = useState(currentRole === 'gestionnaire' ? 'gestionnaire' : 'magasinier')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const isOwner = member.roles.includes('proprietaire')
  async function changeRole() {
    setPending(true); setMessage('')
    try { await api(`/vendeurs/mes-boutiques/${shopId}/membres/${member.id}`, { methode: 'PATCH', corps: { role } }); await onRefresh(); setMessage('Rôle mis à jour.') }
    catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }
  async function toggleAccess() {
    if (member.actif && !window.confirm(`Retirer l’accès de ${member.nom} à cette boutique ?`)) return
    setPending(true); setMessage('')
    try {
      await api(`/vendeurs/mes-boutiques/${shopId}/membres/${member.id}${member.actif ? '' : '/reactivation'}`, { methode: member.actif ? 'DELETE' : 'POST' })
      await onRefresh()
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }
  return <li className={styles.memberRow}><div><strong>{member.nom}</strong><small>{member.courriel}</small><small>{member.premiereConnexionLe ? `Première connexion le ${new Intl.DateTimeFormat('fr-CM').format(new Date(member.premiereConnexionLe))}` : 'En attente de première connexion'}</small>{message ? <small role="status">{message}</small> : null}</div><div className={styles.memberControls}><b data-status={member.actif ? 'active' : 'suspendue'}>{member.actif ? MEMBER_ROLES[currentRole] ?? currentRole : 'Accès révoqué'}</b>{canManage && !isOwner ? <div className={styles.memberActions}>{member.actif ? <><label><span className={styles.srOnly}>Rôle de {member.nom}</span><select aria-label={`Rôle de ${member.nom}`} value={role} onChange={event => setRole(event.target.value)}><option value="magasinier">Magasinier</option><option value="gestionnaire">Gestionnaire</option></select></label><button disabled={pending || role === currentRole} onClick={() => void changeRole()}>Enregistrer</button></> : null}<button className={styles.memberRevoke} disabled={pending} onClick={() => void toggleAccess()}>{member.actif ? 'Révoquer' : 'Réactiver'}</button></div> : null}</div></li>
}

function VerificationPanel({ shopId, documents, onRefresh }: { shopId: string; documents: SellerDocument[]; onRefresh: () => Promise<void> }) {
  const [type, setType] = useState('identite')
  const [fichier, setFichier] = useState<File | null>(null)
  const [refus, setRefus] = useState('')
  const [expiry, setExpiry] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const champ = useRef<HTMLInputElement>(null)
  const verification = useMemo<VerificationPieces>(() => fichier ? verifierPieces([fichier]) : { acceptees: [], refus: [] }, [fichier])

  function choisir(liste: FileList | null) {
    const premier = liste?.[0] ?? null
    const controle = premier ? verifierPieces([premier]) : null
    setRefus(controle?.refus[0] ? `${controle.refus[0].nom} : ${controle.refus[0].raison}.` : '')
    setFichier(controle?.acceptees[0] ?? null)
    setMessage('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!fichier) return setMessage('Choisissez le fichier du justificatif (PDF ou photo, 10 Mio maximum).')
    setPending(true); setMessage('')
    try {
      const corps = new FormData()
      corps.append('fichier', fichier)
      corps.append('type', type)
      if (expiry) corps.append('expireLe', expiry)
      await api(`/vendeurs/mes-boutiques/${shopId}/documents/fichier`, { methode: 'POST', corps })
      setFichier(null); setExpiry(''); if (champ.current) champ.current.value = ''
      setMessage('Justificatif transmis à KatiHub pour vérification.'); await onRefresh()
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }

  async function telecharger(document: SellerDocument) {
    try { await telechargerApi(`/vendeurs/mes-boutiques/${shopId}/documents/${document.id}/fichier`, document.nomFichier ?? `justificatif-${document.id}`) }
    catch (cause) { setMessage(errorText(cause)) }
  }

  return <div className={styles.featureGrid}><section className={styles.featureList}><header><h2>Historique des justificatifs</h2><span>{documents.length} document(s)</span></header>{documents.length ? <ul>{documents.map((document) => <li key={document.id}><div><strong>{DOCUMENT_LABELS[document.type] ?? document.type}</strong><small>Soumis le {new Intl.DateTimeFormat('fr-FR').format(new Date(document.creeLe))}{document.expireLe ? ` · expire le ${new Intl.DateTimeFormat('fr-FR').format(new Date(document.expireLe))}` : ''}</small>{document.nomFichier ? <small>{document.nomFichier}{document.tailleOctets ? ` · ${taillePiece(document.tailleOctets)}` : ''} · <button type="button" className={styles.lienAction} onClick={() => void telecharger(document)}>Télécharger</button></small> : null}{document.motifDecision ? <em>{document.motifDecision}</em> : null}</div><b data-status={document.statut}>{STATUS_LABELS[document.statut] ?? document.statut}</b></li>)}</ul> : <p className={styles.blank}>Aucun document n’a encore été transmis.</p>}</section><section className={styles.actionPanel}><h2>Ajouter un justificatif</h2><p>Déposez un PDF ou une photo lisible (JPEG, PNG, WebP), 10 Mio maximum. Le fichier est analysé par un antivirus puis conservé chiffré ; seule l’équipe de vérification KatiHub y a accès.</p><form onSubmit={submit}><label>Type de document<select value={type} onChange={(e) => setType(e.target.value)}>{Object.entries(DOCUMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Fichier<input ref={champ} type="file" required accept={TYPES_PIECES.join(',')} onChange={(e) => choisir(e.currentTarget.files)} /></label>{refus ? <p className={styles.feedback} role="alert">{refus}</p> : null}{fichier ? <ApercuPieces verification={verification} /> : null}<label>Date d’expiration, si applicable<input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>{message ? <p className={styles.feedback} role="status">{message}</p> : null}<button disabled={pending || !fichier}>{pending ? 'Envoi sécurisé…' : 'Transmettre le justificatif'}</button></form></section></div>
}

/** Une fiche refusee ou archivee ne se modifie plus : elle ne sera pas publiee. */
const FICHE_EDITABLE = ['soumis', 'en_verification', 'actif', 'modification_demandee']

function ProductsPanel({ shopId, products, canPublish, onRefresh }: { shopId: string; products: ProductProposal[]; canPublish: boolean; onRefresh: () => Promise<void> }) {
  const [values, setValues] = useState({ nom: '', marque: '', categorie: '', sousCategorie: '', description: '' })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [fiche, setFiche] = useState<string | null>(null)
  const { categories, erreur: erreurCategories } = useCategoriesMarketplace()
  const racine = categories?.find(categorie => categorie.id === values.categorie)
  const sousCategorie = racine?.sousCategories.find(sous => sous.id === values.sousCategorie)
  const garantie = sousCategorie?.garantie ?? (racine && !racine.sousCategories.length ? racine.garantie : null)
  const categorieId = racine ? (racine.sousCategories.length ? sousCategorie?.id : racine.id) : undefined

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (!categorieId) return setMessage(racine ? 'Choisissez la sous-catégorie du produit.' : 'Choisissez la catégorie du produit.')
    setPending(true)
    try {
      await api(`/marketplace/boutiques/${shopId}/propositions-produits`, { methode: 'POST', corps: { nom: values.nom, slug: slugify(values.nom), marque: values.marque || undefined, categorieId, description: values.description || undefined } })
      setValues({ nom: '', marque: '', categorie: '', sousCategorie: '', description: '' }); setMessage('Produit envoyé à la modération.'); await onRefresh()
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }

  if (fiche) return <section className={styles.featureList}><EditeurFicheProduit key={fiche} boutiqueId={shopId} produitId={fiche} onFermer={() => setFiche(null)} /></section>
  return <div className={styles.featureGrid}><section className={styles.featureList}><header><h2>Vos propositions</h2><span>{products.length} produit(s)</span></header>{products.length ? <ul>{products.map((product) => <li key={product.id}><div><strong>{product.nom}</strong><small>{[product.marque, cheminCategorie(product.categorieDetail, product.categorie)].filter(Boolean).join(' · ')}{product.categorieDetail?.garantieMinimaleMois ? ` · garantie minimale ${product.categorieDetail.garantie}` : ''}</small></div><div className={styles.offerMeta}><b data-status={product.statut}>{STATUS_LABELS[product.statut] ?? product.statut}</b>{FICHE_EDITABLE.includes(product.statut) ? <button type="button" className={styles.lienAction} onClick={() => setFiche(product.id)}>Photos et référencement</button> : null}</div></li>)}</ul> : <p className={styles.blank}>Vous n’avez encore proposé aucun produit.</p>}</section><section className={styles.actionPanel}><h2>Proposer un produit</h2><p>{canPublish ? 'La proposition sera examinée avant de pouvoir recevoir une offre.' : 'Cette action sera disponible dès l’activation de votre boutique.'}</p><form onSubmit={submit}><label>Nom du produit<input required minLength={2} disabled={!canPublish} value={values.nom} onChange={(e) => setValues({ ...values, nom: e.target.value })} /></label><label>Marque<input disabled={!canPublish} value={values.marque} onChange={(e) => setValues({ ...values, marque: e.target.value })} /></label><label>Catégorie<select required disabled={!canPublish || !categories} value={values.categorie} onChange={(e) => setValues({ ...values, categorie: e.target.value, sousCategorie: '' })}><option value="">{categories ? 'Sélectionner…' : 'Chargement…'}</option>{categories?.map(categorie => <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>)}</select></label>{racine?.sousCategories.length ? <label>Sous-catégorie<select required disabled={!canPublish} value={values.sousCategorie} onChange={(e) => setValues({ ...values, sousCategorie: e.target.value })}><option value="">Sélectionner…</option>{racine.sousCategories.map(sous => <option key={sous.id} value={sous.id}>{sous.nom}</option>)}</select></label> : null}{garantie ? <p className={styles.feedback} data-testid="garantie-categorie">Garantie minimale de cette catégorie : <b>{garantie.mois ? garantie.libelle : 'aucune'}</b>. Vos offres devront garantir au moins cette durée.</p> : null}{erreurCategories ? <p className={styles.feedback} role="alert">{erreurCategories}</p> : null}<p className={styles.hint}>Les catégories sont définies par KatiHub. Si aucune ne convient, contactez l’équipe.</p><label>Description<textarea rows={5} disabled={!canPublish} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} /></label>{message ? <p className={styles.feedback}>{message}</p> : null}<button disabled={!canPublish || pending}>{pending ? 'Envoi…' : 'Envoyer à la modération'}</button></form></section></div>
}

function OffersPanel({ shop, products, offers, canPublish, onRefresh }: { shop: ShopSpace; products: ProductProposal[]; offers: Offer[]; canPublish: boolean; onRefresh: () => Promise<void> }) {
  const activeProducts = products.filter((product) => product.statut === 'actif')
  const [values, setValues] = useState({ produitId: '', reference: '', titre: '', description: '', prix: '', prixReference: '', quantiteInitiale: '0', etat: 'neuf', garantie: '0', delai: '2' })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const [pendingStock, setPendingStock] = useState('')
  const [stockMessage, setStockMessage] = useState('')
  const [origineVariante, setOrigineVariante] = useState<Offer | null>(null)
  const [offrePrix, setOffrePrix] = useState<Offer | null>(null)

  const produitChoisi = activeProducts.find(product => product.id === values.produitId)
  const garantieMinimale = produitChoisi?.categorieDetail?.garantieMinimaleMois ?? 0

  function choisirProduit(produitId: string) {
    const minimum = activeProducts.find(product => product.id === produitId)?.categorieDetail?.garantieMinimaleMois ?? 0
    // La garantie part du minimum de la categorie ; le marchand peut promettre plus.
    setValues(actuelles => ({ ...actuelles, produitId, garantie: String(Math.max(minimum, Number(actuelles.garantie) || 0)) }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage('')
    if (Number(values.garantie) < garantieMinimale) return setMessage(`La garantie de cette catégorie est d’au moins ${libelleMois(garantieMinimale)}.`)
    setPending(true)
    try {
      await api(`/marketplace/boutiques/${shop.id}/offres`, { methode: 'POST', corps: { produitId: values.produitId, referenceVendeur: values.reference.trim(), titre: values.titre.trim(), description: values.description.trim() || undefined, prixFcfa: Number(values.prix), prixReferenceFcfa: values.prixReference ? Number(values.prixReference) : undefined, quantiteInitiale: Number(values.quantiteInitiale), etat: values.etat, garantieMois: Number(values.garantie), modesLivraison: shop.modesLivraison, villesLivraison: shop.villesLivraison, delaiMaxJours: Number(values.delai) } })
      setValues({ produitId: '', reference: '', titre: '', description: '', prix: '', prixReference: '', quantiteInitiale: '0', etat: 'neuf', garantie: '0', delai: '2' }); setMessage('Offre envoyée à la modération.'); await onRefresh()
    } catch (cause) { setMessage(errorText(cause)) } finally { setPending(false) }
  }

  async function updateStock(event: FormEvent, offer: Offer) {
    event.preventDefault(); setPendingStock(offer.id); setStockMessage('')
    const quantite = Number(stockDrafts[offer.id] ?? offer.stock?.quantite ?? 0)
    try {
      await api(`/marketplace/boutiques/${shop.id}/offres/${offer.id}/stock`, { methode: 'POST', corps: { quantite, motif: 'Mise à jour depuis l’espace vendeur' } })
      setStockMessage('Stock mis à jour.'); await onRefresh()
    } catch (cause) { setStockMessage(errorText(cause)) } finally { setPendingStock('') }
  }

  return <div className={styles.featureGrid}><section className={styles.featureList}><header><h2>Catalogue de la boutique</h2><span>{offers.length} offre(s)</span></header>{stockMessage ? <p className={styles.feedback}>{stockMessage}</p> : null}{offers.length ? <ul>{offers.map((offer) => <li key={offer.id}><div><strong>{offer.produit.nom}{offer.libelleVariante ? <span className={styles.variante}> — {offer.libelleVariante}</span> : null}</strong><small>{offer.referenceVendeur} · Disponible {offer.stock ? Math.max(0, offer.stock.quantite - offer.stock.quantiteReservee) : 0} · Réservé {offer.stock?.quantiteReservee ?? 0}</small><form className={styles.stockEditor} onSubmit={(event) => void updateStock(event, offer)}><label>Stock total<input aria-label={`Stock total de ${offer.produit.nom}`} type="number" min={offer.stock?.quantiteReservee ?? 0} max="1000000" value={stockDrafts[offer.id] ?? String(offer.stock?.quantite ?? 0)} onChange={(event) => setStockDrafts({ ...stockDrafts, [offer.id]: event.target.value })} /></label><button disabled={pendingStock === offer.id}>{pendingStock === offer.id ? 'Mise à jour…' : 'Actualiser'}</button></form></div><div className={styles.offerMeta}><span>{offer.revisions[0] ? money(offer.revisions[0].prixFcfa) : '—'}</span><b data-status={offer.statut}>{STATUS_LABELS[offer.statut] ?? offer.statut}</b>{revisionOuverte(offer) ? <small>Modification en validation</small> : null}{canPublish && offer.statut !== 'archivee' ? <span className={styles.variantActions}><button type="button" className={styles.lienAction} disabled={Boolean(revisionOuverte(offer)) || !offer.revisions.length} onClick={() => setOffrePrix(offer)}>Modifier le prix</button><button type="button" className={styles.lienAction} onClick={() => setOrigineVariante(offer)}>Ajouter une variante</button></span> : null}</div></li>)}</ul> : <p className={styles.blank}>Aucune offre dans cette boutique.</p>}{origineVariante ? <FenetreNouvelleVariante key={origineVariante.id} boutiqueId={shop.id} origine={origineVariante} onFermer={() => setOrigineVariante(null)} onCreee={async () => { setStockMessage('Variante envoyée à la modération.'); await onRefresh() }} /> : null}{offrePrix ? <FenetrePrixVariante key={offrePrix.id} boutiqueId={shop.id} offre={offrePrix} onFermer={() => setOffrePrix(null)} onSoumis={async () => { setStockMessage('Nouveau prix envoyé à la modération. Le prix actuel reste affiché jusqu’à la validation.'); await onRefresh() }} /> : null}</section><section className={styles.actionPanel}><h2>Créer une offre</h2><p>{!canPublish ? 'La boutique doit être active.' : !activeProducts.length ? 'Un produit approuvé par KatiHub est requis.' : 'Les prix, le stock et les conditions seront examinés avant publication.'}</p><form onSubmit={submit}><label>Produit<select required disabled={!canPublish || !activeProducts.length} value={values.produitId} onChange={(e) => choisirProduit(e.target.value)}><option value="">Sélectionner…</option>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.nom}</option>)}</select></label><label>Référence vendeur<input required disabled={!canPublish} value={values.reference} onChange={(e) => setValues({ ...values, reference: e.target.value })} /></label><label>Titre de l’offre<input required minLength={2} disabled={!canPublish} value={values.titre} onChange={(e) => setValues({ ...values, titre: e.target.value })} /></label><div className={styles.twoFields}><label>Prix FCFA<input required type="number" min="1" disabled={!canPublish} value={values.prix} onChange={(e) => setValues({ ...values, prix: e.target.value })} /></label><label>Prix de référence<input type="number" min="1" disabled={!canPublish} value={values.prixReference} onChange={(e) => setValues({ ...values, prixReference: e.target.value })} /></label></div><div className={styles.twoFields}><label>Stock initial<input required type="number" min="0" max="1000000" disabled={!canPublish} value={values.quantiteInitiale} onChange={(e) => setValues({ ...values, quantiteInitiale: e.target.value })} /></label><label>État<select disabled={!canPublish} value={values.etat} onChange={(e) => setValues({ ...values, etat: e.target.value })}><option value="neuf">Neuf</option><option value="reconditionne">Reconditionné</option><option value="occasion">Occasion</option></select></label></div><div className={styles.twoFields}><label>Délai maximal<input type="number" min="0" max="90" disabled={!canPublish} value={values.delai} onChange={(e) => setValues({ ...values, delai: e.target.value })} /></label><label>Garantie en mois<input type="number" min={garantieMinimale} max="120" disabled={!canPublish} value={values.garantie} onChange={(e) => setValues({ ...values, garantie: e.target.value })} aria-describedby="garantie-minimale-offre" /><small id="garantie-minimale-offre">{garantieMinimale ? `Minimum de la catégorie : ${libelleMois(garantieMinimale)}` : 'Aucune garantie minimale imposée'}</small></label></div><label>Description<textarea rows={4} disabled={!canPublish} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} /></label>{message ? <p className={styles.feedback}>{message}</p> : null}<button disabled={!canPublish || !activeProducts.length || pending}>{pending ? 'Envoi…' : 'Créer et soumettre l’offre'}</button></form></section></div>
}
