import type { DelaiLivraison } from '@/types/catalogue'

/**
 * LE DÉLAI DE LIVRAISON, DIT COMME ON LE DIRAIT AU COMPTOIR.
 *
 * Le panel enregistre des bornes brutes dans une unité : « 30 à 4 320
 * minutes ». Personne ne lit ça. Chaque borne est donc ramenée à l'unité la
 * plus lisible pour sa taille — moins d'une heure en minutes, moins d'un jour
 * en heures, au-delà en jours — et la fourchette ne répète l'unité qu'une fois
 * quand les deux bornes la partagent : « 2 à 4 jours », mais « 30 min à
 * 3 jours ».
 *
 * Les unités calendaires (jours ouvrés, semaines, mois) sont gardées telles
 * quelles : les convertir changerait ce que la direction a promis.
 */

type Borne = { readonly valeur: number; readonly unite: string; readonly pluriel: string }

const MINUTES_PAR_HEURE = 60
const MINUTES_PAR_JOUR = 24 * 60

function borneEnMinutes(minutes: number): Borne {
  if (minutes < MINUTES_PAR_HEURE) return { valeur: minutes, unite: 'min', pluriel: 'min' }
  if (minutes < MINUTES_PAR_JOUR) {
    const heures = Math.round(minutes / MINUTES_PAR_HEURE)
    return { valeur: heures, unite: 'h', pluriel: 'h' }
  }
  const jours = Math.round(minutes / MINUTES_PAR_JOUR)
  return { valeur: jours, unite: 'jour', pluriel: 'jours' }
}

function borne(valeur: number, unite: DelaiLivraison['unite']): Borne {
  switch (unite) {
    case 'minutes':
      return borneEnMinutes(valeur)
    case 'heures':
      return borneEnMinutes(valeur * MINUTES_PAR_HEURE)
    case 'jours':
      return { valeur, unite: 'jour', pluriel: 'jours' }
    case 'jours_ouvres':
      return { valeur, unite: 'jour ouvré', pluriel: 'jours ouvrés' }
    case 'semaines':
      return { valeur, unite: 'semaine', pluriel: 'semaines' }
    case 'mois':
      return { valeur, unite: 'mois', pluriel: 'mois' }
  }
}

function mot(b: Borne): string {
  return b.valeur > 1 ? b.pluriel : b.unite
}

/**
 * « 30 min à 3 jours », « 2 à 4 jours », « 3 jours ». `null` quand le délai
 * est absent ou incohérent : mieux vaut ne rien promettre qu'un délai faux.
 */
export function formatDelai(delai: DelaiLivraison | null | undefined): string | null {
  if (!delai || !Number.isFinite(delai.min) || delai.min < 1) return null

  const bas = borne(delai.min, delai.unite)
  if (delai.max === null || delai.max === undefined || delai.max <= delai.min) {
    return `${bas.valeur} ${mot(bas)}`
  }

  const haut = borne(delai.max, delai.unite)
  /* Deux bornes qui retombent sur la même valeur une fois arrondies — 90 et
     100 minutes donnent toutes deux « 2 h » — ne font pas une fourchette. */
  if (bas.unite === haut.unite && bas.valeur === haut.valeur) return `${bas.valeur} ${mot(bas)}`
  if (bas.unite === haut.unite) return `${bas.valeur} à ${haut.valeur} ${mot(haut)}`
  return `${bas.valeur} ${mot(bas)} à ${haut.valeur} ${mot(haut)}`
}
