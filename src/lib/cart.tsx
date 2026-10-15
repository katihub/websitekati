'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

/**
 * The basket.
 *
 * WHY A LINE CARRIES ITS OWN SNAPSHOT. The E-shop version this is modelled on
 * stores slugs and joins them against the catalogue at render. That is not
 * available here: the catalogue lives in the backend and is read on the server
 * (`@/lib/catalogue-en-direct` is `server-only`), so a basket that joined its
 * lines at render would wait on the network before it could draw a single row.
 * A line therefore carries the four facts a basket row shows, captured at the
 * moment of adding, and `lib/verification.ts` asks the server about them on the
 * quote and checkout pages, before a stale price can leave the shop.
 *
 * The cost is a stale name or price if the catalogue changes under a basket left
 * open for a week, and that is the right trade for a counter that reprices on
 * the proforma anyway: the basket here is a list to be quoted, not a checkout.
 * The slug is the key, so nothing is lost by re-reading it server-side later.
 *
 * WHY `useSyncExternalStore` AND NOT AN EFFECT. Three things fall out of it. The
 * value is available on the first client render instead of the second, so the
 * count in the masthead never flashes from empty to full. Hydration is safe,
 * because the server snapshot is explicitly the empty basket. And subscribing to
 * the `storage` event keeps two tabs in step, which the effect version silently
 * did not.
 */

export interface CartLine {
  readonly slug: string
  readonly name: string
  /** Whole XAF, as captured. */
  readonly price: number
  readonly image: string | null
  readonly qty: number
  readonly offerId?: string
  readonly boutiqueId?: string
  readonly boutiqueNom?: string
  readonly modesLivraison?: Array<'vendeur' | 'katihub'>
  readonly villesLivraison?: string[]
  /** MOQ de l'offre : la ligne ne descend pas en dessous. */
  readonly quantiteMinimale?: number
}

export const cartLineKey = (line: Pick<CartLine, 'slug' | 'offerId'>) => line.offerId ?? line.slug

const STORAGE_KEY = 'nowtech.panier.v1'
const EMPTY = '[]'
const MAX_QTY = 99

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

let fallback = EMPTY
const listeners = new Set<() => void>()

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY
  } catch {
    // Private mode, disabled storage, or a full quota. The basket still works
    // for this session; it just will not survive a reload.
    return fallback
  }
}

function writeRaw(lines: CartLine[]): void {
  fallback = JSON.stringify(lines)
  try {
    window.localStorage.setItem(STORAGE_KEY, fallback)
  } catch {
    // Ignored for the same reason as above.
  }
  for (const notify of listeners) notify()
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

function parse(raw: string): CartLine[] {
  try {
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter(
      (line): line is CartLine =>
        typeof line?.slug === 'string' &&
        typeof line?.name === 'string' &&
        typeof line?.price === 'number' &&
        typeof line?.qty === 'number',
    )
  } catch {
    return []
  }
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

export interface CartState {
  readonly lines: readonly CartLine[]
  readonly count: number
  readonly subtotal: number
  readonly isOpen: boolean
  /** Slug added most recently, so the drawer can mark it. */
  readonly lastAdded: string | null
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
  /** Retire seulement les quantités commandées, sans perdre un ajout dans un autre onglet. */
  consume: (ordered: readonly CartLine[]) => void
  /** Vide le panier : une commande passee ne doit pas pouvoir repartir par megarde. */
  vider: () => void
  open: () => void
  close: () => void
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => EMPTY)
  const lines = useMemo(() => parse(raw), [raw])

  const [isOpen, setOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const add = useCallback((line: Omit<CartLine, 'qty'>, qty = 1) => {
    const current = parse(readRaw())
    const key = cartLineKey(line)
    const existing = current.find((l) => cartLineKey(l) === key)
    const minimum = Math.max(1, line.quantiteMinimale ?? 1)
    const maximum = Math.max(MAX_QTY, minimum)
    writeRaw(
      existing
        ? current.map((l) =>
            cartLineKey(l) === key ? { ...l, ...line, qty: Math.min(Math.max(l.qty + qty, minimum), maximum) } : l,
          )
        : [...current, { ...line, qty: Math.min(Math.max(qty, minimum), maximum) }],
    )
    setLastAdded(key)
    setOpen(true)
  }, [])

  const setQty = useCallback((slug: string, qty: number) => {
    const current = parse(readRaw())
    writeRaw(
      qty <= 0
        ? current.filter((l) => cartLineKey(l) !== slug)
        : current.map((l) => {
            if (cartLineKey(l) !== slug) return l
            // Le MOQ est un plancher : on retire la ligne, on ne la passe pas en dessous.
            const minimum = Math.max(1, l.quantiteMinimale ?? 1)
            return { ...l, qty: Math.min(Math.max(qty, minimum), Math.max(MAX_QTY, minimum)) }
          }),
    )
  }, [])

  const remove = useCallback((slug: string) => {
    writeRaw(parse(readRaw()).filter((l) => cartLineKey(l) !== slug))
  }, [])

  const consume = useCallback((ordered: readonly CartLine[]) => {
    const quantities = new Map(ordered.map(line => [cartLineKey(line), line.qty]))
    writeRaw(parse(readRaw()).flatMap(line => {
      const qty = line.qty - (quantities.get(cartLineKey(line)) ?? 0)
      return qty > 0 ? [{ ...line, qty }] : []
    }))
  }, [])

  const vider = useCallback(() => writeRaw([]), [])

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((total, line) => total + line.qty, 0),
      subtotal: lines.reduce((total, line) => total + line.price * line.qty, 0),
      isOpen,
      lastAdded,
      add,
      setQty,
      remove,
      consume,
      vider,
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [lines, isOpen, lastAdded, add, setQty, remove, consume, vider],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartState {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart doit être appelé dans un CartProvider')
  return context
}
