'use client'

import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore, useTransition, type FormEvent } from 'react'
import { ShopIcon } from './ShopIcon'
import styles from './marketplace-catalogue.module.css'

function subscribeMobile(notify: () => void) { const media = window.matchMedia('(max-width: 760px)'); media.addEventListener('change', notify); return () => media.removeEventListener('change', notify) }

export function CatalogueFilterForm({ base, values, categories, brands }: { base: string; values: Record<string, string>; categories: { nom: string; nombre: number }[]; brands: { nom: string; nombre: number }[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia('(max-width: 760px)').matches, () => false)
  const [expanded, setExpanded] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const data = new FormData(form)
    const min = String(data.get('prixMin') ?? '')
    const max = String(data.get('prixMax') ?? '')
    const maxInput = form.elements.namedItem('prixMax') as HTMLInputElement
    maxInput.setCustomValidity(min && max && Number(min) > Number(max) ? 'Le maximum doit être supérieur au minimum.' : '')
    if (!form.reportValidity()) return
    const query = new URLSearchParams()
    data.forEach((value, key) => { if (typeof value === 'string' && value.trim()) query.set(key, value.trim()) })
    startTransition(() => router.push(`${base}?${query}`, { scroll: false }))
  }
  return <details className={styles.filters} open={!mobile || expanded}><summary onClick={event => { event.preventDefault(); if (mobile) setExpanded(value => !value) }}><ShopIcon name="grid"/>Filtres <span>{expanded ? 'Masquer' : 'Afficher'}</span></summary><form action={base} onSubmit={submit} key={JSON.stringify(values)} aria-busy={pending}>
    <input type="hidden" name="tri" value={values.tri}/><input type="hidden" name="vue" value={values.vue}/>
    <label className={styles.searchLabel}>Rechercher dans le catalogue<div className={styles.fieldSearch}><input name="q" defaultValue={values.q} maxLength={100} placeholder="Mot clé, modèle…"/><ShopIcon name="search"/></div></label>
    <fieldset><legend>Catégories</legend><label className={styles.choice}><input type="radio" name="categorie" value="" defaultChecked={!values.categorie}/>Toutes les catégories</label>{categories.map(item => <label className={styles.choice} key={item.nom}><input type="radio" name="categorie" value={item.nom} defaultChecked={values.categorie === item.nom}/>{item.nom}<small>({item.nombre})</small></label>)}</fieldset>
    <fieldset><legend>Prix (FCFA)</legend><div className={styles.prices}><input name="prixMin" type="number" min={0} max={1_000_000_000} step={1} defaultValue={values.prixMin} placeholder="Minimum" aria-label="Prix minimum" onInput={event => { const max = event.currentTarget.form?.elements.namedItem('prixMax') as HTMLInputElement | null; max?.setCustomValidity('') }}/><span>—</span><input name="prixMax" type="number" min={0} max={1_000_000_000} step={1} defaultValue={values.prixMax} placeholder="Maximum" aria-label="Prix maximum" onInput={event => event.currentTarget.setCustomValidity('')}/></div></fieldset>
    <fieldset><legend>Marques</legend><label className={styles.choice}><input type="radio" name="marque" value="" defaultChecked={!values.marque}/>Toutes les marques</label>{brands.slice(0, 5).map(item => <label className={styles.choice} key={item.nom}><input type="radio" name="marque" value={item.nom} defaultChecked={values.marque === item.nom}/>{item.nom}<small>({item.nombre})</small></label>)}{brands.length > 5 ? <details className={styles.moreBrands} open={brands.slice(5).some(item => item.nom === values.marque)}><summary>Autres marques</summary>{brands.slice(5).map(item => <label className={styles.choice} key={item.nom}><input type="radio" name="marque" value={item.nom} defaultChecked={values.marque === item.nom}/>{item.nom}<small>({item.nombre})</small></label>)}</details> : null}</fieldset>
    <div className={styles.filterNote}><ShopIcon name="truck"/><p>Livraison et délais précisés sur chaque offre, selon votre boutique.</p></div>
    <button className={styles.primary} disabled={pending}>{pending ? 'Mise à jour…' : 'Appliquer les filtres'}</button><a className={styles.reset} href={base}>Réinitialiser</a>
  </form></details>
}

export function CatalogueSort({ base, values }: { base: string; values: Record<string, string> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <label className={styles.sort}>Trier par : <select aria-label="Trier les produits" value={values.tri} disabled={pending} onChange={event => { const query = new URLSearchParams(values); query.set('tri', event.target.value); query.delete('page'); startTransition(() => router.push(`${base}?${query}`, { scroll: false })) }}><option value="recent">Plus récents</option><option value="prix_asc">Prix croissant</option><option value="prix_desc">Prix décroissant</option></select></label>
}
