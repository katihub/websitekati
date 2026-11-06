'use client'

import { categoriesRangeables, MAX_AUTRES_CATEGORIES, type CategorieMarketplace } from './categories'

/**
 * LES DEUX AUTRES RAYONS D'UN PRODUIT, facultatifs. Le produit y apparait aussi ;
 * seule la categorie principale porte les regles (garantie, variantes).
 */
export function AutresCategories({ arbre, principale, valeur, onChange, className }: {
  arbre: readonly CategorieMarketplace[] | null | undefined
  principale: string | undefined
  valeur: string[]
  onChange: (valeur: string[]) => void
  className?: string
}) {
  const options = categoriesRangeables(arbre)
  const choisir = (rang: number, id: string) => {
    const suivante = [...valeur]
    suivante[rang] = id
    onChange([...new Set(suivante.filter(Boolean))].filter((autre) => autre !== principale).slice(0, MAX_AUTRES_CATEGORIES))
  }
  return <>
    {Array.from({ length: MAX_AUTRES_CATEGORIES }, (_, rang) => <label key={rang} className={className}>
      Autre catégorie {rang + 1} <span>(facultatif)</span>
      <select value={valeur[rang] ?? ''} disabled={rang > valeur.length} onChange={(e) => choisir(rang, e.target.value)} data-testid={`autre-categorie-${rang + 1}`}>
        <option value="">Aucune</option>
        {options.filter((option) => option.id !== principale && (option.id === valeur[rang] || !valeur.includes(option.id))).map((option) => <option key={option.id} value={option.id}>{option.libelle}</option>)}
      </select>
    </label>)}
  </>
}
