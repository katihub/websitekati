"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { IconArrowRight, IconClose, IconPhone } from "@/components/brand/Icons";
import { Action } from "@/components/ui/Action";
import { useAccount } from "@/lib/account";
import { cartLineKey, useCart } from "@/lib/cart";
import { useCheckoutGate } from "@/lib/checkout-gate";
import { formatPrice } from "@/lib/format";
import { useSession } from "@/lib/session";
import { dialable } from "@/constants/site";
import { shopPhone } from "@/lib/comptoirs";

/**
 * The basket, as a drawer.
 *
 * A drawer rather than a page, because losing your place in a grid of four
 * thousand references to confirm one addition is a real cost. It slides from the
 * right, traps focus while open, closes on Escape and on the backdrop, and gives
 * focus back to whatever opened it.
 *
 * WHAT IT IS FOR. This basket does not check out, and it does not pretend to:
 * there is no payment gateway behind it and there will not be one, because the
 * shop is paid in cash at the counter, on delivery, or by mobile money against a
 * proforma. So the drawer's own call to action is the proforma, and its second
 * is the phone. A "Payer" button that led nowhere would be the one dishonest
 * control on the site.
 *
 * THE MOTION IS E-SHOP'S, TO THE NUMBER. Scrim 300ms on opacity, panel 460ms on
 * x from 100%, both on [0.22, 1, 0.36, 1], and both wrapped in `AnimatePresence`
 * so the panel travels back out instead of vanishing. That exit is the whole
 * difference: a drawer that slides in and then disappears on close reads as two
 * different objects, and the CSS version here could not animate an element it
 * had already unmounted.
 *
 * The empty state is a designed screen rather than a message, since it is the
 * one most first-time visitors will actually see.
 *
 * EVERY CONTROL IN HERE WAS DRAWN FOR A POINTER AND MEASURED FOR ONE. At 360
 * the audit read the cross at 36 x 36, the two quantity steppers at 32 x 32
 * eight pixels apart, "Retirer" at 38 x 18 and the telephone number at 312 x 20:
 * five targets under the 44 a finger needs, on the one panel where a customer
 * changes their mind about money. All five are floored below `md` and left
 * exactly as they were from `md` up, where the aiming is done with a mouse:
 * measured at 1440 the cross is 36, the steppers 32 and the number 20, before
 * and after.
 */

/** NENGi's workhorse curve: everything decelerates into place, nothing overshoots. */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export function CartDrawer() {
  const { isOpen, close, lines, subtotal, count, setQty, remove, lastAdded } =
    useCart();
  const { go } = useCheckoutGate();
  const { session } = useSession();
  const { openPourCommande, pointsVente } = useAccount();
  const router = useRouter();
  const phone = shopPhone(pointsVente);
  const marketplace = lines.some(line => Boolean(line.offerId));
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  /* LE LIEN WHATSAPP DIRECT A ÉTÉ RETIRÉ D'ICI, et ce n'est pas une perte.
     Il ouvrait une conversation pré-remplie « j'ai une question », en
     troisième bouton d'un panneau qui en portait déjà deux. Le devis fait la
     même chose en mieux — il écrit la liste entière — et c'est lui que sert
     désormais « Demander plus d'information ». La ligne téléphonique reste
     dessous : c'est le canal qui marche quand les données ne marchent pas. */

  useEffect(() => {
    if (isOpen) {
      restoreTo.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      // The heading, not the close button: a reader arriving in the panel should
      // hear what it is before they hear how to leave it.
      panel.current?.focus();
    } else {
      document.body.style.overflow = "";
      restoreTo.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      // Without the trap, tabbing walks the page behind the drawer, which on a
      // catalogue this long is a reader lost for good.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[var(--z-drawer)]">
          <motion.button
            type="button"
            aria-label="Fermer le panier"
            onClick={close}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT as never }}
            className="absolute inset-0 cursor-pointer bg-[rgb(20_23_21_/_0.45)] backdrop-blur-[2px]"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Votre panier"
            tabIndex={-1}
            initial={reduced ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: "100%" }}
            transition={{ duration: 0.46, ease: EASE_OUT as never }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col bg-paper shadow-[-24px_0_60px_-30px_rgb(20_23_21_/_0.45)] outline-none"
          >
            <div className="flex items-center justify-between gap-4 border-b border-rule px-6 py-5">
              <h2 className="text-sub font-semibold tracking-[-0.02em]">
                Panier
                {count > 0 ? (
                  <span className="t-num ml-2 text-small text-ink-3">
                    {count}
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer le panier"
                className="press -mr-2 grid size-11 place-items-center rounded-control text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary md:mr-0 md:size-9"
              >
                <IconClose className="text-[1.25rem]" />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col justify-center px-6 py-12 text-center">
                <p className="text-body font-semibold">
                  Votre panier est vide.
                </p>
                <p className="mx-auto mt-3 max-w-[34ch] text-small leading-[1.6] text-pretty text-ink-2">
                  Ajoutez les références qui vous intéressent, puis demandez la
                  proforma. Rien n’est payé en ligne : le règlement se fait au
                  comptoir, à la livraison ou par Mobile Money.
                </p>
                <Action
                  href="/catalogue"
                  className="mx-auto mt-8"
                  onClick={close}
                >
                  Ouvrir le catalogue
                </Action>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-rule overflow-y-auto px-6">
                  {lines.map((line) => (
                    <li
                      key={cartLineKey(line)}
                      className={`flex gap-4 py-5 ${
                        cartLineKey(line) === lastAdded
                          ? "motion-safe:animate-[line-in_520ms_var(--ease-draw)_both]"
                          : ""
                      }`}
                    >
                      <Link
                        href={line.offerId ? `/marketplace/produits/${line.slug}` : `/produit/${line.slug}`}
                        onClick={close}
                        className="relative block size-[72px] shrink-0 overflow-hidden rounded-well bg-surface"
                      >
                        {line.image ? (
                          <Image
                            src={line.image}
                            alt=""
                            fill
                            sizes="72px"
                            className="object-contain p-1"
                          />
                        ) : null}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={line.offerId ? `/marketplace/produits/${line.slug}` : `/produit/${line.slug}`}
                          onClick={close}
                          /* `clamp-2` is `-webkit-box`, so the floor is a
                             min-height and not a flex centring: the utility
                             would lose to the unlayered class and the row would
                             read as centred while being drawn from the top. */
                          className="clamp-2 block min-h-11 text-small leading-[1.4] hover:text-secondary md:min-h-0"
                        >
                          {line.name}
                        </Link>
                        <p className="t-num mt-1.5 text-small font-bold">
                          {formatPrice(line.price)}
                        </p>

                        <div className="mt-3 flex items-center gap-3 md:gap-4">
                          <div className="flex items-center rounded-control border border-rule">
                            <button
                              type="button"
                              onClick={() => setQty(cartLineKey(line), line.qty - 1)}
                              aria-label={`Retirer un ${line.name}`}
                              className="press grid size-11 place-items-center text-ink-2 hover:text-secondary md:size-8"
                            >
                              <span aria-hidden>−</span>
                            </button>
                            <span className="t-num w-7 text-center text-small">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(cartLineKey(line), line.qty + 1)}
                              aria-label={`Ajouter un ${line.name}`}
                              className="press grid size-11 place-items-center text-ink-2 hover:text-secondary md:size-8"
                            >
                              <span aria-hidden>+</span>
                            </button>
                          </div>
                          {/* The padding is what makes the width, since the
                              word is 38 pixels long and a target is 44. It is
                              given back as a negative margin so the label still
                              sits where it was drawn. */}
                          <button
                            type="button"
                            onClick={() => remove(cartLineKey(line))}
                            className="press -mr-2 flex min-h-11 items-center px-2 text-micro text-ink-3 transition-colors duration-[var(--t-fast)] hover:text-warn md:mr-0 md:min-h-0 md:px-0"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-rule px-6 py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-small text-ink-2">Sous-total</span>
                    <span className="t-num text-sub font-bold">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <p className="mt-2 text-micro leading-[1.5] text-ink-3">
                    Hors livraison. La proforma confirme les prix, les délais et
                    la TVA.
                  </p>

                  {/* TWO DOORS OUT, AND THEY ARE NOT THE SAME DOOR.
                      "Commander maintenant" is the shop's own path: the quote,
                      where this list becomes the proforma the business runs on.
                      It is a button and not a link because it may not navigate
                      at all: the quote needs a name, a number and a counter, so
                      an unfilled customer meets the card first and arrives at
                      the quote by themselves once it is filled.

                      "Demande plus d'information" is the other real thing a
                      customer wants at this exact moment, and it used to have no
                      control at all. Someone holding eleven references and one
                      doubt does not want a document, they want a person, and the
                      only person on this panel was a telephone number set in
                      grey below the fold of a 26rem drawer. It opens WhatsApp
                      with the list already written, as a question rather than as
                      an order, which is the difference the label promises.

                      The telephone line stays underneath both. It is the channel
                      that works when the data does not, and this audience uses
                      it. */}
                  {/* « Commander maintenant » COMMANDE VRAIMENT, MAINTENANT.
                      Le libellé portait jusqu'ici vers le devis WhatsApp, faute
                      de mieux : la vitrine ne savait pas créer de commande. Elle
                      le sait. Le bouton mène donc à la vraie validation, et le
                      chemin du devis reprend le nom de ce qu'il fait depuis le
                      début — demander un renseignement, pas passer un ordre.

                      SANS COMPTE, IL OUVRE LA PORTE PLUTÔT QU'UN MUR. `POST
                      /commandes` exige une session ; l'anonyme est donc mené à
                      la fiche et à la connexion, pas à un 401. */}
                  {/* LE PANIER SE FERME DANS TOUS LES CAS, ET C'EST LA DEMANDE.
                      Il restait ouvert derriere la fenetre de connexion, et le
                      client se retrouvait, une fois connecte, devant le meme
                      panier au lieu de sa commande. Il se ferme maintenant
                      d'abord ; avec une session, on va droit a la commande, sans
                      elle la fenetre s'ouvre « pour commander » et, quelle que
                      soit l'issue, c'est elle qui mene a la suite. */}
                  <Link
                    href={marketplace ? "/panier" : "/commande/valider"}
                    onClick={(event) => {
                      event.preventDefault()
                      close()
                      if (marketplace) router.push('/panier')
                      else if (session) router.push('/commande/valider')
                      else openPourCommande()
                    }}
                    className="press fill mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control bg-secondary px-6 text-[0.875rem] font-bold text-on-surface transition-colors duration-[var(--t-fast)] ease-brand [--fill-to:var(--secondary)]"
                  >
                    {marketplace ? 'Voir mon panier' : 'Commander maintenant'}
                    <IconArrowRight className="text-[1.0625rem]" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      close()
                      go()
                    }}
                    className="press mt-2.5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-control border border-rule px-6 text-[0.875rem] font-bold text-ink transition-colors duration-[var(--t-fast)] ease-brand hover:border-ink hover:text-secondary"
                  >
                    Demander plus d’information
                  </button>

                  {phone ? (
                    <a
                      href={`tel:${dialable(phone)}`}
                      className="t-num mt-2 flex min-h-11 items-center justify-center gap-2.5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary md:mt-4 md:min-h-0"
                    >
                      <IconPhone className="text-[1rem] text-ink-3" />
                      {phone}
                    </a>
                  ) : null}
                </div>
              </>
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
