import { IconPhone } from '@/components/brand/Icons'
import { Action } from '@/components/ui/Action'
import { dialable } from '@/constants/site'

import { VAT_LABEL } from './quote'

/**
 * The quote with nothing in it, and it is the state most people will see.
 *
 * THIS PAGE IS LINKED FROM SIX PLACES AND ONLY ONE OF THEM IS THE BASKET. The
 * counter strip says "Devis entreprise", the footer says "Facture proforma", the
 * homepage tile says "Demander un devis", the account menu says "Mon devis" and
 * the assistant says "Ouvrir un devis". Every one of those is a reader who has
 * never added a product and arrives here cold. A line of grey text saying the
 * list is empty would tell them nothing about what they were promised, so this
 * is a screen rather than a message.
 *
 * IT DRAWS THE DOCUMENT THE CUSTOMER IS ACTUALLY BUYING. Not an illustration and
 * not an icon: a blank proforma, on paper, with the shop's own green in its
 * header and its total column left unpriced. That is the object at the end of
 * this journey, and showing it empty is the shortest possible answer to "what is
 * a devis here". The bars are hairline rules and pill shapes from the token set,
 * so it stays inside the system rather than importing an illustration style the
 * rest of the site does not have.
 *
 * THE THREE STEPS SAY WHERE THE MONEY IS TAKEN, BECAUSE THAT IS THE QUESTION.
 * This shop has no online payment and is not getting one, and a visitor who
 * assumes there is a card form waiting at step four will abandon at step two.
 * The steps state the settlement out loud, in the customer's own terms.
 */
export function QuoteEmpty({ phone }: { phone: string | null }) {
  return (
    <div className="shell pb-band">
      <div className="enter grid items-center gap-x-16 gap-y-12 rounded-space border border-rule p-7 md:p-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-x-20">
        <BlankProforma />

        <div>
          <h2 className="e-text text-title font-semibold leading-[1.15] tracking-[-0.025em] text-balance">
            Votre liste de matériel est vide
          </h2>
          <p className="e-text mt-5 max-w-[54ch] text-body leading-[1.65] text-pretty text-ink-2">
            Un devis, ici, n’est pas une caisse. Ce magasin n’encaisse rien en ligne : le règlement
            se fait au comptoir, à la livraison ou par Mobile Money, contre une facture proforma.
            Cette page est là où vous constituez la liste qui devient cette proforma.
          </p>

          <ol className="mt-9 space-y-5 border-t border-rule pt-8">
            <Step index={1}>
              Vous ajoutez au catalogue les références qui vous intéressent, dans les quantités
              qu’il vous faut.
            </Step>
            <Step index={2}>
              Cette page chiffre la base HT, la TVA de {VAT_LABEL} et le total TTC, puis écrit la
              liste dans un message WhatsApp que vous relisez avant de l’envoyer.
            </Step>
            <Step index={3}>
              Le comptoir vous renvoie la facture proforma, avec les prix confirmés, les délais et
              la livraison.
            </Step>
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Action href="/catalogue">Ouvrir le catalogue</Action>
            {phone ? (
              <a
                href={`tel:${dialable(phone)}`}
                className="t-num flex min-h-11 items-center gap-2.5 text-small text-ink-2 transition-colors duration-[var(--t-fast)] hover:text-secondary"
              >
                <IconPhone className="text-[1rem] text-ink-3" />
                {phone}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="e-item flex gap-5">
      <span className="t-num shrink-0 text-small font-bold text-secondary">{index}</span>
      <span className="max-w-[52ch] text-small leading-[1.65] text-pretty text-ink-2">
        {children}
      </span>
    </li>
  )
}

/**
 * The document, blank.
 *
 * `aria-hidden`, and that is the right call rather than a shortcut: it carries
 * no information the paragraph beside it does not already carry in words, and a
 * screen reader walking eight decorative bars learns nothing. The one word in it
 * that is not decoration, the unpriced total, is repeated in step two.
 */
function BlankProforma() {
  /* Four rows of unequal length, so it reads as a filled-in list rather than as
     a loading skeleton, which is what four identical bars would read as. */
  const rows = [78, 56, 88, 64]

  return (
    <div aria-hidden className="e-media mx-auto w-full max-w-[22rem]">
      <div className="overflow-hidden rounded-well border border-rule bg-paper shadow-[var(--shadow-panel)]">
        <div className="flex items-baseline justify-between gap-4 bg-rail px-6 py-4">
          <span className="t-label text-rail-ink">Facture proforma</span>
          <span className="text-micro text-rail-ink-2">NowTech Center</span>
        </div>

        <div className="px-6">
          {rows.map((width, index) => (
            <div key={width} className="flex items-center gap-4 border-b border-rule py-4">
              <span className="t-num w-4 shrink-0 text-micro text-secondary">{index + 1}</span>
              <span className="h-2 rounded-pill bg-space" style={{ width: `${width}%` }} />
              <span className="ml-auto h-2 w-12 shrink-0 rounded-pill bg-space-2" />
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-between gap-4 px-6 py-5">
          <span className="text-micro font-semibold text-ink-2">Total TTC</span>
          <span className="text-micro text-ink-3">à chiffrer</span>
        </div>
      </div>
    </div>
  )
}
