'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'

import { IconChevronDown, IconUser } from '@/components/brand/Icons'
import { firstName, useAccount } from '@/lib/account'
import { counterLabel, findCounter } from '@/lib/comptoirs'
import { useSession } from '@/lib/session'

/**
 * The account control in the masthead.
 *
 * It stands where "Mon devis" stood, and it swallows that link rather than
 * losing it: the quote is now the first row of the menu, which is the honest
 * hierarchy anyway. A material list belongs to somebody.
 *
 * TWO CONTROLS IN ONE POSITION, NOT ONE CONTROL WITH TWO LABELS. Signed out,
 * this is a button that opens a dialog, so it says `aria-haspopup="dialog"` and
 * has no chevron: nothing drops from it. Signed in, it is a menu button, so it
 * says `aria-haspopup="menu"`, carries `aria-expanded`, and grows the chevron
 * that promises a panel. A trigger that claims a menu and opens a modal is a
 * lie a screen reader repeats out loud.
 *
 * THE DENSITY IS THE OLD LINK'S DENSITY. Two lines, a 20px mark, the same
 * padding, so the masthead row does not reflow when the customer signs in and
 * the label changes length. Below `lg` the two lines are dropped and the mark
 * stands alone, which is what the row can afford at 390px: wordmark, account,
 * basket, and nothing wraps.
 *
 * AND WHEN IT STANDS ALONE IT IS 44 BY 44, MEASURED, NOT 36 BY 44. The height
 * came from `min-h-11` and the width came from whatever a 20px mark plus 8px of
 * padding on each side happened to make, which was 36: tall enough to pass a
 * glance and eight pixels short of the target on the axis nobody checked. Both
 * axes are now pinned by the same rule, and the mark is centred inside it. The
 * floor is dropped at `lg`, where the two lines of text set the width and the
 * pointer is a mouse.
 *
 * THE PANEL CARRIES AN EXPLICIT Z-INDEX, WHICH IS NOT DECORATION. The whole
 * masthead is one stacking context (`header` is z-40) and the green department
 * bar is a later sibling of this row, so at `z-index: auto` the panel is painted
 * underneath it and the bottom third of the menu disappears into the green. The
 * search scope listbox had exactly this bug. Same fix, same value.
 *
 * The keyboard contract is the one `ScopeSelect` and `DepartmentMenu` already
 * keep: arrows move, Home and End jump, Escape closes and hands the focus back
 * to the trigger, Tab leaves, a pointer outside closes, and focus leaving the
 * container closes. `next &&` on the blur matters, because clicking a
 * non-focusable part of the panel reports a null relatedTarget in Chrome.
 */
export function AccountMenu() {
  const { account, pointsVente, open: openDialog, signOut } = useAccount()
  const { session } = useSession()
  /* CONNECTE, C'EST UNE SESSION OU UNE FICHE. Le menu ne regardait que la
     fiche de ce navigateur : un client connecte dont la fiche n'y etait pas —
     effacee, ou jamais recopiee depuis le serveur — voyait « Mon compte » et la
     fenetre de connexion, et se « reconnectait » alors qu'il l'etait deja
     (retour du client, 5 octobre). */
  const connecte = Boolean(account || session)
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  /** Set only when the panel was opened from the keyboard, so a mouse click
      does not draw a focus ring on the first row of a menu nobody is tabbing. */
  const takeFocus = useRef(false)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  useEffect(() => {
    if (!open || !takeFocus.current) return
    takeFocus.current = false
    panel.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  const rows = () =>
    Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const move = (step: number, absolute?: number) => {
    const list = rows()
    if (list.length === 0) return
    const from = list.indexOf(document.activeElement as HTMLElement)
    const to = absolute ?? (from < 0 ? 0 : from + step)
    list[(to + list.length) % list.length].focus()
  }

  const dismiss = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        if (!connecte) return // The dialog trigger; let the click handler run.
        event.preventDefault()
        takeFocus.current = true
        setOpen(true)
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        move(0, 0)
        break
      case 'End':
        event.preventDefault()
        move(0, rows().length - 1)
        break
      case 'Escape':
        event.preventDefault()
        dismiss()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const title = account ? firstName(account.name) : 'Mon compte'
  // A counter the panel no longer publishes is not named: see `counterLabel`.
  const counter = account?.counter ? counterLabel(account.counter, pointsVente) : null
  const caption = account
    ? account.counter
      ? counter === null
        ? 'Comptoir à choisir'
        : `Retrait à ${findCounter(account.counter, pointsVente)?.district ?? account.counter}`
      : 'Fiche client'
    : session
      ? 'Connecté'
      : 'Devis et retrait'

  return (
    <div
      ref={container}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && !event.currentTarget.contains(next)) setOpen(false)
      }}
      className="relative flex shrink-0"
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup={connecte ? 'menu' : 'dialog'}
        aria-expanded={connecte ? open : undefined}
        aria-controls={connecte && open ? panelId : undefined}
        aria-label={account ? `Compte de ${account.name}` : connecte ? 'Mon compte' : 'Ouvrir ma fiche client'}
        onClick={() => {
          if (connecte) setOpen((state) => !state)
          else openDialog()
        }}
        className="press flex min-h-11 min-w-11 items-center justify-center gap-2.5 rounded-control px-2 py-2 text-small transition-colors duration-[var(--t-fast)] hover:text-secondary lg:min-h-0 lg:min-w-0 lg:justify-start lg:px-3"
      >
        {/* THE ICON CARRIES THE STATUS, BECAUSE BELOW `lg` IT IS ALL THERE IS.
            The name and the counter only appear from `lg`; on a phone the
            trigger is the glyph alone, and it looked the same whether a file
            was open or not. A file open: the glyph turns green and a green dot
            sits on it. */}
        <span className="relative shrink-0">
          <IconUser
            className={`text-[1.25rem] ${connecte ? 'text-primary' : 'text-ink md:text-ink-3'}`}
          />
          {connecte ? (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary ring-2 ring-paper"
            />
          ) : null}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="clamp-1 block max-w-[9rem]">{title}</span>
          <span className="block text-micro text-ink-3">{caption}</span>
        </span>
        {connecte ? (
          <IconChevronDown
            className={`hidden shrink-0 text-[1rem] text-ink-3 transition-transform duration-[var(--t-base)] ease-brand lg:block ${
              open ? 'rotate-180' : ''
            }`}
          />
        ) : null}
      </button>

      {connecte && open ? (
        <div
          ref={panel}
          id={panelId}
          role="menu"
          aria-label="Mon compte"
          /* Below `md` the trigger sits in the middle of the phone bar, and a
             280-pixel panel hung from its right edge ran off the left of a
             360 screen. There it is pinned under the bar, between the page
             gutters. */
          className="z-[var(--z-header)] overflow-hidden rounded-well border border-rule-panel bg-paper text-ink shadow-[var(--shadow-panel)] max-md:fixed max-md:inset-x-[var(--gutter)] max-md:top-[3.75rem] md:absolute md:top-[calc(100%+0.5rem)] md:right-0 md:w-[17.5rem]"
        >
          <div className="border-b border-rule px-4 py-3.5">
            {account ? (
              <>
                <p className="clamp-1 text-small font-semibold">{account.name}</p>
                <p className="t-num mt-1 text-micro text-ink-3">{account.phone}</p>
                {account.counter ? (
                  <p className="mt-1.5 text-micro text-ink-2">
                    Comptoir : {counter ?? 'à choisir'}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="clamp-1 text-small font-semibold">{session?.courriel ?? 'Connecté'}</p>
                <p className="mt-1 text-micro text-ink-3">Nom et comptoir à compléter</p>
              </>
            )}
          </div>

          <Link
            href="/devis"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Mon devis
            <span className="text-micro text-ink-3">Liste de matériel</span>
          </Link>

          {/* « Mes commandes » n'a de sens qu'avec une session : c'est le
              serveur qui les porte, pas la fiche locale. On ne la montre donc
              qu'au client connecte. */}
          {session ? (
            <Link
              href="/compte/commandes"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Mes commandes
              <span className="text-micro text-ink-3">Suivi et réception</span>
            </Link>
          ) : null}
          <Link
            href="/compte/favoris"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Mes favoris
            <span className="text-micro text-ink-3">Produits gardés pour plus tard</span>
          </Link>
          {session ? (
            <Link
              href="/compte/devis"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Mes devis marketplace
              <span className="text-micro text-ink-3">Demandes et réponses des boutiques</span>
            </Link>
          ) : null}
          {session ? (
            <Link
              href="/compte/paiements-plusieurs-fois"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Mes paiements en plusieurs fois
              <span className="text-micro text-ink-3">Versements, réservation et livraison</span>
            </Link>
          ) : null}
          {session ? (
            <Link
              href="/compte/kati"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Mes KATI
              <span className="text-micro text-ink-3">Points de fidélité et parrainage</span>
            </Link>
          ) : null}
          {session ? (
            <Link
              href="/compte/assistance"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-col justify-center px-4 py-2.5 text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
            >
              Mes demandes
              <span className="text-micro text-ink-3">Tickets et réponses de l’assistance</span>
            </Link>
          ) : null}

          {/* THE FOCUS IS MOVED TO THE TRIGGER BEFORE THE DIALOG IS ASKED FOR,
              AND THE ORDER OF THOSE TWO LINES IS THE WHOLE POINT. The dialog
              remembers whatever held the focus when it opened and hands it back
              on close; if that were this row, it would be handing the focus to a
              button that no longer exists, since closing the menu unmounts it.
              The focus would then fall to `body` and the next Tab would restart
              at the top of the document. Focusing the trigger first makes the
              remembered element one that outlives the menu, so Escape on the
              dialog returns the customer to the control they opened it from. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              trigger.current?.focus()
              setOpen(false)
              openDialog()
            }}
            className="flex min-h-11 w-full flex-col justify-center px-4 py-2.5 text-left text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-secondary"
          >
            Mes coordonnées
            <span className="text-micro text-ink-3">Nom, WhatsApp, comptoir</span>
          </button>

          {/* EIGHT PIXELS OF PAPER BEFORE THE DESTRUCTIVE ROW, ON A PHONE ONLY.
              Measured at 360, "Mes coordonnées" and "Se déconnecter" were one
              pixel apart: two 44px targets stacked with a hairline between
              them, the lower of which erases the card. A thumb that lands two
              millimetres low on a moving taxi seat should not be able to do
              that. From `md` the pointer is precise and the row closes up
              again, so the panel measures the same 280 x 270 it did before. */}
          <div className="mt-2 border-t border-rule md:mt-0">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                signOut()
                setOpen(false)
                trigger.current?.focus()
              }}
              className="flex min-h-11 w-full flex-col justify-center px-4 py-2.5 text-left text-small transition-colors duration-[var(--t-fast)] hover:bg-space hover:text-warn"
            >
              Se déconnecter
              <span className="text-micro text-ink-3">
                {session ? 'Ferme la session sur cet appareil' : 'Efface la fiche de cet appareil'}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
