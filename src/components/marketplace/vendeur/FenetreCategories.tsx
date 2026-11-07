'use client'

import { useState } from 'react'

import { api } from '@/lib/api'
import { FenetreAction } from '@/components/ui/FenetreAction'
import { AutresCategories } from './AutresCategories'
import { categoriesRangeables, useCategoriesMarketplace } from './categories'

/**
 * LES CATEGORIES D'UN PRODUIT DE LA BOUTIQUE, CHANGEES TOUT DE SUITE (6 novembre
 * 2026) : pas de validation. La principale garde les regles ; une principale dont
 * la garantie depasse celle des offres publiees est refusee par le serveur.
 */
export function FenetreCategories({ boutiqueId, produit, onFermer, onEnregistre }: {
  boutiqueId: string
  produit: { id: string; nom: string; categorieId?: string | null; categoriesSupplementaires?: string[] } | null
  onFermer: () => void
  onEnregistre: () => Promise<void>
}) {
  const { categories } = useCategoriesMarketplace()
  const [principale, setPrincipale] = useState(produit?.categorieId ?? '')
  const [autres, setAutres] = useState<string[]>(produit?.categoriesSupplementaires ?? [])
  const options = categoriesRangeables(categories)

  async function valider() {
    if (!produit) return
    if (!principale) throw new Error('Choisissez la catégorie principale du produit.')
    await api(`/marketplace/boutiques/${boutiqueId}/produits/${produit.id}/categories`, {
      methode: 'POST', corps: { categorieId: principale, categoriesSupplementaires: autres.filter((id) => id !== principale) },
    })
    await onEnregistre()
  }

  return <FenetreAction
    ouverte={Boolean(produit)}
    titre={`Catégories de « ${produit?.nom ?? ''} »`}
    description="Jusqu’à 3 catégories. Le produit apparaît dans chacune ; la première garde les règles (garantie minimale, variantes). Le changement est publié tout de suite."
    libelleValider="Enregistrer les catégories"
    onValider={valider}
    onFermer={onFermer}
  >
    <label className="grid grid-cols-1 gap-1 text-small font-semibold">Catégorie principale
      <select required value={principale} onChange={(e) => { setPrincipale(e.target.value); setAutres((liste) => liste.filter((id) => id !== e.target.value)) }} className="w-full min-w-0 rounded-control border border-rule bg-surface p-3 text-small font-normal" data-testid="categorie-principale">
        <option value="">Sélectionner…</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.libelle}</option>)}
      </select>
    </label>
    <div className="grid grid-cols-1 gap-3 text-small font-semibold [&_select]:mt-1 [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-control [&_select]:border [&_select]:border-rule [&_select]:bg-surface [&_select]:p-3 [&_select]:font-normal [&_span]:font-normal [&_span]:text-ink-3">
      <AutresCategories arbre={categories} principale={principale || undefined} valeur={autres} onChange={setAutres} className="grid grid-cols-1" />
    </div>
  </FenetreAction>
}
