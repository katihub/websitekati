'use client'

import { useState } from 'react'

import { api } from '@/lib/api'
import { ChampTexte, FenetreAction } from '@/components/ui/FenetreAction'

/**
 * LES VARIANTES D'UNE OFFRE ET LEUR PRIX, VUS DU MARCHAND.
 *
 * Une variante est une offre soeur sur le meme produit : son libelle (« 128 Go /
 * Noir »), ses attributs, sa reference, son prix et son stock. Elle reprend les
 * conditions (etat, garantie, livraison) de l'offre d'origine et passe en
 * moderation comme toute offre. Changer un prix, c'est soumettre une revision :
 * le prix publie ne bouge qu'apres validation par KatiHub.
 */

export type RevisionVariante = {
  id: string
  statut: string
  numero: number
  titre: string
  description: string | null
  prixFcfa: number
  prixReferenceFcfa: number | null
  etat: string
  garantieMois: number
  modesLivraison: string[]
  villesLivraison: string[]
  delaiMaxJours: number
  quantiteMinimale?: number
  libelleVariante: string | null
  attributsVariante: Record<string, string> | null
}

export type OffreVariante = {
  id: string
  statut: string
  prixFcfa: number | null
  libelleVariante: string | null
  attributsVariante: Record<string, string> | null
  quantiteMinimale?: number
  /** `attributsVariante` : ceux que la categorie du produit propose (« Capacite », « Couleur »). */
  produit: { id: string; nom: string; attributsVariante?: string[] }
  revisions: RevisionVariante[]
}

/** Le backend accepte six attributs ; la fenetre en montre trois et en ajoute a la demande. */
const LIGNES_ATTRIBUTS = 6
const LIGNES_VISIBLES = 3
const REVISION_OUVERTE = ['soumise', 'en_verification']

/** Les paires nom/valeur saisies, sans les lignes vides ; null si aucune. */
export function attributsDepuisFormulaire(donnees: FormData): Record<string, string> | null {
  const attributs: Record<string, string> = {}
  for (let i = 0; i < LIGNES_ATTRIBUTS; i++) {
    const nom = String(donnees.get(`attribut-nom-${i}`) ?? '').trim()
    const valeur = String(donnees.get(`attribut-valeur-${i}`) ?? '').trim()
    if (!nom && !valeur) continue
    if (!nom || !valeur) throw new Error('Chaque attribut a besoin d’un nom et d’une valeur (ex. Couleur : Noir).')
    attributs[nom] = valeur
  }
  return Object.keys(attributs).length ? attributs : null
}

function entier(donnees: FormData, nom: string, requis = true): number | undefined {
  const brut = String(donnees.get(nom) ?? '').trim()
  if (!brut) {
    if (requis) throw new Error('Un montant est requis.')
    return undefined
  }
  const valeur = Number(brut)
  if (!Number.isInteger(valeur) || valeur < 0) throw new Error('Les montants et quantités sont des nombres entiers positifs.')
  return valeur
}

export function revisionOuverte(offre: OffreVariante) {
  const derniere = offre.revisions[0]
  return derniere && REVISION_OUVERTE.includes(derniere.statut) ? derniere : null
}

export function FenetreNouvelleVariante({ boutiqueId, origine, onFermer, onCreee }: {
  boutiqueId: string
  origine: OffreVariante | null
  onFermer: () => void
  onCreee: () => Promise<void>
}) {
  // Les attributs de la categorie sont proposes d'office ; le marchand peut en ajouter.
  const proposes = (origine?.produit.attributsVariante ?? []).slice(0, LIGNES_ATTRIBUTS)
  const [lignes, setLignes] = useState(Math.max(LIGNES_VISIBLES, proposes.length))
  async function valider(donnees: FormData) {
    if (!origine) return
    const attributs = attributsDepuisFormulaire(donnees)
    const libelle = String(donnees.get('libelle') ?? '').trim() || (attributs ? Object.values(attributs).join(' / ') : '')
    if (!libelle) throw new Error('Donnez un nom à la variante, ou au moins un attribut.')
    const prixFcfa = entier(donnees, 'prix')!
    const prixReferenceFcfa = entier(donnees, 'prix-reference', false)
    if (prixReferenceFcfa !== undefined && prixReferenceFcfa <= prixFcfa) throw new Error('Le prix barré doit être supérieur au prix de vente.')
    await api(`/marketplace/boutiques/${boutiqueId}/offres/${origine.id}/variantes`, {
      methode: 'POST',
      corps: {
        libelleVariante: libelle,
        attributsVariante: attributs ?? undefined,
        referenceVendeur: String(donnees.get('reference') ?? '').trim(),
        prixFcfa,
        prixReferenceFcfa,
        quantiteInitiale: entier(donnees, 'stock', false) ?? 0,
      },
    })
    await onCreee()
    onFermer()
  }

  return (
    <FenetreAction
      ouverte={Boolean(origine)}
      titre="Ajouter une variante"
      description={origine ? <>Variante de <strong>{origine.produit.nom}</strong>. Elle reprend l’état, la garantie et la livraison de l’offre d’origine, avec son propre prix et son propre stock. KatiHub la valide avant publication.</> : null}
      libelleValider="Soumettre la variante"
      onValider={valider}
      onFermer={onFermer}
    >
      <fieldset className="grid gap-2">
        <legend className="text-small font-semibold">Attributs <span className="font-normal text-ink-3">(facultatif, jusqu’à {LIGNES_ATTRIBUTS})</span></legend>
        {Array.from({ length: lignes }, (_, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input name={`attribut-nom-${i}`} maxLength={40} aria-label={`Nom de l’attribut ${i + 1}`} defaultValue={proposes[i]} placeholder={['Capacité', 'Couleur', 'Taille', 'Matière', 'Garantie fabricant', 'Connectivité'][i]} className="rounded-control border border-rule bg-surface p-3 text-small" />
            <input name={`attribut-valeur-${i}`} maxLength={60} aria-label={`Valeur de l’attribut ${i + 1}`} placeholder={['128 Go', 'Noir', 'XL', 'Coton', '2 ans', '5G'][i]} className="rounded-control border border-rule bg-surface p-3 text-small" />
          </div>
        ))}
        {lignes < LIGNES_ATTRIBUTS ? <button type="button" onClick={() => setLignes((n) => Math.min(LIGNES_ATTRIBUTS, n + 1))} className="justify-self-start min-h-11 rounded-control border border-dashed border-rule px-3 text-small font-semibold">+ Ajouter un attribut</button> : null}
      </fieldset>
      <ChampTexte nom="libelle" libelle="Nom affiché au client" aide="Vide : composé à partir des attributs (ex. 128 Go / Noir)." maxLength={120} />
      <ChampTexte nom="reference" libelle="Référence vendeur" required minLength={1} maxLength={80} placeholder="A15-128-NOIR" />
      <div className="grid grid-cols-2 gap-3">
        <ChampTexte nom="prix" libelle="Prix FCFA" required inputMode="numeric" pattern="[0-9]+" />
        <ChampTexte nom="prix-reference" libelle="Prix barré" inputMode="numeric" pattern="[0-9]*" />
      </div>
      <ChampTexte nom="stock" libelle="Stock initial" inputMode="numeric" pattern="[0-9]*" defaultValue="0" />
    </FenetreAction>
  )
}

export function FenetrePrixVariante({ boutiqueId, offre, onFermer, onSoumis }: {
  boutiqueId: string
  offre: OffreVariante | null
  onFermer: () => void
  onSoumis: () => Promise<void>
}) {
  const base = offre?.revisions[0]

  async function valider(donnees: FormData) {
    if (!offre || !base) return
    const prixFcfa = entier(donnees, 'prix')!
    const prixReferenceFcfa = entier(donnees, 'prix-reference', false)
    if (prixReferenceFcfa !== undefined && prixReferenceFcfa <= prixFcfa) throw new Error('Le prix barré doit être supérieur au prix de vente.')
    // La revision reprend tout le reste de la derniere version : seul le prix change.
    await api(`/marketplace/boutiques/${boutiqueId}/offres/${offre.id}/revisions`, {
      methode: 'POST',
      corps: {
        titre: base.titre,
        description: base.description ?? undefined,
        prixFcfa,
        prixReferenceFcfa,
        etat: base.etat,
        garantieMois: base.garantieMois,
        modesLivraison: base.modesLivraison,
        villesLivraison: base.villesLivraison,
        delaiMaxJours: base.delaiMaxJours,
        quantiteMinimale: entier(donnees, 'minimum', false) || base.quantiteMinimale || offre.quantiteMinimale || 1,
        libelleVariante: base.libelleVariante ?? offre.libelleVariante ?? undefined,
        attributsVariante: base.attributsVariante ?? offre.attributsVariante ?? undefined,
      },
    })
    await onSoumis()
    onFermer()
  }

  return (
    <FenetreAction
      ouverte={Boolean(offre)}
      titre="Prix et minimum de commande"
      description={offre ? <>{offre.produit.nom}{offre.libelleVariante ? <> — <strong>{offre.libelleVariante}</strong></> : null}. Le nouveau prix et le nouveau minimum s’appliquent après validation par KatiHub ; d’ici là, les conditions actuelles restent en vigueur.</> : null}
      libelleValider="Soumettre"
      onValider={valider}
      onFermer={onFermer}
    >
      <div className="grid grid-cols-2 gap-3">
        <ChampTexte nom="prix" libelle="Prix FCFA" required inputMode="numeric" pattern="[0-9]+" defaultValue={String(base?.prixFcfa ?? offre?.prixFcfa ?? '')} />
        <ChampTexte nom="prix-reference" libelle="Prix barré" inputMode="numeric" pattern="[0-9]*" defaultValue={base?.prixReferenceFcfa ? String(base.prixReferenceFcfa) : ''} />
      </div>
      <ChampTexte nom="minimum" libelle="Minimum de commande" aide="La plus petite quantité qu’un client peut commander ou demander en devis." required inputMode="numeric" pattern="[1-9][0-9]{0,3}" defaultValue={String(base?.quantiteMinimale ?? offre?.quantiteMinimale ?? 1)} />
    </FenetreAction>
  )
}
