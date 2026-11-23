import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/layout/PageHeader'
import { CONTACT_MARKETPLACE, SUPPORT_WHATSAPP, lienTelephone } from '@/constants/contact-marketplace'

export const metadata: Metadata = {
  title: 'Suppression du compte KatiMarket',
  description:
    'Demandez la suppression de votre compte KatiMarket et consultez les données supprimées ou conservées pour respecter les obligations légales.',
}

const message = encodeURIComponent(
  'Bonjour KatiMarket, je souhaite demander la suppression de mon compte et des données associées. Merci de m’indiquer la procédure de vérification.',
)
const whatsapp = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${message}`

const donneesSupprimees = [
  'le profil du compte et les coordonnées qui ne sont plus nécessaires ;',
  'les adresses de livraison enregistrées, favoris et préférences ;',
  'les jetons de notification et autres rattachements de l’appareil ;',
  'les contenus et échanges qui ne doivent pas être conservés pour traiter un dossier en cours ;',
  'les autres données du compte sans obligation légale de conservation.',
]

const donneesConservees = [
  'les factures, écritures et pièces justificatives liées aux commandes et paiements, pendant une durée pouvant aller jusqu’à dix ans ;',
  'les éléments nécessaires au règlement d’une commande, d’un retour, d’un remboursement ou d’un litige encore ouvert ;',
  'les traces strictement nécessaires à la prévention de la fraude, à la sécurité et à la défense de droits en justice, pendant la durée applicable.',
]

export default function SuppressionComptePage() {
  return (
    <>
      <PageHeader
        title="Supprimer votre compte KatiMarket"
        lead="Cette page permet aux utilisateurs du site et de l’application KatiMarket de demander la suppression de leur compte et des données associées."
      />

      <main className="shell pb-band">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)] lg:items-start">
          <div>
            <p className="t-label text-secondary">Comment faire la demande</p>
            <h2 className="mt-2 text-h3 font-semibold text-ink">Contactez directement l’équipe KatiMarket</h2>
            <ol className="mt-5 grid gap-4 text-body leading-relaxed text-ink-2">
              <li className="flex gap-4"><strong className="t-num text-secondary">1.</strong><span>Utilisez le bouton WhatsApp ci-dessous ou appelez KatiMarket depuis le numéro associé à votre compte, si possible.</span></li>
              <li className="flex gap-4"><strong className="t-num text-secondary">2.</strong><span>Indiquez l’adresse e-mail ou le numéro de téléphone du compte à supprimer. Ne transmettez jamais votre mot de passe, votre code OTP ou votre code Mobile Money.</span></li>
              <li className="flex gap-4"><strong className="t-num text-secondary">3.</strong><span>L’équipe vérifie que vous êtes bien titulaire du compte et vous informe si une commande, un remboursement ou un litige doit d’abord être clôturé.</span></li>
              <li className="flex gap-4"><strong className="t-num text-secondary">4.</strong><span>Vous recevez une confirmation lorsque la suppression ou l’anonymisation des données concernées est terminée.</span></li>
            </ol>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-secondary px-6 text-small font-bold text-on-surface transition-transform hover:-translate-y-0.5"
              >
                Demander la suppression sur WhatsApp
              </a>
              <a
                href={lienTelephone(CONTACT_MARKETPLACE.telephones[0])}
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-rule-2 px-6 text-small font-bold text-ink transition-colors hover:border-secondary"
              >
                Appeler {CONTACT_MARKETPLACE.telephones[0]}
              </a>
            </div>
            <p className="mt-4 text-small leading-relaxed text-ink-3">
              Si vous n’avez plus accès au téléphone ou à l’adresse du compte, expliquez-le à l’équipe. Des informations complémentaires pourront être demandées uniquement pour vérifier votre identité.
            </p>
          </div>

          <aside className="rounded-well border border-rule bg-space p-5 md:p-7" aria-labelledby="avant-demande">
            <h2 id="avant-demande" className="text-h4 font-semibold text-ink">Avant de demander</h2>
            <p className="mt-3 text-small leading-relaxed text-ink-2">
              La suppression du compte est définitive. Vous ne pourrez plus retrouver vos favoris, adresses, notifications ni informations de compte.
            </p>
            <p className="mt-3 text-small leading-relaxed text-ink-2">
              Téléchargez auparavant les factures ou reçus dont vous avez besoin et vérifiez qu’aucune commande, demande de retour ou opération de paiement n’est en cours.
            </p>
          </aside>
        </section>

        <section className="mt-band grid gap-8 border-t border-rule pt-8 md:grid-cols-2" aria-labelledby="sort-donnees">
          <div>
            <p className="t-label text-primary">Données supprimées ou anonymisées</p>
            <h2 id="sort-donnees" className="mt-2 text-h3 font-semibold text-ink">Ce qui disparaît avec le compte</h2>
            <ul className="mt-5 grid gap-3 text-small leading-relaxed text-ink-2">
              {donneesSupprimees.map((donnee) => <li key={donnee} className="flex gap-3"><span aria-hidden="true" className="text-secondary">✓</span><span>{donnee}</span></li>)}
            </ul>
          </div>
          <div>
            <p className="t-label text-ink-3">Conservation limitée</p>
            <h2 className="mt-2 text-h3 font-semibold text-ink">Ce qui peut être conservé</h2>
            <ul className="mt-5 grid gap-3 text-small leading-relaxed text-ink-2">
              {donneesConservees.map((donnee) => <li key={donnee} className="flex gap-3"><span aria-hidden="true" className="text-secondary">—</span><span>{donnee}</span></li>)}
            </ul>
            <p className="mt-5 text-small leading-relaxed text-ink-3">
              Ces données restent isolées, accessibles aux seules personnes autorisées et ne sont pas utilisées à des fins commerciales. Elles sont supprimées ou anonymisées à l’expiration de leur durée de conservation.
            </p>
          </div>
        </section>

        <section className="mt-band border-t border-rule pt-8">
          <h2 className="text-h4 font-semibold text-ink">Besoin de comprendre avant de décider ?</h2>
          <p className="mt-2 max-w-3xl text-small leading-relaxed text-ink-2">
            Consultez la politique de confidentialité pour connaître les données utilisées par KatiMarket, leurs finalités et leurs destinataires.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small font-semibold">
            <Link href="/politique-confidentialite" className="text-primary underline underline-offset-4">Politique de confidentialité</Link>
            <Link href="/contact" className="text-primary underline underline-offset-4">Autres moyens de contact</Link>
          </div>
        </section>
      </main>
    </>
  )
}
