import type { CartLine } from './cart'

export type DeliveryMode = 'vendeur' | 'katihub'
export interface LiveOffer {
  id: string
  titre: string | null
  prixFcfa: number | null
  disponible: number
  modesLivraison: DeliveryMode[]
  villesLivraison: string[]
  delaiMaxJours: number | null
  quantiteMinimale?: number
  boutique: { id: string; nom: string; slug: string }
}
export interface LiveProduct { nom: string; slug: string; offres: LiveOffer[] }
export interface CheckedLine { line: CartLine; offer: LiveOffer | null; issue: string | null }
export interface DeliveryGroup { id: string; name: string; lines: CheckedLine[]; modes: DeliveryMode[] }
export interface MarketplaceOrder {
  reference: string; statut: string; totalFermeTtc: number; fraisLivraison: number
  acompteDu: number; acompteRecu: number; resteAPayer: number
  modePaiementMarketplace?: 'acompte' | 'complet'; assuranceFcfa?: number; installationFcfa?: number; katiUtilises?: number; remiseKatiFcfa?: number
  sousCommandes: Array<{ reference: string; boutiqueId: string; boutique?: { nom: string; slug: string }; totalNetProduits: number; modeLivraison: DeliveryMode; lignes: Array<{ offreTitreCapture: string; quantite: number; totalNetFcfa: number; quantiteRefusee?: number; refus?: { motif: string; remboursementDuFcfa: number; rembourseLe: string | null } | null }> }>
}
export function checkLines(lines: readonly CartLine[], products: LiveProduct[]): CheckedLine[] {
  const bySlug = new Map(products.map(p => [p.slug, p]))
  return lines.map(line => {
    const offer = bySlug.get(line.slug)?.offres.find(o => o.id === line.offerId) ?? null
    const issue = !line.offerId ? 'Cet article appartient au catalogue historique. Commandez-le séparément.'
      : !offer || offer.prixFcfa === null ? 'Cette offre n’est plus disponible.'
      : offer.boutique.id !== line.boutiqueId ? 'La boutique de cette offre a changé. Retirez puis ajoutez cet article.'
      : line.qty < (offer.quantiteMinimale ?? 1) ? `Minimum de commande : ${offer.quantiteMinimale} unités. Ajustez la quantité.`
      : offer.disponible < line.qty ? `Stock disponible : ${offer.disponible} unité(s). Ajustez la quantité.`
      : null
    return { line, offer, issue }
  })
}
export function groupDeliveries(checked: CheckedLine[]): DeliveryGroup[] {
  const groups = new Map<string, DeliveryGroup>()
  for (const item of checked) {
    if (!item.offer) continue
    const { boutique } = item.offer
    const group = groups.get(boutique.id) ?? { id: boutique.id, name: boutique.nom, lines: [], modes: [...item.offer.modesLivraison] }
    group.lines.push(item)
    group.modes = group.modes.filter(mode => item.offer!.modesLivraison.includes(mode))
    groups.set(boutique.id, group)
  }
  return [...groups.values()]
}
export function commonCities(checked: CheckedLine[]): string[] {
  const offers = checked.flatMap(item => item.offer ? [item.offer] : [])
  if (!offers.length) return []
  return offers[0].villesLivraison.filter(city => offers.every(offer => offer.villesLivraison.some(value => value.toLocaleLowerCase('fr') === city.toLocaleLowerCase('fr'))))
}
// Indicative UI estimate. The created order supplies the authoritative amount.
export function estimatedDeposit(total: number): number {
  if (!Number.isSafeInteger(total) || total <= 0) return 0
  return Math.min(total, Math.max(1000, Math.ceil(total / 10)))
}
export function checkedTotal(checked: CheckedLine[]): number {
  return checked.reduce((sum, item) => sum + (item.offer?.prixFcfa ?? item.line.price) * item.line.qty, 0)
}
