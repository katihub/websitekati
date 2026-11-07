'use client'

import { useState } from 'react'

import { api, ErreurApi } from '@/lib/api'
import { libelleStatutStock, STATUTS_STOCK, type StatutStock } from '@/lib/stock'
import { AutresCategories } from './AutresCategories'
import { categoriesRangeables, libelleMois, useCategoriesMarketplace } from './categories'
import { FenetreNouvelleVariante, type OffreVariante } from './FenetresVariante'
import styles from './prix-variantes.module.css'

/**
 * CE QUE LA BOUTIQUE CHANGE TOUT DE SUITE SUR SA FICHE (6 novembre 2026) : les
 * categories, le prix, le prix barre, le statut du stock, le minimum commandable et
 * le delai. L'etat et la garantie restent valides par KatiMarket.
 */
export type OffreDuProduit = OffreVariante & {
  referenceVendeur: string
  prixReferenceFcfa?: number | null
  statutStock?: StatutStock
  delaiMaxJours?: number | null
  etat?: string | null
  garantieMois?: number | null
}

type Brouillon = { prix: string; prixBarre: string; minimum: string; statut: StatutStock }
const REVISIONS_OUVERTES = ['soumise', 'en_verification']
const ETATS: Record<string, string> = { neuf: 'Neuf', reconditionne: 'Reconditionné', occasion: 'Occasion' }
const erreur = (cause: unknown) => (cause instanceof ErreurApi || cause instanceof Error ? cause.message : 'L’action n’a pas pu aboutir.')

const depuis = (offre: OffreDuProduit): Brouillon => {
  const base = offre.revisions[0]
  return {
    prix: String(offre.prixFcfa ?? base?.prixFcfa ?? ''),
    prixBarre: String(offre.prixReferenceFcfa ?? base?.prixReferenceFcfa ?? ''),
    minimum: String(offre.quantiteMinimale ?? base?.quantiteMinimale ?? 1),
    statut: offre.statutStock ?? 'en_stock',
  }
}

function Badge({ direct }: { direct: boolean }) {
  return <span className={direct ? styles.badgeDirect : styles.badgeValide}>{direct ? 'Publié tout de suite' : 'Validé par KatiMarket'}</span>
}

export function VenteDuProduit({ boutiqueId, produit, offres, onRefresh, direct = true }: {
  boutiqueId: string
  /** Faux pour un vendeur sous surveillance : l'etat et la garantie attendent la validation (7 novembre 2026). */
  direct?: boolean
  produit: { id: string; nom: string; categorieId?: string | null; categoriesSupplementaires?: string[] }
  offres: OffreDuProduit[]
  onRefresh: () => Promise<void>
}) {
  const { categories } = useCategoriesMarketplace()
  const [principale, setPrincipale] = useState(produit.categorieId ?? '')
  const [autres, setAutres] = useState<string[]>(produit.categoriesSupplementaires ?? [])
  const [brouillons, setBrouillons] = useState<Record<string, Brouillon>>({})
  const [occupe, setOccupe] = useState('')
  const [message, setMessage] = useState<{ type: 'succes' | 'erreur'; texte: string } | null>(null)
  const [origineVariante, setOrigineVariante] = useState<OffreDuProduit | null>(null)
  const base = offres[0]?.revisions[0]
  const [delai, setDelai] = useState(String(offres[0]?.delaiMaxJours ?? base?.delaiMaxJours ?? 2))
  const [etat, setEtat] = useState(offres[0]?.etat ?? base?.etat ?? 'neuf')
  const [garantie, setGarantie] = useState(String(offres[0]?.garantieMois ?? base?.garantieMois ?? 0))
  const options = categoriesRangeables(categories)

  async function agir(cle: string, action: () => Promise<void>, succes: string) {
    setOccupe(cle); setMessage(null)
    try { await action(); setMessage({ type: 'succes', texte: succes }); await onRefresh() } catch (cause) { setMessage({ type: 'erreur', texte: erreur(cause) }) } finally { setOccupe('') }
  }

  const enregistrerCategories = () => agir('categories', async () => {
    if (!principale) throw new Error('Choisissez la catégorie principale.')
    await api(`/marketplace/boutiques/${boutiqueId}/produits/${produit.id}/categories`, { methode: 'POST', corps: { categorieId: principale, categoriesSupplementaires: autres.filter((id) => id !== principale) } })
  }, 'Catégories enregistrées et publiées.')

  const enregistrerLigne = (offre: OffreDuProduit) => agir(offre.id, async () => {
    const avant = depuis(offre); const apres = brouillons[offre.id] ?? avant
    const prix = Number(apres.prix); const prixBarre = apres.prixBarre.trim() ? Number(apres.prixBarre) : null; const minimum = Number(apres.minimum)
    if (!Number.isInteger(prix) || prix < 1) throw new Error('Indiquez un prix valide en FCFA.')
    if (prixBarre !== null && (!Number.isInteger(prixBarre) || prixBarre <= prix)) throw new Error('Le prix barré doit être supérieur au prix de vente.')
    if (!Number.isInteger(minimum) || minimum < 1) throw new Error('Le minimum commandable est d’au moins 1.')
    const racine = `/marketplace/boutiques/${boutiqueId}/offres/${offre.id}`
    if (apres.prix !== avant.prix || apres.prixBarre !== avant.prixBarre) await api(`${racine}/prix`, { methode: 'POST', corps: { prixFcfa: prix, prixReferenceFcfa: prixBarre } })
    if (apres.minimum !== avant.minimum) await api(`${racine}/conditions`, { methode: 'POST', corps: { quantiteMinimale: minimum } })
    if (apres.statut !== avant.statut) await api(`${racine}/statut-stock`, { methode: 'POST', corps: { statutStock: apres.statut } })
    setBrouillons((liste) => Object.fromEntries(Object.entries(liste).filter(([id]) => id !== offre.id)))
  }, `${offre.libelleVariante ?? produit.nom} : enregistré et publié.`)

  const enregistrerDelai = () => agir('delai', async () => {
    for (const offre of offres) await api(`/marketplace/boutiques/${boutiqueId}/offres/${offre.id}/conditions`, { methode: 'POST', corps: { delaiMaxJours: Number(delai) } })
  }, 'Délai de préparation publié.')

  /** L'etat et la garantie : une revision par offre, validee par KatiMarket. */
  const proposerEtatGarantie = () => agir('garantie', async () => {
    const mois = Number(garantie)
    // Le serveur refuse une garantie sous le minimum de la categorie, avec la raison.
    if (!Number.isInteger(mois) || mois < 0 || mois > 120) throw new Error('Indiquez une garantie en mois, de 0 à 120.')
    for (const offre of offres) {
      const derniere = offre.revisions[0]
      if (!derniere) continue
      if (REVISIONS_OUVERTES.includes(derniere.statut)) throw new Error(`${offre.libelleVariante ?? produit.nom} : une modification est déjà en validation.`)
      await api(`/marketplace/boutiques/${boutiqueId}/offres/${offre.id}/revisions`, { methode: 'POST', corps: {
        titre: derniere.titre, description: derniere.description ?? undefined, prixFcfa: Number(depuis(offre).prix) || derniere.prixFcfa,
        prixReferenceFcfa: Number(depuis(offre).prixBarre) || undefined, etat, garantieMois: mois, modesLivraison: derniere.modesLivraison, villesLivraison: derniere.villesLivraison,
        delaiMaxJours: Number(delai), quantiteMinimale: Number(depuis(offre).minimum) || 1, libelleVariante: derniere.libelleVariante ?? offre.libelleVariante ?? undefined,
        attributsVariante: derniere.attributsVariante ?? offre.attributsVariante ?? undefined,
      } })
    }
  }, direct ? 'État et garantie enregistrés : ils sont en ligne.' : 'État et garantie envoyés à la validation de KatiMarket.')

  return <div className={styles.fiche}>
    {message ? <p role={message.type === 'erreur' ? 'alert' : 'status'} className={message.type === 'erreur' ? styles.erreur : styles.succes}>{message.texte}</p> : null}

    <section className={styles.bloc} aria-labelledby="fiche-categories">
      <header><h3 id="fiche-categories">Catégories</h3><Badge direct /></header>
      <p className={styles.aide}>Jusqu’à 3 catégories. Le produit apparaît dans chacune ; la première garde les règles (garantie minimale, variantes).</p>
      <div className={styles.champs}>
        <label>Catégorie principale<select value={principale} onChange={(e) => { setPrincipale(e.target.value); setAutres((liste) => liste.filter((id) => id !== e.target.value)) }} data-testid="fiche-categorie-principale"><option value="">Sélectionner…</option>{options.map((option) => <option key={option.id} value={option.id}>{option.libelle}</option>)}</select></label>
        <AutresCategories arbre={categories} principale={principale || undefined} valeur={autres} onChange={setAutres} />
      </div>
      <button type="button" className={styles.enregistrer} disabled={occupe === 'categories'} onClick={() => void enregistrerCategories()}>Enregistrer les catégories</button>
    </section>

    <section className={styles.bloc} aria-labelledby="fiche-variantes">
      <header><h3 id="fiche-variantes">Prix et variantes</h3><Badge direct /></header>
      <p className={styles.aide}>{direct ? 'Chaque ligne s’enregistre séparément et se publie aussitôt, nouvelles variantes comprises.' : 'Chaque ligne s’enregistre séparément et se publie aussitôt. Une variante nouvellement ajoutée passe par la validation.'}</p>
      {offres.length ? <div className={styles.scroll}><table className={styles.table}>
        <thead><tr><th>Variante</th><th>Référence</th><th>Prix FCFA</th><th>Prix barré</th><th>Minimum commandable</th><th>Statut du stock</th><th><span className={styles.sr}>Enregistrer</span></th></tr></thead>
        <tbody>{offres.map((offre) => {
          const valeur = brouillons[offre.id] ?? depuis(offre)
          const changer = (champ: keyof Brouillon, texte: string) => setBrouillons((actuels) => ({ ...actuels, [offre.id]: { ...(actuels[offre.id] ?? depuis(offre)), [champ]: texte } }))
          const modifie = JSON.stringify(valeur) !== JSON.stringify(depuis(offre))
          const nom = offre.libelleVariante ?? 'Sans variante'
          return <tr key={offre.id}>
            <td><strong>{nom}</strong>{offre.statut !== 'publiee' ? <small className={styles.enAttente}> · en validation</small> : null}</td>
            <td>{offre.referenceVendeur}</td>
            <td><input aria-label={`Prix de ${nom}`} inputMode="numeric" value={valeur.prix} onChange={(e) => changer('prix', e.target.value)} /></td>
            <td><input aria-label={`Prix barré de ${nom}`} inputMode="numeric" value={valeur.prixBarre} placeholder="Aucun" onChange={(e) => changer('prixBarre', e.target.value)} /></td>
            <td><input aria-label={`Minimum commandable de ${nom}`} inputMode="numeric" value={valeur.minimum} onChange={(e) => changer('minimum', e.target.value)} /></td>
            <td><select aria-label={`Statut du stock de ${nom}`} value={valeur.statut} onChange={(e) => changer('statut', e.target.value)}>{STATUTS_STOCK.map((statut) => <option key={statut} value={statut}>{libelleStatutStock(statut)}</option>)}</select></td>
            <td><button type="button" className={styles.enregistrer} disabled={!modifie || occupe === offre.id} onClick={() => void enregistrerLigne(offre)} data-testid={`fiche-enregistrer-${offre.id}`}>{occupe === offre.id ? '…' : 'Enregistrer'}</button></td>
          </tr>
        })}</tbody>
      </table></div> : <p className={styles.aide}>Ce produit n’a pas encore d’offre.</p>}
      {offres[0] ? <button type="button" className={styles.ajouter} onClick={() => setOrigineVariante(offres[0]!)} data-testid="fiche-ajouter-variante">＋ Ajouter une variante</button> : null}
    </section>

    <section className={styles.bloc} aria-labelledby="fiche-vente">
      <header><h3 id="fiche-vente">Vente et livraison</h3></header>
      <div className={styles.champs}>
        <label>Délai de préparation <Badge direct /><select value={delai} onChange={(e) => setDelai(e.target.value)}>{['0', '1', '2', '3'].map((jours) => <option key={jours} value={jours}>{jours === '0' ? 'Le jour même' : `${jours} jour(s)`}</option>)}</select></label>
        <button type="button" className={styles.enregistrer} disabled={occupe === 'delai' || !offres.length} onClick={() => void enregistrerDelai()}>Publier le délai</button>
      </div>
      <p className={styles.aide}>La livraison suit les modes et les villes définis dans les paramètres de la boutique.</p>
      <div className={styles.champs}>
        <label>État <Badge direct={false} /><select value={etat} onChange={(e) => setEtat(e.target.value)}>{Object.entries(ETATS).map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}</select></label>
        <label>Garantie (mois)<input inputMode="numeric" value={garantie} onChange={(e) => setGarantie(e.target.value)} /></label>
        <button type="button" className={styles.enregistrer} disabled={occupe === 'garantie' || !offres.length} onClick={() => void proposerEtatGarantie()}>{direct ? 'Enregistrer' : 'Envoyer à la validation'}</button>
      </div>
      <p className={styles.aide}>Actuellement : {ETATS[offres[0]?.etat ?? base?.etat ?? 'neuf'] ?? 'Neuf'}, garantie {libelleMois(Number(offres[0]?.garantieMois ?? base?.garantieMois ?? 0))}.</p>
    </section>

    <FenetreNouvelleVariante boutiqueId={boutiqueId} origine={origineVariante} onFermer={() => setOrigineVariante(null)} onCreee={onRefresh} />
  </div>
}
