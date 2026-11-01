import type { Metadata } from 'next'
import Link from 'next/link'

import { OuvrirKati } from '@/components/assistant/OuvrirKati'
import { PageHeader } from '@/components/layout/PageHeader'
import { lireConditionsServices, type ConditionsServices } from '@/lib/marketplace-data'

export const metadata: Metadata = {
  title: 'Nos services',
  description:
    'Ce que KatiMarket ajoute à votre achat, quelle que soit la boutique : livraison Kati Express ou retrait gratuit, ' +
    'paiement mobile money ou en plusieurs fois, assurance et installation, devis entreprise, points KATI et assistance.',
}

/**
 * `/services`, LES SERVICES DE LA MARKETPLACE, PAS CEUX D'UNE BOUTIQUE.
 *
 * La page etait celle de l'atelier NowTech, reprise de l'ancien site : ses
 * prestations (videosurveillance, reseau, solaire) et un devis par WhatsApp.
 * Sur KatiMarket, ce que vend une boutique est au catalogue ; ici, ce que
 * KatiMarket ajoute a chaque achat.
 *
 * RIEN N'EST INVENTE. Chaque service existe dans le parcours du site, et chaque
 * phrase reprend ce que la FAQ, le paiement ou le carrousel des avantages en
 * disent deja. Les chiffres que la direction regle (taux de l'assurance, gains
 * KATI et parrainage) sont lus au backend ; s'il ne repond pas, la phrase reste
 * et le chiffre disparait. L'assurance n'est presentee que si elle est active.
 */
type Service = { titre: string; texte: string; href?: string; action?: string }
type Rubrique = { id: string; titre: string; intro: string; services: Service[] }

const pourcent = (bps: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(bps / 100)} %`

function rubriques({ assurance, kati }: ConditionsServices): Rubrique[] {
  const protection: Service[] = [
    ...(assurance?.active && assurance.tauxBps > 0 ? [{
      titre: 'Assurance KATI',
      texte: `${pourcent(assurance.tauxBps)} du montant des produits, facultative : cochez-la au moment du paiement pour protéger votre commande.`,
    }] : []),
    {
      titre: 'Installation par KatiMarket',
      texte: 'Pour certaines catégories, un technicien KatiMarket installe vos produits après la livraison, à prix fixe par commande. L’option apparaît au paiement quand vos articles y ont droit.',
    },
    {
      titre: 'Une garantie sur chaque produit',
      texte: 'La garantie de la boutique figure sur chaque fiche, et KatiMarket fixe en plus une garantie minimale par catégorie que chaque boutique doit respecter.',
      href: '/livraison-retours', action: 'Livraison et retours',
    },
    {
      titre: 'Des boutiques vérifiées',
      texte: 'Une boutique ne vend qu’après vérification par KatiMarket, et elle reste identifiée tout au long de votre achat.',
      href: '/boutiques', action: 'Voir les boutiques',
    },
  ]

  return [
    {
      id: 'livraison',
      titre: 'Livraison',
      intro: 'Chaque boutique choisit ses modes de livraison : ceux disponibles pour vos articles et votre ville s’affichent pendant la commande, avec leurs frais.',
      services: [
        { titre: 'Kati Express', texte: 'Un livreur KatiMarket vous apporte la commande à domicile. Vous la recevez contre un code personnel : personne d’autre ne la récupère.' },
        { titre: 'Livraison par la boutique', texte: 'La boutique vous livre avec ses propres livreurs.' },
        { titre: 'Retrait gratuit en boutique', texte: 'Passez chercher la commande quand elle est prête : la boutique vous envoie un code de retrait valable 7 jours. Aucun frais de livraison.' },
        { titre: 'Expédition en agence', texte: 'La boutique dépose le colis à l’agence de voyage de votre choix. Les frais représentent 10 % de la valeur de la commande, et tout se règle à la commande.', href: '/livraison-retours', action: 'Livraison et retours' },
      ],
    },
    {
      id: 'paiement',
      titre: 'Paiement',
      intro: 'Vous payez par Orange Money ou MTN Mobile Money, sur le site, après avoir vérifié le montant et la référence de la commande.',
      services: [
        { titre: 'Acompte ou paiement complet', texte: 'Réglez un acompte à la commande et le solde à la livraison, ou payez tout en une fois. Le montant exact figure dans le récapitulatif.', href: '/securite', action: 'Payer en sécurité' },
        { titre: 'Payer en plusieurs fois', texte: 'Sur certains produits, payez à votre rythme jusqu’à une échéance. Le prix est figé à l’ouverture, le produit est réservé dès la moitié versée et livré une fois payé : ce n’est pas un crédit.', href: '/compte/paiements-plusieurs-fois', action: 'Mes paiements en plusieurs fois' },
      ],
    },
    {
      id: 'protection',
      titre: 'Protection et installation',
      intro: 'Des options au moment du paiement, et des garanties qui ne dépendent pas de la boutique choisie.',
      services: protection,
    },
    {
      id: 'entreprises',
      titre: 'Entreprises',
      intro: 'Pour une quantité entreprise ou un projet, un prix confirmé par les boutiques avant de commander.',
      services: [
        { titre: 'Devis multi-boutiques', texte: 'Demandez un devis depuis une fiche produit ou depuis votre panier : chaque boutique confirme les quantités et son délai. Vous comparez, téléchargez le PDF à votre nom et acceptez en ligne.', href: '/compte/devis', action: 'Mes devis' },
      ],
    },
    {
      id: 'kati',
      titre: 'Points KATI',
      intro: 'Le programme de fidélité de KatiMarket, valable dans toutes les boutiques.',
      services: [
        {
          titre: 'Des KATI à chaque achat',
          texte: kati
            ? `Vos commandes livrées vous rapportent ${pourcent(kati.gainClientBps)} en KATI, disponibles ${kati.liberationApresLivraisonJours} jours après la livraison. Ils paient une partie de la commande suivante.`
            : 'Vos commandes livrées vous rapportent des points KATI, qui paient une partie de la commande suivante.',
          href: '/compte/kati', action: 'Voir mes KATI',
        },
        {
          titre: 'Parrainage',
          texte: kati
            ? `Invitez un proche avec votre code KATI : ses achats vous rapportent ${pourcent(kati.commissionParrainBps)} en KATI pendant ${kati.parrainageDureeMois} mois.`
            : 'Invitez un proche avec votre code KATI : ses achats vous rapportent aussi des KATI.',
          href: '/compte/kati', action: 'Mon code KATI',
        },
        { titre: 'Transfert entre proches', texte: 'Envoyez des KATI disponibles à un proche inscrit, avec son code KATI.' },
      ],
    },
  ]
}

export default async function ServicesPage() {
  const sections = rubriques(await lireConditionsServices())
  const lien = 'inline-flex min-h-11 items-center text-small font-semibold text-secondary underline underline-offset-4 sm:min-h-0'

  return (
    <>
      <PageHeader
        title="Nos services"
        lead="Ce que KatiMarket ajoute à votre achat, quelle que soit la boutique : la livraison, le paiement, la protection de votre commande et l’accompagnement, avant comme après."
      />

      <nav aria-label="Rubriques des services" className="shell">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className={lien}>{section.titre}</a></li>)}
          <li><a href="#aide" className={lien}>Aide</a></li>
        </ul>
      </nav>

      {sections.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`titre-${section.id}`} className="shell mt-band scroll-mt-24">
          <h2 id={`titre-${section.id}`} className="t-label mb-2 text-ink-3">{section.titre}</h2>
          <p className="mb-6 max-w-[64ch] text-small leading-[1.6] text-ink-2">{section.intro}</p>
          <ul className="grid gap-x-14 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {section.services.map((service) => (
              <li key={service.titre}>
                <p className="mb-2 text-body font-semibold">{service.titre}</p>
                <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">{service.texte}</p>
                {service.href ? <Link href={service.href} className={`mt-2 ${lien}`}>{service.action}</Link> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section id="aide" aria-labelledby="titre-aide" className="shell mt-band scroll-mt-24 pb-band">
        <h2 id="titre-aide" className="t-label mb-6 text-ink-3">Aide</h2>
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-3">
          <div>
            <p className="mb-2 text-body font-semibold">Kati, l’assistante</p>
            <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
              Elle répond à toute heure : trouver un produit, la livraison, le paiement ou la garantie, un dépannage. Si elle ne peut pas répondre, elle transmet à un conseiller.
            </p>
            <OuvrirKati className="mt-4 min-h-11 rounded-control bg-secondary px-5 text-small font-bold text-on-surface">Écrire à Kati</OuvrirKati>
          </div>
          <div>
            <p className="mb-2 text-body font-semibold">Une demande sur une commande</p>
            <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
              Un article manquant, abîmé ou différent ? Ouvrez une demande rattachée à la commande et à la boutique, avec des photos : nous suivons la réclamation auprès de la boutique.
            </p>
            <Link href="/compte/assistance" className={`mt-2 ${lien}`}>Mes demandes</Link>
          </div>
          <div>
            <p className="mb-2 text-body font-semibold">Vous êtes une boutique</p>
            <p className="max-w-[46ch] text-small leading-[1.6] text-ink-2">
              Vendez sur KatiMarket et profitez de ces services pour vos clients : Kati Express, paiement mobile money, devis entreprise.
            </p>
            <Link href="/devenir-vendeur" className={`mt-2 ${lien}`}>Devenir vendeur</Link>
          </div>
        </div>
      </section>
    </>
  )
}
