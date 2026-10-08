'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'

import { IconArrowRight, IconPhone, IconSearch } from '@/components/brand/Icons'
import type { SuggestReply } from '@/app/api/suggest/route'
import { whatsappHref } from '@/lib/comptoirs'
import { formatAmount, formatPrice } from '@/lib/format'
import { ScopeSelect, type Scope } from './ScopeSelect'

/**
 * The search field.
 *
 * Search is a primary navigation mode here, not a convenience: 4 254 products
 * across 268 categories is more than any menu can expose, and a buyer who
 * already knows they want a "switch 24 ports PoE" should never have to walk the
 * tree. That is why it sits in the masthead at full width rather than behind an
 * icon.
 *
 * The department selector in front of the field is not decoration either. Half
 * the vocabulary in this catalog is ambiguous across departments: "onduleur"
 * returns power and networking, "caméra" returns surveillance and photography,
 * "switch" returns commutation and light switches. Naming the department costs
 * one click and removes a whole class of dead result page.
 *
 * The placeholder is written in the vocabulary of the catalog, so it doubles as
 * an example of what the field understands.
 *
 * The field is filled with --space, not --surface. --surface is pinned to white
 * in both themes because every packshot is shot on white; a form painted with it
 * kept a white background in the dark theme while its text followed the theme,
 * and the text a customer had just typed measured 1.2:1 against it.
 *
 * WHAT THE PANEL UNDERNEATH IS FOR, AND WHY IT HOLDS THREE KINDS OF THING.
 * A half-typed question has three plausible answers in this shop and only one
 * of them is a product. "caméra" is 440 references and no single one of them is
 * the answer: the family is. "hp" is 544 references across six departments: the
 * brand is. "onduleur 1500 va" is a reference, and that one is a product. So the
 * panel offers families, brands and products, in that order, each group named,
 * because a list that mixes a destination with a reference and draws them the
 * same way makes the reader click one to find out which they got.
 *
 * WHY THE REQUEST IS DEBOUNCED AND CANCELLED. Without the debounce the field
 * asks the server once per keystroke, which on "onduleur" is eight round trips
 * for one question. Without the cancel, the answer to "ond" can land after the
 * answer to "onduleur" on a slow connection and overwrite it, and the reader
 * watches the list go backwards while they type. The abort covers the common
 * case and the query echo in the reply covers the race the abort loses.
 *
 * WHY `useId` AND NOT A CONSTANT ID. The masthead renders this component twice:
 * once inside the wordmark row for pointers, once on its own row below for
 * phones (see Header.tsx). Two elements carrying the same id would be a broken
 * document, and worse, `aria-activedescendant` resolves by id from the whole
 * document: the desktop field would have pointed a screen reader at the hidden
 * mobile field's rows.
 *
 * WHY THE DEPARTMENT TRAVELS WITH THE QUESTION. The selector in front of the
 * field changes what the last row of the panel promises, so it has to change
 * what the rows above it show, or the panel is offering references that are not
 * on the page it is pointing at. The department therefore rides in the request
 * and comes back in the reply, and a reply whose department is not the one now
 * on screen is dropped exactly like a reply whose query is stale. Changing the
 * department is a new question, not a filter over an old answer.
 *
 * WHY THE WAY OUT IS PINNED TO THE FOOT. "Voir tous les résultats" is the row
 * that has to be reachable when none of the others is the answer, and it was
 * the last child of a list that scrolls: on a phone, with the keyboard up and
 * five references drawn at 44 pixels each, it sat below the fold of the panel
 * every single time. A row that is always present and never visible is not
 * present. The panel is now two regions — a list that scrolls and a foot that
 * does not — so the ways out are on screen whatever the list is doing. The
 * listbox spans both, which is why the role sits on their shared parent rather
 * than on a `ul`: the keyboard still walks one list, because there is one list.
 */
type Status = 'idle' | 'loading' | 'ready' | 'error'

/**
 * A row of the panel, flattened.
 *
 * The keyboard walks ONE list, so the list the keyboard walks is the list that
 * exists. Grouping is a rendering concern applied on the way out, not a nested
 * structure the arrow keys would have to descend into.
 */
type Group = 'families' | 'brands' | 'products' | 'actions'

interface Item {
  readonly key: string
  readonly group: Group
  readonly href: string
  /** Opens WhatsApp, so it leaves the site and cannot go through the router. */
  readonly external?: boolean
  /** What a screen reader hears, which has to carry the group the eye reads. */
  readonly label: string
  readonly name: string
  readonly count?: number
  readonly price?: number
  readonly image?: string | null
  readonly categoryName?: string
}

const GROUP_LABEL: Record<Group, string | null> = {
  families: 'Familles',
  brands: 'Marques',
  products: 'Références',
  actions: null,
}

export function SearchField({
  scopes,
  initialQuery = '',
  initialScope = '',
  compact = false,
  whatsapp,
}: {
  scopes: readonly Scope[]
  /** The panel's WhatsApp line, read by the masthead. `null` hides the counter row. */
  whatsapp: string | null
  initialQuery?: string
  initialScope?: string
  /**
   * The phone copy of the field, which is the one the masthead puts on a row of
   * its own. It differs in one thing: the placeholder. The full sentence is 51
   * characters and a 360px screen leaves the input 232 of them, so it was cut
   * after "caméra 4 MP," with no ellipsis and no third example. The short form
   * keeps the three vocabularies and fits.
   */
  compact?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  /**
   * The department, and it is a slug this field can actually name.
   *
   * `initialScope` is meant to be handed down from `?rayon=` so a reload keeps
   * the department the reader chose, and `?rayon=` is a piece of URL: it
   * outlives taxonomies and it is typed by hand. A slug the catalogue no longer
   * knows would sit in this state forever, because `/api/suggest` resolves the
   * department server-side and echoes `scope: null` for a slug it cannot place,
   * and the guard below drops every reply whose department is not the one on
   * screen — the panel would spin on "Recherche dans le catalogue…" for as long
   * as the reader typed. So an unknown slug is not carried at all: the field
   * falls back to the whole catalogue, which is what the results page does with
   * the same slug, and which it says out loud.
   */
  const [scope, setScope] = useState(
    scopes.some((entry) => entry.slug === initialScope) ? initialScope : '',
  )

  const [open, setOpen] = useState(false)
  /**
   * The last answer the server gave, and the question it answered.
   *
   * ONE PIECE OF STATE, NOT THREE. Status is not stored, it is read off the
   * pair: an answer whose query is the one on screen is `ready` (or `error`
   * when the reply is null), anything else with two or more letters typed is
   * still `loading`. Keeping a separate `status` flag meant setting it from
   * inside the effect on every keystroke, which is a cascading render per
   * letter and, worse, a second source of truth that can disagree with the
   * list actually being drawn.
   */
  const [answer, setAnswer] = useState<{
    query: string
    scope: string
    reply: SuggestReply | null
  } | null>(null)
  /** Which row the keyboard is on. `null` means "on none", which is where a
      combobox starts: the reader is editing text, not choosing yet. */
  const [cursor, setCursor] = useState<number | null>(null)

  const container = useRef<HTMLFormElement>(null)
  const uid = useId()
  const listId = `${uid}-list`
  const optionId = (index: number) => `${uid}-o-${index}`

  const asked = query.trim()
  const scopeName = scopes.find((entry) => entry.slug === scope)?.label ?? null

  /* The search URL, built once and used by the form, by the "all results" row
     and by the empty state, so the three can never disagree about the scope. */
  const searchHref = useMemo(() => {
    const params = new URLSearchParams({ q: asked })
    if (scope) params.set('rayon', scope)
    return `/recherche?${params}`
  }, [asked, scope])

  /**
   * Ask the server, late and once.
   *
   * The cleanup does both halves of the job: it drops a debounce that has not
   * fired yet, and it aborts a request that has. Anything already in flight when
   * the next letter arrives is therefore dead before its reply can be applied.
   */
  useEffect(() => {
    if (asked.length < 2) return

    const controller = new AbortController()

    const params = new URLSearchParams({ q: asked })
    if (scope) params.set('rayon', scope)

    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?${params}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status))
          return response.json() as Promise<SuggestReply>
        })
        .then((data) => {
          // The abort lost the race: this is an answer to something the reader
          // has already typed past, or to a department they have left. Drop it
          // rather than show it.
          if (data.query !== asked || (data.scope ?? '') !== scope) return
          setAnswer({ query: asked, scope, reply: data })
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return
          setAnswer({ query: asked, scope, reply: null })
        })
    }, 200)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [asked, scope])

  const settled = answer && answer.query === asked && answer.scope === scope ? answer : null

  const status: Status =
    asked.length < 2 ? 'idle' : settled ? (settled.reply ? 'ready' : 'error') : 'loading'

  /**
   * What the panel draws while the next answer is on its way.
   *
   * The previous list is kept ONLY while the reader is still typing forward on
   * the same word, which is what `startsWith` tests. Suggestions for "ondul"
   * are a sane thing to leave on screen for 200 milliseconds while "onduleu" is
   * being asked for; suggestions for "hp" left standing after the field was
   * cleared and "cable" typed are a lie. Emptying the panel on every keystroke
   * instead would make it blink four times a second on a fast typist.
   *
   * A CHANGE OF DEPARTMENT KEEPS NOTHING. It is not a longer question, it is a
   * different one, and the rows answering the old one are precisely the rows
   * that do not belong under the new promise.
   */
  const reply =
    settled?.reply ??
    (answer?.reply && answer.scope === scope && asked.startsWith(answer.query)
      ? answer.reply
      : null)

  /* A pointer outside closes, exactly as ScopeSelect does, so the two controls
     inside the same field behave the same way. */
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  /**
   * How tall the panel may be while a virtual keyboard is up, in pixels, or 0
   * when there is no keyboard.
   *
   * THIS IS THE ONE BUG A MEDIA QUERY CANNOT REACH. The panel is capped at
   * `min(60dvh, 26rem)`, and `dvh` is a unit of the LAYOUT viewport: Android
   * Chrome does not shrink that when the keyboard opens, it shrinks the VISUAL
   * viewport and leaves the page where it is. Measured at 360 x 640 with the
   * keyboard up, the visible band ends around y=370 while the panel ran from
   * 116 to 498, so the last three references and both ways out, including the
   * "Tous les résultats" row this file goes to the trouble of pinning to the
   * foot, were drawn underneath the keys. A row that is always present and
   * never visible is not present, which is the sentence at the head of this
   * file, arriving from the other direction.
   *
   * So the height is measured against `visualViewport` instead, and only when
   * something is actually eating the screen: under 80 pixels of inset there is
   * no keyboard, the state stays 0, no inline style is written, and the class
   * cap is what applies. A pointer machine therefore never takes this path and
   * the desktop panel measures the same 829 x 542 it always did.
   */
  const [room, setRoom] = useState(0)

  useEffect(() => {
    const view = window.visualViewport
    if (!open || !view) return

    const read = () => {
      const form = container.current
      if (!form) return
      const eaten = window.innerHeight - view.height - view.offsetTop
      if (eaten < 80) {
        setRoom(0)
        return
      }
      // The panel hangs 8px under the field; the visible band ends at
      // `offsetTop + height` in the same coordinates the rectangle is read in.
      const top = form.getBoundingClientRect().bottom + 8
      setRoom(Math.max(160, Math.round(view.offsetTop + view.height - top - 8)))
    }

    read()
    view.addEventListener('resize', read)
    view.addEventListener('scroll', read)
    return () => {
      view.removeEventListener('resize', read)
      view.removeEventListener('scroll', read)
      setRoom(0)
    }
  }, [open])

  /** The catalogue answered, and it had nothing under any of the three heads. */
  const nothing =
    status === 'ready' &&
    (reply?.produits.length ?? 0) === 0 &&
    (reply?.familles.length ?? 0) === 0 &&
    (reply?.marques.length ?? 0) === 0

  const items = useMemo<Item[]>(() => {
    if (asked.length < 2) return []

    const out: Item[] = []

    for (const family of reply?.familles ?? []) {
      out.push({
        key: `f-${family.slug}`,
        group: 'families',
        href: `/categorie/${family.slug}`,
        name: family.nom,
        count: family.compte,
        label: `Famille ${family.nom}, ${formatAmount(family.compte)} références`,
      })
    }

    for (const brand of reply?.marques ?? []) {
      out.push({
        key: `b-${brand.slug}`,
        group: 'brands',
        href: `/marque/${brand.slug}`,
        name: brand.nom,
        count: brand.compte,
        label: `Marque ${brand.nom}, ${formatAmount(brand.compte)} références`,
      })
    }

    for (const hit of reply?.produits ?? []) {
      out.push({
        key: `p-${hit.slug}`,
        group: 'products',
        href: `/produit/${hit.slug}`,
        name: hit.nom,
        price: hit.prix,
        image: hit.image,
        categoryName: hit.categorieNom ?? undefined,
        label: `${hit.nom}, ${formatPrice(hit.prix)}`,
      })
    }

    // Always last, and always present: the reader who wanted none of the ten
    // rows above still has somewhere to go, and it is the same page the Enter
    // key would have reached.
    out.push({
      key: 'all',
      group: 'actions',
      href: searchHref,
      name: scopeName
        ? `Tous les résultats dans ${scopeName}`
        : 'Tous les résultats dans le catalogue',
      label: scopeName
        ? `Voir tous les résultats pour ${asked} dans ${scopeName}`
        : `Voir tous les résultats pour ${asked}`,
    })

    // The counter only appears when the catalogue had nothing, because the shop
    // holds stock the export does not and a dead search is the one moment where
    // saying so is useful rather than pushy.
    if (nothing && whatsapp) {
      out.push({
        key: 'counter',
        group: 'actions',
        // The same sentence `/recherche` sends from its dead end, written out
        // twice on purpose: that page is a server component, this one is a
        // client component, and a shared module for one template string would
        // be a third file to keep in step with two. A bare `?text=onduleur`
        // would open WhatsApp with one word in the box and leave the customer
        // to write the message around it, which on a phone is where most of
        // them stop.
        href: whatsappHref(
          whatsapp,
          `Bonjour, je cherche « ${asked} ». Je ne l’ai pas trouvé sur nowtechcenter.com, est-ce que vous l’avez ?`,
        ),
        external: true,
        name: 'Demander au comptoir sur WhatsApp',
        label: `Demander ${asked} au comptoir sur WhatsApp`,
      })
    }

    return out
  }, [asked, reply, nothing, searchHref, scopeName, whatsapp])

  /**
   * Where the catalogue's answers stop and the ways out begin.
   *
   * The actions are pushed last and only last, so one index cuts the list in
   * two without renumbering it: a row's index is still its index in `items`,
   * which is what the arrow keys count and what `optionId` names.
   */
  const split = items.findIndex((item) => item.group === 'actions')
  const suggestions = split === -1 ? items : items.slice(0, split)
  const ways = split === -1 ? [] : items.slice(split)

  const active = cursor !== null && cursor < items.length ? cursor : null

  /* Keep the active row in the panel. The list scrolls on a phone, and a cursor
     the reader cannot see is a cursor that is not there. */
  useEffect(() => {
    if (active === null) return
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
    // `optionId` is derived from a stable `useId`, so it never invalidates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const close = () => {
    setOpen(false)
    setCursor(null)
  }

  const go = (item: Item) => {
    close()
    if (item.external) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
      return
    }
    router.push(item.href)
  }

  const move = (to: number) => {
    if (items.length === 0) return
    setCursor(((to % items.length) + items.length) % items.length)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        if (items.length === 0) return
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setCursor(0)
          return
        }
        move(active === null ? 0 : active + 1)
        break
      case 'ArrowUp':
        if (items.length === 0) return
        event.preventDefault()
        if (!open) {
          setOpen(true)
          setCursor(items.length - 1)
          return
        }
        move(active === null ? items.length - 1 : active - 1)
        break
      case 'Enter':
        // With a row under the cursor, Enter opens that row. With none, Enter
        // means what it has always meant in a search field, and the form's own
        // submit takes it to the results page.
        if (open && active !== null) {
          event.preventDefault()
          go(items[active])
        }
        break
      case 'Escape':
        // Closes, and leaves the text alone. A field that empties itself on
        // Escape throws away the sentence the reader was in the middle of.
        if (open) {
          event.preventDefault()
          close()
        }
        break
      case 'Tab':
        close()
        break
    }
  }

  /* Counted over the catalogue's own answers: the "all results" row and the
     WhatsApp row are ways out, not suggestions, and announcing "2 suggestions"
     for a query that matched nothing would be the field lying to the one reader
     who cannot see the panel. */
  const found =
    (reply?.produits.length ?? 0) + (reply?.familles.length ?? 0) + (reply?.marques.length ?? 0)

  const announcement =
    !open || asked.length < 2
      ? ''
      : status === 'error'
        ? 'Les suggestions n’ont pas répondu.'
        : status === 'ready'
          ? found === 0
            ? 'Aucune suggestion. Entrée lance la recherche complète.'
            : `${found} suggestions, flèches pour parcourir.`
          : ''

  return (
    <form
      ref={container}
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        if (!asked) return
        close()
        router.push(searchHref)
      }}
      // 56px on a phone, 48 from md up where a pointer is doing the aiming.
      //
      // IT WAS 52 AND THAT WAS FOUR PIXELS SHORT, MEASURED. The submit sits
      // inside the frame with a 4px margin, so a 52px field minus two 1px
      // borders minus 8px of margin left a button 42 tall: the one control on
      // the phone masthead that commits the search failed the 44 pixel target,
      // by two pixels, on the axis the frame decides. At 56 it is 46. The row
      // costs nothing: the masthead gave back the four pixels from its own
      // bottom padding, so the phone header is 168 before and after.
      // `relative` because the suggestion panel hangs off it.
      /* 48 PIXELS EVERYWHERE, WHICH IS WHAT THE DESKTOP ALWAYS WAS.
           The phone briefly had 56, taken to make room for a 16px input after
           iOS was found zooming the page on focus below that size. The zoom fix
           is the font size, not the box: 16px type sits in a 48px field with 16
           pixels of leading to spare, and the eight pixels bought nothing except
           a search bar that read as the biggest object on the screen. */
        className="field relative flex h-11 w-full items-stretch rounded-control border border-rule-2 bg-space transition-[border-color,box-shadow] duration-[var(--t-fast)] md:h-12"
    >
      <ScopeSelect
        scopes={scopes}
        value={scope}
        onChange={(slug) => {
          setScope(slug)
          // The rows are about to be replaced by the answer for another
          // department, so the cursor on row three has nothing left to point at.
          setCursor(null)
          if (asked.length > 0) setOpen(true)
        }}
      />

      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setCursor(null)
          setOpen(event.target.value.trim().length > 0)
        }}
        onFocus={() => {
          if (asked.length > 0) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        placeholder={
          compact ? 'Onduleur, caméra, switch…' : 'Onduleur 1500 VA, caméra 4 MP, switch 24 ports PoE…'
        }
        aria-label="Rechercher dans le catalogue"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active !== null ? optionId(active) : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        /* 16px on a phone, 13 from md up.
           SAFARI ZOOMS THE WHOLE PAGE WHEN A FIELD UNDER 16px TAKES FOCUS, and
           it does not zoom back out. The reader taps the search box, the layout
           jumps to about 1.23x, the masthead runs off both edges, and the way
           back is a pinch. Nothing else on the page can cause that, because
           nothing else on the page is a text field. Small text is the house
           size for a pointer and stays that from `md`. */
        /* 16px, AND IT IS NOT A TYPOGRAPHIC CHOICE. Safari on iOS zooms
           the whole page when a field under 16px takes focus, and the reader has
           to pinch back out of it. This is the one piece of text on the site
           whose size is decided by a browser rather than by the type scale. The
           placeholder is kept short instead, so the line weighs less without
           the field lying about its size. From md the scale takes over again. */
        className="min-w-0 flex-1 bg-transparent px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 md:text-small"
      />

      <button
        type="submit"
        /* `m-0.5` on a phone, `m-1` from md. The submit is inset inside the
             field, so its height is the field's minus twice the margin: at 48
             with m-1 that is 40, under the 44 a thumb is owed. Two pixels of
             inset give exactly 44 and the desktop keeps the four it had. */
        /* Flush to the field's edge on a phone, inset from `md`. Inset
             inside a 44-pixel field the submit is 40, under the floor a thumb
             is owed; flush it takes the whole height and the field's own
             corner. From md the field is 48 again and the 4-pixel inset the
             desktop always had comes back. */
        className="press m-0 flex shrink-0 items-center gap-2 rounded-r-control rounded-l-none bg-secondary px-4 text-small font-semibold text-on-surface transition-colors duration-[var(--t-fast)] hover:bg-secondary md:m-1 md:rounded-[6px] md:px-5"
      >
        <IconSearch className="text-[1.125rem]" />
        <span className="hidden sm:inline">Chercher</span>
        <span className="sr-only sm:hidden">Chercher</span>
      </button>

      {/* Spoken, never drawn. The panel is a visual event and a screen reader
          gets no notification from a list appearing under a field it is not
          focused inside. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      {open && asked.length > 0 ? (
        <div
          /**
           * `z-[var(--z-header)]` for the same reason ScopeSelect's panel has
           * it: the masthead is one stacking context and the green department
           * band is a later sibling, so a panel with no z-index of its own is
           * painted underneath it and the last three rows disappear behind a
           * green stripe.
           *
           * The height is capped in `dvh` and the LIST inside it scrolls, not
           * the panel. On a 390px phone the virtual keyboard takes roughly half
           * the screen the instant this thing can appear at all, and a panel
           * sized to the layout viewport puts its last rows under the keyboard
           * where nobody can reach them.
           *
           * A column flex box, and the overflow is one step in: the foot is
           * `shrink-0` and the list is the only part that gives way, so the two
           * ways out hold their place at the bottom edge of the panel whether
           * the list above them is one row or thirty.
           *
           * `room` overrides the cap while a keyboard is up, and is 0 at every
           * other moment. See the state's own note.
           */
          style={room > 0 ? { maxHeight: `${room}px` } : undefined}
          className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-[var(--z-header)] flex max-h-[min(60dvh,26rem)] flex-col overscroll-contain rounded-well border border-rule bg-paper shadow-[var(--shadow-panel)] md:max-h-[min(70dvh,34rem)]"
        >
          {asked.length < 2 ? (
            <p className="shrink-0 px-4 py-3 text-small text-ink-3">
              Encore une lettre : la recherche démarre à deux caractères.
            </p>
          ) : status === 'error' ? (
            // IT USED TO PROMISE THAT ENTER STILL WORKED, AND IT DOES NOT. The
            // suggestions and the results page read the same backend: when this
            // fails, the likeliest cause is that backend being down, and Enter
            // then lands on the error page. The sentence says only what is known.
            <p className="shrink-0 px-4 py-3 text-small text-ink-2">
              Les suggestions n’ont pas répondu : le catalogue est peut-être momentanément
              injoignable. Réessayez dans un instant.
            </p>
          ) : status === 'loading' ? (
            <p className="shrink-0 px-4 py-3 text-small text-ink-3">
              Recherche dans le catalogue{scopeName ? ` (${scopeName})` : ''}…
            </p>
          ) : nothing ? (
            // Above the two rows, not below them: the reason comes before the
            // ways out, or the reader clicks one without knowing what failed.
            <p className="shrink-0 px-4 pt-3 pb-1 text-small leading-[1.5] text-ink-2">
              {scopeName
                ? `Rien de tel dans ${scopeName} : ni référence, ni famille, ni marque.`
                : 'Aucune référence, aucune famille et aucune marque ne portent tous ces mots.'}
            </p>
          ) : null}

          {/**
           * The listbox is this box, not a `ul` inside it, because the options
           * live in two children of it: the part that scrolls and the part that
           * does not. `aria-activedescendant` on the input resolves an id
           * anywhere inside the listbox, so one list is still one list.
           */}
          <div
            id={listId}
            role="listbox"
            aria-label={
              scopeName ? `Suggestions pour ${asked} dans ${scopeName}` : `Suggestions pour ${asked}`
            }
            className="flex min-h-0 flex-col"
          >
            {suggestions.length > 0 ? (
              <div role="presentation" className="min-h-0 overflow-y-auto overscroll-contain py-2">
                {suggestions.map((item, index) => {
                  const heading =
                    item.group !== suggestions[index - 1]?.group ? GROUP_LABEL[item.group] : null

                  return (
                    <Fragment key={item.key}>
                      {heading ? (
                        <div
                          role="presentation"
                          aria-hidden
                          className="t-label px-4 pt-3 pb-1.5 first:pt-1 text-ink-3"
                        >
                          {heading}
                        </div>
                      ) : null}

                      <Row
                        item={item}
                        id={optionId(index)}
                        active={index === active}
                        onEnter={() => setCursor(index)}
                        onPick={() => close()}
                      />
                    </Fragment>
                  )
                })}
              </div>
            ) : null}

            {/* The foot. Never scrolls, never empty: the first row of it is the
                page the Enter key would have reached. */}
            <div
              role="presentation"
              className={`shrink-0 py-2 ${suggestions.length > 0 ? 'border-t border-rule' : ''}`}
            >
              {ways.map((item, index) => (
                <Row
                  key={item.key}
                  item={item}
                  id={optionId(suggestions.length + index)}
                  active={suggestions.length + index === active}
                  onEnter={() => setCursor(suggestions.length + index)}
                  onPick={() => close()}
                />
              ))}

              {nothing ? (
                <p className="px-4 pt-2 text-micro leading-[1.6] text-ink-3">
                  Le comptoir tient du stock que l’export ne montre pas.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}

/**
 * One row.
 *
 * A real anchor rather than a `div` with a click handler, so the row can be
 * middle-clicked, copied, and opened in a new tab like every other link on the
 * site. `tabIndex={-1}` keeps it out of the tab order: focus stays in the input
 * for the whole interaction, which is what `aria-activedescendant` is for, and a
 * panel whose ten rows are all tab stops turns one Tab into eleven.
 *
 * Destinations and references are drawn differently on purpose. A destination is
 * a line of text with a count and an arrow, because what it promises is a page.
 * A reference carries the photograph and the price, because what it promises is
 * a thing. The white behind the thumbnail is --surface, as everywhere a
 * packshot appears.
 */
function Row({
  item,
  id,
  active,
  onEnter,
  onPick,
}: {
  item: Item
  id: string
  active: boolean
  onEnter: () => void
  onPick: () => void
}) {
  const shared = `flex w-full items-center gap-3 px-4 text-left transition-colors duration-[var(--t-fast)] ${
    active ? 'bg-space' : ''
  }`

  const common = {
    id,
    role: 'option' as const,
    'aria-selected': active,
    'aria-label': item.label,
    tabIndex: -1,
    onPointerEnter: onEnter,
    // Keeps the caret and the focus in the field: a mousedown that blurs the
    // input first would close the panel before the click landed on the row.
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
  }

  if (item.group === 'actions') {
    // The magnifier for the row that searches, the handset for the row that
    // reaches a person. Both are drawn from the house set; nothing new here.
    const Lead = item.external ? IconPhone : IconSearch
    const content = (
      <>
        <Lead className="shrink-0 text-[1.0625rem] text-ink-3" />
        <span className="min-w-0 flex-1 truncate text-small font-semibold">{item.name}</span>
        <IconArrowRight className="shrink-0 text-[1.0625rem] text-ink-3" />
      </>
    )

    return item.external ? (
      <a
        {...common}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onPick}
        className={`${shared} min-h-11 py-2.5 text-secondary hover:bg-space`}
      >
        {content}
      </a>
    ) : (
      <Link
        {...common}
        href={item.href}
        onClick={onPick}
        className={`${shared} min-h-11 py-2.5 text-secondary hover:bg-space`}
      >
        {content}
      </Link>
    )
  }

  if (item.group === 'products') {
    return (
      <Link
        {...common}
        href={item.href}
        onClick={onPick}
        className={`${shared} py-2 hover:bg-space`}
      >
        <span className="relative block size-11 shrink-0 overflow-hidden rounded-[7px] bg-surface">
          {item.image ? (
            <Image src={item.image} alt="" fill sizes="44px" className="object-contain p-1" />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="clamp-2 block text-micro leading-[1.4] text-ink">{item.name}</span>
          <span className="mt-1 flex flex-wrap items-baseline gap-x-2 text-micro">
            <span className="t-num font-bold text-ink">{formatPrice(item.price ?? 0)}</span>
            {item.categoryName ? (
              <span className="clamp-1 text-ink-3">{item.categoryName}</span>
            ) : null}
          </span>
        </span>
      </Link>
    )
  }

  return (
    <Link
      {...common}
      href={item.href}
      onClick={onPick}
      className={`${shared} min-h-11 py-2.5 hover:bg-space`}
    >
      <span className="min-w-0 flex-1 truncate text-small text-ink">{item.name}</span>
      <span className="t-num shrink-0 text-micro text-ink-3">
        {formatAmount(item.count ?? 0)}
      </span>
      <IconArrowRight className="shrink-0 text-[1rem] text-ink-3" />
    </Link>
  )
}
