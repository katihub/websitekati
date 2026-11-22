import type { MerchantProductDraft } from './merchant-product-ai'
import type { LigneVariante } from './variantes-produit'

export type BrouillonProduit = {
  version: 2
  cleCreation: string
  values: MerchantProductDraft
  variantes: LigneVariante[]
  vente: { etat: string; garantie: string; delai: string }
  autres: string[]
  avaitPhotos: boolean
  avaitPdf?: boolean
  enregistreLe: string
}

type AncienBrouillon = Omit<BrouillonProduit, 'version'> & { version: 1 }

export const prefixeBrouillonsProduits = (boutiqueId: string) => `katimarket:produit:brouillon:${boutiqueId}:`
export const cleBrouillonProduit = (boutiqueId: string, cleCreation: string) => `${prefixeBrouillonsProduits(boutiqueId)}${cleCreation}`
export const cleVerrouBrouillon = (boutiqueId: string, cleCreation: string) => `katimarket:produit:verrou:${boutiqueId}:${cleCreation}`

function valide(valeur: unknown): valeur is BrouillonProduit {
  if (!valeur || typeof valeur !== 'object') return false
  const b = valeur as Partial<BrouillonProduit>
  return b.version === 2 && typeof b.cleCreation === 'string' && Boolean(b.values && typeof b.values === 'object')
    && Array.isArray(b.variantes) && Boolean(b.vente && typeof b.vente === 'object') && Array.isArray(b.autres)
    && typeof b.enregistreLe === 'string'
}

/** Migre une fois l'ancien brouillon unique vers la collection multi-brouillons. */
export function migrerAncienBrouillon(stockage: Storage, boutiqueId: string) {
  const ancienneCle = `katimarket:produit:brouillon:${boutiqueId}`
  const brut = stockage.getItem(ancienneCle)
  if (!brut) return
  try {
    const ancien = JSON.parse(brut) as AncienBrouillon
    if (ancien.version === 1 && ancien.cleCreation) {
      stockage.setItem(cleBrouillonProduit(boutiqueId, ancien.cleCreation), JSON.stringify({ ...ancien, version: 2 }))
    }
  } finally {
    stockage.removeItem(ancienneCle)
  }
}

export function listerBrouillonsProduits(stockage: Storage, boutiqueId: string): BrouillonProduit[] {
  migrerAncienBrouillon(stockage, boutiqueId)
  const prefixe = prefixeBrouillonsProduits(boutiqueId)
  const resultat: BrouillonProduit[] = []
  for (let index = 0; index < stockage.length; index += 1) {
    const cle = stockage.key(index)
    if (!cle?.startsWith(prefixe)) continue
    try {
      const brouillon = JSON.parse(stockage.getItem(cle) ?? '') as unknown
      if (valide(brouillon)) resultat.push(brouillon)
    } catch {
      stockage.removeItem(cle)
    }
  }
  return resultat.sort((a, b) => b.enregistreLe.localeCompare(a.enregistreLe))
}

export function lireBrouillonProduit(stockage: Storage, boutiqueId: string, cleCreation: string) {
  const brut = stockage.getItem(cleBrouillonProduit(boutiqueId, cleCreation))
  if (!brut) return null
  const brouillon = JSON.parse(brut) as unknown
  if (!valide(brouillon)) throw new Error('Brouillon illisible')
  return brouillon
}

export function sauverBrouillonProduit(stockage: Storage, boutiqueId: string, brouillon: BrouillonProduit) {
  stockage.setItem(cleBrouillonProduit(boutiqueId, brouillon.cleCreation), JSON.stringify(brouillon))
}

export function supprimerBrouillonProduit(stockage: Storage, boutiqueId: string, cleCreation: string) {
  stockage.removeItem(cleBrouillonProduit(boutiqueId, cleCreation))
}
