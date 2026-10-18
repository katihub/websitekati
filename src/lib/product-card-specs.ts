export interface ProductCardSpecSource {
  titre?: string | null
  attributsVariante?: Record<string, string> | null
  produit: {
    nom: string
    categorie: string | null
    ficheTechnique?: string | null
    categorieRef?: { nom: string; slug: string; parent: { nom: string; slug: string } | null } | null
  }
}

type SpecKey =
  | 'ram' | 'stockage' | 'processeur' | 'ecran' | 'batterie' | 'resolution'
  | 'smart' | 'puissance' | 'surface' | 'inverter' | 'capacite' | 'portes'
  | 'energie' | 'type' | 'essorage' | 'autonomie' | 'prises' | 'tension'
  | 'technologie' | 'connectivite' | 'interface' | 'taille' | 'matiere'
  | 'coupe' | 'dimensions' | 'places' | 'compatibilite' | 'contenance'
  | 'peau' | 'usage' | 'couleur'

interface SpecValue { key: SpecKey; label: string; value: string }

const nettoyer = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const LABELS: Array<[SpecKey, RegExp]> = [
  ['ram', /^(ram|memoire ram|memoire vive|memoire)$/],
  ['stockage', /^(stockage|disque dur|hdd|ssd|memoire interne)$/],
  ['processeur', /^(processeur|cpu|chipset|puce)$/],
  ['ecran', /^(ecran|taille ecran|diagonale)$/],
  ['batterie', /^(batterie|capacite batterie)$/],
  ['resolution', /^(resolution|definition|megapixels?|mp)$/],
  ['smart', /^(smart tv|systeme exploitation|os)$/],
  ['puissance', /^(puissance|puissance nominale|puissance frigorifique)$/],
  ['surface', /^(surface|surface recommandee|superficie)$/],
  ['inverter', /^(inverter|compresseur)$/],
  ['capacite', /^(capacite|volume|charge)$/],
  ['portes', /^(portes|nombre de portes)$/],
  ['energie', /^(classe energetique|energie|consommation)$/],
  ['type', /^(type|type impression|type de stockage)$/],
  ['essorage', /^(essorage|vitesse essorage)$/],
  ['autonomie', /^(autonomie|duree)$/],
  ['prises', /^(prises|nombre de prises|sorties)$/],
  ['tension', /^(tension|voltage)$/],
  ['technologie', /^(technologie|technologie impression|panneau)$/],
  ['connectivite', /^(connectivite|connexion|reseau|sans fil)$/],
  ['interface', /^(interface|connecteur|port)$/],
  ['taille', /^(taille|pointure)$/],
  ['matiere', /^(matiere|materiau|composition)$/],
  ['coupe', /^(coupe|forme)$/],
  ['dimensions', /^(dimensions|dimension)$/],
  ['places', /^(places|nombre de places)$/],
  ['compatibilite', /^(compatibilite|compatible avec|modele)$/],
  ['contenance', /^(contenance|poids net)$/],
  ['peau', /^(type de peau|peau)$/],
  ['usage', /^(usage|utilisation|fonction)$/],
  ['couleur', /^(couleur|coloris)$/],
]

const RULES: Array<{ match: RegExp; keys: SpecKey[] }> = [
  // Les sous-categories passent avant leur rayon parent (par exemple une
  // imprimante reste une imprimante meme si son parent est Informatique).
  { match: /imprimante|scanner/, keys: ['type', 'technologie', 'connectivite'] },
  { match: /stockage|disque|ssd|hdd/, keys: ['capacite', 'type', 'interface'] },
  { match: /ordinateur|laptop|portable|informatique/, keys: ['ram', 'stockage', 'processeur'] },
  { match: /smartphone|telephone|tablette/, keys: ['ram', 'stockage', 'ecran', 'batterie'] },
  { match: /television|televiseur| tv /, keys: ['ecran', 'resolution', 'smart'] },
  { match: /climatisation|climatiseur|ventilation/, keys: ['puissance', 'surface', 'inverter'] },
  { match: /refrigerateur|congelateur|frigo/, keys: ['capacite', 'portes', 'energie'] },
  { match: /lave linge|machine a laver/, keys: ['capacite', 'type', 'essorage'] },
  { match: /onduleur|batterie/, keys: ['puissance', 'autonomie', 'prises'] },
  { match: /solaire|panneau/, keys: ['puissance', 'tension', 'technologie'] },
  { match: /camera|surveillance/, keys: ['resolution', 'usage', 'connectivite'] },
  { match: /vetement|mode|chaussure/, keys: ['taille', 'matiere', 'coupe'] },
  { match: /meuble|canape|maison deco/, keys: ['dimensions', 'matiere', 'places'] },
  { match: /auto|moto|vehicule/, keys: ['compatibilite', 'dimensions', 'puissance'] },
  { match: /beaute|sante|cosmetique/, keys: ['contenance', 'peau', 'usage'] },
]

function keyFromLabel(label: string): SpecKey | null {
  const normalized = nettoyer(label)
  return LABELS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null
}

function ficheValues(fiche: string | null | undefined): SpecValue[] {
  if (!fiche) return []
  return fiche.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([^:：]+)\s*[:：]\s*(.+?)\s*$/)
    if (!match) return []
    const key = keyFromLabel(match[1])
    return key ? [{ key, label: match[1].trim(), value: match[2].trim() }] : []
  })
}

function attributeValues(attributes: Record<string, string> | null | undefined): SpecValue[] {
  return Object.entries(attributes ?? {}).flatMap(([label, value]) => {
    const key = keyFromLabel(label)
    return key && value.trim() ? [{ key, label, value: value.trim() }] : []
  })
}

function displayValue(spec: SpecValue): string {
  const value = spec.value.replace(/\s+/g, ' ').trim()
  const normalized = nettoyer(value)
  if (spec.key === 'ram' && !/\bram\b/.test(normalized)) return `${value} RAM`
  if (spec.key === 'stockage' && /\b(ssd|hdd|nvme)\b/.test(nettoyer(spec.label)) && !/\b(ssd|hdd|nvme)\b/.test(normalized)) return `${value} ${spec.label.toUpperCase()}`
  return value
}

function titleFallback(title: string, category: string): SpecValue[] {
  if (!/ordinateur|laptop|portable|informatique|smartphone|telephone|tablette/.test(category)) return []
  const result: SpecValue[] = []
  const ram = title.match(/(?:\b(\d{1,3})\s*(go|gb)\s*(?:de\s*)?(?:ram|ddr[345]?))|(?:(?:ram|ddr[345]?)\s*(\d{1,3})\s*(go|gb))/i)
  if (ram) result.push({ key: 'ram', label: 'RAM', value: `${ram[1] ?? ram[3]} ${/gb/i.test(ram[2] ?? ram[4]) ? 'Go' : ram[2] ?? ram[4]} RAM` })
  const storage = title.match(/\b(\d+(?:[.,]\d+)?)\s*(go|gb|to|tb)\s*(ssd|hdd|nvme)\b/i)
  if (storage) result.push({ key: 'stockage', label: 'Stockage', value: `${storage[1]} ${/g[bo]/i.test(storage[2]) ? 'Go' : 'To'} ${storage[3].toUpperCase()}` })
  const cpu = title.match(/\b((?:intel\s+)?core\s+(?:ultra\s+[579](?:\s+[a-z0-9]+)?|i[3579](?:[-\s][a-z0-9]+)?)|(?:amd\s+)?ryzen\s+[3579](?:\s+[a-z0-9]+)?|apple\s+m[1-4](?:\s+(?:pro|max|ultra))?)\b/i)
  if (cpu) result.push({ key: 'processeur', label: 'Processeur', value: cpu[1].replace(/\b(?:intel|amd|apple)\s+/i, '') })
  return result
}

/** Deux ou trois informations immédiatement comparables, sans inventer de donnée. */
export function productCardSpecs(source: ProductCardSpecSource, limit = 3): string[] {
  const category = nettoyer([
    source.produit.categorie,
    source.produit.categorieRef?.nom,
    source.produit.categorieRef?.slug,
    source.produit.categorieRef?.parent?.nom,
    source.produit.categorieRef?.parent?.slug,
  ].filter(Boolean).join(' '))
  const values = [...attributeValues(source.attributsVariante), ...ficheValues(source.produit.ficheTechnique)]
  const priorities = RULES.find((rule) => rule.match.test(` ${category} `))?.keys
  const ordered = priorities ? priorities.flatMap((key) => values.find((item) => item.key === key) ?? []) : values
  const candidates = [...ordered, ...titleFallback(`${source.titre ?? ''} ${source.produit.nom}`, category)]
  const seen = new Set<string>()
  return candidates.flatMap((spec) => {
    const displayed = displayValue(spec)
    const key = nettoyer(displayed)
    if (!key || seen.has(key)) return []
    seen.add(key)
    return displayed.length > 24 ? [`${displayed.slice(0, 23).trimEnd()}…`] : [displayed]
  }).slice(0, limit)
}
