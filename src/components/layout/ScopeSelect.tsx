'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { IconChevronDown } from '@/components/brand/Icons'

/**
 * The department the search is limited to.
 *
 * WHY IT IS NOT A `<select>`. It was one, and a native select opens the
 * operating system's own menu: grey on macOS, blue on Windows, a full-height
 * sheet on Android. None of them know this site exists. On the one control that
 * sits in the middle of the masthead, between the wordmark and the basket, that
 * is the site handing its most-used surface to a stranger for the length of the
 * interaction.
 *
 * WHAT REPLACES IT. A listbox, built to the pattern the role promises: the
 * trigger carries `aria-haspopup` and `aria-expanded`, the panel is a `listbox`
 * of `option`s, arrows move the active choice, Home and End jump to the ends,
 * Enter and Space commit, Escape closes and returns the focus to the trigger,
 * and a click outside closes it. A listbox that does not answer arrow keys is
 * worse than a native select, because it lies about what it is.
 *
 * The chosen value also rides in a hidden input, so the form still submits the
 * same field it always did.
 */
export interface Scope {
  readonly slug: string
  readonly label: string
}

const ALL = { slug: '', label: 'Tous les rayons' } as const

export function ScopeSelect({
  scopes,
  value,
  onChange,
}: {
  scopes: readonly Scope[]
  value: string
  onChange: (slug: string) => void
}) {
  const options = [ALL, ...scopes]
  const [open, setOpen] = useState(false)
  /**
   * Which row the keyboard is on. `null` means "wherever the current value is",
   * which is where a listbox opens. Derived rather than copied into state by an
   * effect on open: there is no external system to synchronise with here, only
   * a value to compute, and the effect form costs a second render every time
   * the panel appears.
   */
  const [cursor, setCursor] = useState<number | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()

  const current = options.find((option) => option.slug === value) ?? ALL

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.slug === value),
  )
  const active = cursor ?? selectedIndex

  const commit = (slug: string) => {
    onChange(slug)
    setOpen(false)
    setCursor(null)
    trigger.current?.focus()
  }

  const move = (to: number) => setCursor((to + options.length) % options.length)

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setCursor(null)
        setOpen(true)
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(active - 1)
        break
      case 'Home':
        event.preventDefault()
        move(0)
        break
      case 'End':
        event.preventDefault()
        move(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(options[active].slug)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        setCursor(null)
        trigger.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={container} className="relative hidden shrink-0 items-center border-r border-rule lg:flex">
      <input type="hidden" name="rayon" value={value} />

      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label="Limiter la recherche à un rayon"
        onClick={() => setOpen((state) => !state)}
        onKeyDown={onKeyDown}
        className="flex h-full w-[176px] cursor-pointer items-center justify-between gap-2 pr-3.5 pl-4 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
      >
        <span className="clamp-1 text-left">{current.label}</span>
        <IconChevronDown
          className={`shrink-0 text-[1rem] text-ink-3 transition-transform duration-[var(--t-base)] ease-brand ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Rayons"
          tabIndex={-1}
          className="absolute top-[calc(100%+0.5rem)] left-0 z-[var(--z-header)] max-h-[19rem] w-[17rem] overflow-y-auto rounded-well border border-rule-panel bg-paper py-2 text-ink shadow-[var(--shadow-panel)]"
        >
          {options.map((option, index) => {
            const selected = option.slug === value
            return (
              <li key={option.slug || 'all'}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onPointerEnter={() => setCursor(index)}
                  onClick={() => commit(option.slug)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-small transition-colors duration-[var(--t-fast)] ${
                    index === active ? 'bg-space' : ''
                  } ${selected ? 'font-semibold text-secondary' : 'text-ink-2'}`}
                >
                  {option.label}
                  {selected ? (
                    <span aria-hidden className="size-1.5 shrink-0 rounded-pill bg-secondary" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
