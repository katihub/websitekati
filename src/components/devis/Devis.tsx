'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useMemo } from 'react'

import { IconPhone } from '@/components/brand/Icons'
import { Action } from '@/components/ui/Action'
import { dialable } from '@/constants/site'
import { useAccount } from '@/lib/account'
import { counterLabel, shopPhone, shopPhones } from '@/lib/comptoirs'
import { useCart } from '@/lib/cart'
import { formatCount, formatPrice } from '@/lib/format'

import { QuoteEmpty } from './QuoteEmpty'
import { libelleMotif, useVerification } from '@/lib/verification'
import { VAT_LABEL, buildQuoteMessage, totalsOf } from './quote'
import { BlocConditions } from '@/components/commande/Conditions'
import type { Conditions } from '@/lib/catalogue-en-direct'

/**
 * The quote. This is the end of the journey on this site, not a degraded cart.
 *
 * THERE IS NO CHECKOUT BEHIND THIS PAGE AND THERE WILL NOT BE ONE. The shop is
 * settled in cash at the counter, on delivery, or by Mobile Money against a
 * proforma, which is the doctrine already written at the head of `CartDrawer`.
 * So the page's job is not to take money, it is to turn a basket into the one
 * document this business runs on and hand it to a human. Every control below
 * either edits that list or opens a channel a person answers.
 *
 * WHAT THIS PAGE DOES NOT DO, STATED HERE SO NOBODY ADDS IT LATER. It does not
 * send an e-mail, it does not generate a PDF, it does not save a quote anywhere,
 * and it never says a quote was "sent" or "registered". Nothing leaves this
 * browser except a WhatsApp link the customer opens themselves and a telephone
 * number they dial themselves. A confirmation screen here would be a lie with a
 * green tick on it, and it is exactly the lie a storefront of this shape is
 * tempted into.
 *
 * THE LIST IS EDITABLE HERE AND NOT ONLY IN THE DRAWER, because the drawer is
 * 26rem wide and a company buying eleven references cannot audit eleven rows
 * through a letterbox. Same operations, same slugs, same store; more room, and
 * 44-pixel targets instead of the drawer's 32.
 *
 * THE EMPTY STATE IS THE COMMON CASE. Six surfaces link here and only one of
 * them is the basket, so most arrivals have nothing in the list. See
 * `QuoteEmpty`.
 *
 * HYDRATION. `useCart` and `useAccount` both report empty on the server by
 * design, so the first paint is the empty screen and the real list replaces it
 * on hydration. That is the store's contract, not an accident: it is what keeps
 * the basket count in the masthead from flashing.
 */
export function Devis({ conditions }: { conditions: Conditions }) {
  const { lines, count, setQty, remove } = useCart()
  const { account, pointsVente, openPourDevis: openAccount } = useAccount()

  const totals = useMemo(() => totalsOf(lines), [lines])

  /**
   * LE SERVEUR EST INTERROGÉ SUR LE PANIER, ET IL FAIT FOI SUR LES PRIX.
   *
   * Le panier capture le prix à l'ajout, ce que `lib/cart.tsx` documente et
   * assume. Mais un prix change dès que le panel l'enregistre (quatre avaient
   * déjà bougé en trois jours quand le catalogue ne suivait WooCommerce que
   * toutes les deux heures) : un panier laissé ouvert une nuit peut porter un
   * prix que la boutique ne pratique plus.
   *
   * ON NE CORRIGE PAS LE PANIER TOUT SEUL. Un total qui change sous les yeux du
   * client pendant qu'il le lit est pire qu'un total périmé : il ne sait plus ce
   * qu'il accepte. On montre l'écart, on nomme les lignes, il décide.
   */
  const { ecarts, indisponibles } = useVerification(lines)
  const message = useMemo(
    () => buildQuoteMessage(lines, account, pointsVente),
    [lines, account, pointsVente],
  )
  // `null` for a counter the panel has closed: the card says so instead of naming it.
  const counter = account?.counter ? counterLabel(account.counter, pointsVente) : null

  const listId = useId()
  const sumId = useId()

  if (lines.length === 0) return <QuoteEmpty phone={shopPhone(pointsVente)} />

  // THE CONDITION, ENFORCED WHERE IT CANNOT BE WALKED AROUND. Both buttons that
  // lead here check for a customer file first, but a reader can arrive by the
  // masthead menu, the footer, the counter strip or a bookmark, and a condition
  // that only one path honours is not a condition. So the list is held behind the
  // card here too.
  //
  // IT IS NOT AN ERROR SCREEN AND IT DOES NOT LOSE ANYTHING. The list is intact
  // in the browser and comes back the moment the card is filled; the figures are
  // even shown, because hiding the total from someone who has already chosen
  // eleven references reads as a toll rather than as a reason. What is withheld
  // is only the sending, and the reason is stated instead of asserted: a proforma
  // addressed to nobody, sent to no number, collected from no counter is not a
  // document.
  if (!account) {
    return (
      <div className="shell max-w-[42rem] pb-4">
        <section className="rounded-space border border-rule p-7 sm:p-9">
          <h2 className="text-sub font-semibold tracking-[-0.02em] text-balance">
            Une dernière chose avant la proforma
          </h2>
          <p className="mt-4 text-body leading-[1.6] text-pretty text-ink-2">
            Votre liste de {formatCount(lines.length, 'référence')} est prête, et son total est de{' '}
            <span className="t-num font-bold text-ink">{formatPrice(totals.ttc)}</span>. Le comptoir
            a besoin de savoir à qui adresser le document et sur quel numéro vous répondre.
          </p>
          {/* RÉÉCRITE LE JOUR OÙ LA CONNEXION EST ARRIVÉE. Elle promettait
              « Aucun mot de passe, aucun compte en ligne », ce qui était vrai
              tant qu'il n'y avait pas de serveur. Ce qui reste vrai, et qui est
              le seul point qui intéresse le lecteur ici, c'est que la fiche
              suffit et que le compte n'est pas exigé. */}
          <p className="mt-3 text-small leading-[1.6] text-ink-3">
            Trois champs : votre nom, votre numéro WhatsApp et le comptoir où vous retirez. La fiche
            suffit, le compte n’est pas exigé.
          </p>
          <button
            type="button"
            onClick={openAccount}
            className="press fill mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control bg-secondary px-7 text-[0.875rem] font-bold text-on-surface transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--secondary)] sm:w-auto"
          >
            Remplir ma fiche
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="devis-grid shell gap-x-16 gap-y-12 pb-40 lg:pb-band">
      <section aria-labelledby={listId} className="devis-liste">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-b border-rule pb-4">
          <h2 id={listId} className="text-sub font-semibold tracking-[-0.02em]">
            Votre liste
          </h2>
          <p className="t-num text-small text-ink-3">
            {formatCount(lines.length, 'référence')}, {formatCount(count, 'article')}
          </p>
        </div>

        {/* CE QUE LE SERVEUR SAIT ET QUE LE PANIER IGNORE.
            Le bandeau n'apparaît que s'il a quelque chose à dire : afficher
            « prix vérifiés » à chaque visite ferait du silence une information,
            et le client finirait par s'inquiéter les jours où il manque.
            Les deux cas sont séparés parce qu'ils appellent deux gestes
            différents : un écart de prix se ré-accepte, une indisponibilité se
            retire de la liste. */}
        {ecarts.length > 0 ? (
          <div
            role="status"
            className="mt-6 rounded-well border border-warn bg-paper p-5"
          >
            <p className="text-small font-semibold text-ink">
              {ecarts.length === 1
                ? 'Un prix a changé depuis que vous l’avez ajouté'
                : `${ecarts.length} prix ont changé depuis que vous les avez ajoutés`}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {ecarts.map((e) => (
                <li key={e.slug} className="text-micro leading-[1.6] text-ink-2">
                  <span className="text-ink">{e.nom}</span>{' '}
                  <span className="t-num text-ink-3 line-through">{formatPrice(e.ancien)}</span>{' '}
                  <span className="t-num font-semibold text-ink">{formatPrice(e.nouveau)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-micro leading-[1.6] text-ink-3">
              Le comptoir confirmera le prix du jour. Le total ci-contre reste celui de votre liste.
            </p>
          </div>
        ) : null}

        {indisponibles.length > 0 ? (
          <div
            role="status"
            className="mt-4 rounded-well border border-rule-2 bg-surface p-5"
          >
            <p className="text-small font-semibold text-ink">
              {indisponibles.length === 1
                ? 'Une référence demande une vérification'
                : `${indisponibles.length} références demandent une vérification`}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {indisponibles.map((i) => (
                <li key={i.slug} className="text-micro leading-[1.6] text-ink-2">
                  <span className="text-ink">{i.nom}</span> : {libelleMotif(i.motif)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-micro leading-[1.6] text-ink-3">
              Vous pouvez envoyer la liste telle quelle : le comptoir vous dira ce qui est
              disponible.
            </p>
          </div>
        ) : null}

        <ul>
          {lines.map((line) => (
            <li
              key={line.slug}
              className="flex flex-wrap items-start gap-x-6 gap-y-5 border-b border-rule py-6 sm:flex-nowrap"
            >
              <Link
                href={`/produit/${line.slug}`}
                tabIndex={-1}
                aria-hidden
                className="relative block size-20 shrink-0 overflow-hidden rounded-well border border-rule bg-surface"
              >
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="80px" className="object-contain p-1.5" />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1 basis-[13rem]">
                <Link
                  href={`/produit/${line.slug}`}
                  /* `block py-1` rather than a bare inline link: measured at
                     390 the two-line name was a 43-pixel target, and this row is
                     aimed at with a thumb. */
                  className="block py-1 text-small leading-[1.5] text-pretty transition-colors duration-[var(--t-fast)] hover:text-secondary"
                >
                  <span className="draw-under">{line.name}</span>
                </Link>
                <p className="t-num mt-2 text-micro text-ink-3">{formatPrice(line.price)} l’unité</p>
              </div>

              <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:shrink-0 sm:justify-end">
                {/* A group rather than three loose controls: without it a screen
                    reader hears "minus, 2, plus" with no idea which of eleven
                    rows it is standing in. */}
                <div
                  role="group"
                  aria-label={`Quantité, ${line.name}`}
                  className="flex items-center rounded-control border border-rule"
                >
                  <button
                    type="button"
                    onClick={() => setQty(line.slug, line.qty - 1)}
                    aria-label={`Une unité de moins de ${line.name}`}
                    className="press grid size-11 place-items-center text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
                  >
                    <span aria-hidden>-</span>
                  </button>
                  <span className="t-num w-8 text-center text-small">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(line.slug, line.qty + 1)}
                    aria-label={`Une unité de plus de ${line.name}`}
                    className="press grid size-11 place-items-center text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
                  >
                    <span aria-hidden>+</span>
                  </button>
                </div>

                {/* A floor on the width, or the steppers of eleven rows sit at
                    eleven different left edges: the line total is right-aligned
                    and 26 000 FCFA is thirty pixels narrower than 105 000. */}
                <div className="text-right sm:min-w-[7.5rem]">
                  <p className="t-num text-body font-bold tracking-[-0.015em]">
                    {formatPrice(line.price * line.qty)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(line.slug)}
                    className="press mt-1 min-h-11 text-micro text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-warn sm:min-h-0"
                  >
                    Retirer
                    <span className="sr-only"> {line.name} de la liste</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-7 max-w-[68ch] text-micro leading-[1.6] text-ink-3">
          Cette liste vit dans ce navigateur, sur cet appareil. Elle n’est enregistrée sur aucun
          serveur et le magasin ne la voit pas tant que vous ne la lui avez pas envoyée.
        </p>

        {/* Ce qui suivra l'achat — livraison, garantie, paiement — tel que la
            maison l'a ecrit dans le panel, avant que la liste parte. */}
        <div className="mt-6">
          <BlocConditions conditions={conditions} />
        </div>
      </section>

      {/* `aria-live` on the figures and nowhere else: a reader changing a
          quantity is asking about the total, and it is the only thing on the
          page that answers without moving the focus.

          IT DOES NOT FOLLOW THE SCROLL, AND IT USED TO. The whole right column
          was pinned once, then just this card, on the reasoning that a total is
          worth keeping in view while quantities are corrected. On a desktop that
          reasoning is thinner than it looks: the figures are already beside the
          rows they add up, the column is shorter than the list it sits next to,
          so the card reaches its resting place and then travels for the rest of
          the page as the one element that refuses to stay where it was put. A
          panel that slides against the page while nothing else moves reads as an
          overlay rather than as part of the document.

          The phone keeps the behaviour that earns it: the total is pinned to the
          foot of the screen there because the button beside it is the page's
          whole purpose and the list above it is 2 900 pixels long. That is a
          different argument, and it is the only one that held. */}
      <section
        aria-labelledby={sumId}
        className="devis-chiffrage rounded-space border border-rule p-7">
          <h2 id={sumId} className="text-sub font-semibold tracking-[-0.02em]">
            Le chiffrage
          </h2>

          <dl aria-live="polite" className="mt-6 text-small">
            <div className="flex items-baseline justify-between gap-6 py-2">
              <dt className="text-ink-2">Base HT</dt>
              <dd className="t-num">{formatPrice(totals.ht)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 py-2">
              <dt className="text-ink-2">TVA {VAT_LABEL}</dt>
              <dd className="t-num">{formatPrice(totals.vat)}</dd>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-6 border-t border-rule pt-4">
              <dt className="font-semibold">Total TTC</dt>
              <dd className="t-num text-sub font-bold tracking-[-0.02em]">
                {formatPrice(totals.ttc)}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-micro leading-[1.6] text-ink-3">
            Les prix du catalogue sont TTC. La base HT et la TVA ci-dessus en sont déduites au taux
            de {VAT_LABEL}, elles ne s’y ajoutent pas. Livraison et installation ne sont pas
            comprises : la proforma les chiffre.
          </p>
      </section>

      <aside className="devis-reste">
        <section className="rounded-space border border-rule p-7">
          <h2 className="t-label text-ink-3">Vos coordonnées</h2>

          {account ? (
            <>
              <p className="mt-4 text-small font-semibold">{account.name}</p>
              <p className="t-num mt-1 text-small text-ink-2">{account.phone}</p>
              {account.counter ? (
                <p className="mt-1 text-small text-ink-2">
                  {counter ? `Retrait à ${counter}` : 'Comptoir de retrait à choisir'}
                </p>
              ) : null}
              <p className="mt-4 text-micro leading-[1.6] text-ink-3">
                Ces trois lignes partent avec la liste, pour que le comptoir sache à qui adresser la
                proforma.
              </p>
              <button
                type="button"
                onClick={openAccount}
                className="press mt-4 inline-flex min-h-11 items-center text-small font-semibold text-secondary transition-colors duration-[var(--t-fast)] hover:text-secondary"
              >
                <span className="draw-under">Modifier ma fiche</span>
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-small leading-[1.65] text-ink-2">
                Sans fiche, le message part sans votre nom ni votre comptoir de retrait, et le
                conseiller vous les demandera. Trois champs suffisent, et ils ne quittent pas cet
                appareil.
              </p>
              <button
                type="button"
                onClick={openAccount}
                className="press mt-4 inline-flex min-h-11 items-center text-small font-semibold text-secondary transition-colors duration-[var(--t-fast)] hover:text-secondary"
              >
                <span className="draw-under">Remplir ma fiche</span>
              </button>
            </>
          )}
        </section>

        <section className="on-rail mt-6 rounded-space bg-rail p-7 text-rail-ink">
          <h2 className="text-sub font-semibold leading-[1.2] tracking-[-0.02em]">
            Envoyer la liste au comptoir
          </h2>
          {/* FOUR SENTENCES BECAME ONE. The paragraph explained the mechanism
              in full: the new tab, what is written in it, the rereading, the
              pressing, the reply, and a disclaimer. All of it true, and all of it
              read AFTER the button had already been pressed, because nobody
              studies an explanation of a control they can simply use. What a
              reader needs before pressing is the one fact that is not obvious:
              nothing leaves without them. */}
          <p className="mt-3 text-small leading-[1.6] text-pretty text-rail-ink-2">
            La liste, les quantités et le total partent déjà écrits. Vous relisez et vous envoyez :
            rien ne quitte cette page tout seul.
          </p>

          {message.href ? (
            <Action
              href={message.href}
              variant="on-rail"
              target="_blank"
              rel="noreferrer"
              className="mt-6 w-full"
            >
              Envoyer ma commande
            </Action>
          ) : null}

          {message.omitted > 0 ? (
            <p className="mt-5 border-t border-rail-rule pt-5 text-micro leading-[1.6] text-rail-ink-2">
              Un message WhatsApp trop long est coupé, donc les {message.detailed} premières
              références partent en détail et les {message.omitted} autres sont annoncées en nombre.
              Le total ci-dessus reste celui de la liste entière. Pour le détail complet, appelez le
              comptoir : le conseiller reprend la liste ligne par ligne.
            </p>
          ) : null}

          <div className="mt-6 border-t border-rail-rule pt-5">
            <p className="text-micro text-rail-ink-2">Ou appelez le comptoir</p>
            <ul className="mt-3 space-y-1">
              {shopPhones(pointsVente).map((phone) => (
                <li key={phone}>
                  <a
                    href={`tel:${dialable(phone)}`}
                    className="t-num flex min-h-11 items-center gap-2.5 text-small text-rail-ink transition-colors duration-[var(--t-fast)] hover:text-secondary"
                  >
                    <IconPhone className="text-[1rem]" />
                    {phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </aside>

      {/* THE ONE CONTROL THAT MUST NEVER BE SCROLLED PAST, ON THE ONE SCREEN
          WHERE IT ALWAYS WAS. On a phone the send button sits at the very foot of
          the page, under the list, the figures, the customer card and two
          telephone numbers: with eleven references that is past 3 000 pixels, so
          the action the page exists for is the last thing a thumb can reach. It
          is now pinned, with the total beside it, because a send button with no
          figure next to it asks someone to commit to a number they last saw a
          screen and a half ago.

          It is a bar and not a floating disc: the label has to be legible, and
          the figure has to fit next to it. `pb-28` on the grid above is what
          keeps it from covering the last row of the list, and it is dropped from
          `lg` where the button lives in the sticky column instead.

          `env(safe-area-inset-bottom)` because on an iPhone the home indicator
          would otherwise sit on top of the label. */}
      <div
        data-dock
        className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-rule bg-paper/95 px-[var(--gutter)] pt-3 backdrop-blur-[6px] lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {/* TWO ROWS, AND THE FIRST ARRANGEMENT WAS MEASURED WRONG. Total and
            button side by side left the button 223 pixels wide, and "Envoyer ma
            commande" set in 14px bold does not fit on one line in 223 minus its
            own padding: it broke in two and the control came out 66 pixels tall.
            A primary call to action that wraps is a broken button, whatever else
            is true about it. Given its own row it has the full width and sets on
            one line.

            AND BOD MOVES INSTEAD OF THE BUTTON GIVING UP WIDTH. The first
            attempt stopped this row 4.5rem short of the right edge, because the
            assistant's launcher is a 52 pixel disc pinned 16 from the right at
            z-index 60 against this bar's 20, and it covered the last 38 pixels of
            the button. The shop read the result correctly: a primary action that
            does not reach the edges of its own bar looks like a mistake. It is
            the floating thing that should step aside, not the fixed one, so the
            launcher is lifted above this bar for as long as it exists. The rule
            is in globals.css, keyed on `data-dock`. */}
        <div className="flex items-baseline justify-between gap-4">
          <p className="t-label text-ink-3">Total TTC</p>
          <p className="t-num text-body font-bold tracking-[-0.015em]">
            {formatPrice(totals.ttc)}
          </p>
        </div>
        {message.href ? (
          <Action
            href={message.href}
            target="_blank"
            rel="noreferrer"
            className="mt-2.5 min-h-12 w-full"
          >
            Envoyer ma commande
          </Action>
        ) : null}
      </div>
    </div>
  )
}
