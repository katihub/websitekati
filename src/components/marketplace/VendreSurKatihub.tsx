import Image from 'next/image'
import Link from 'next/link'

import styles from './marketplace-cta.module.css'

/**
 * « VENDEZ SUR KATIMARKET » : l'appel aux marchands, en bas de l'accueil.
 *
 * Chaque argument decrit un service reel de la marketplace (Kati Express, retrait
 * en boutique, paiement Mobile Money, devis entreprises) : aucun chiffre ni
 * tarif n'y est promis. Les quatre etapes sont celles de l'inscription vendeur.
 */

const ATOUTS = [
  { icone: '🏪', titre: 'Votre boutique en ligne', texte: 'Vos produits, vos prix et votre stock, en quelques minutes.' },
  { icone: '🛵', titre: 'Livrée partout', texte: 'Kati Express, votre propre livraison, le retrait ou l’agence.' },
  { icone: '📱', titre: 'Payé par Mobile Money', texte: 'Orange Money et MTN MoMo, versements suivis dans votre espace.' },
  { icone: '🤝', titre: 'Des clients pros', texte: 'Recevez des demandes de devis d’entreprises.' },
] as const

const ETAPES = ['Inscrivez votre boutique', 'KatiMarket vérifie votre dossier', 'Publiez vos offres', 'Vendez et encaissez'] as const

export function VendreSurKatihub() {
  return <section className={styles.vendre} aria-labelledby="vendre-titre">
    <div className={styles.vendreTexte}>
      <span className={styles.etiquette}>Espace vendeur</span>
      <h2 id="vendre-titre">Vendez sur <strong>KatiMarket</strong>,<br />touchez tout le Cameroun</h2>
      <p>Rejoignez les boutiques locales qui développent leur activité en ligne : KatiMarket s’occupe de la vitrine, du paiement et de la livraison, vous vous occupez de vos produits.</p>
      <ul className={styles.atouts}>
        {ATOUTS.map((atout) => <li key={atout.titre}><i aria-hidden="true">{atout.icone}</i><div><b>{atout.titre}</b><small>{atout.texte}</small></div></li>)}
      </ul>
      <div className={styles.actions}>
        <Link href="/devenir-vendeur" className={styles.principal}>Créer ma boutique<span aria-hidden="true">→</span></Link>
        <Link href="/espace-vendeur" className={styles.secondaire}>J’ai déjà une boutique</Link>
      </div>
    </div>
    <div className={styles.vendreVisuel}>
      <Image src="/home-vendre-entrepreneurs.png" alt="Deux entrepreneurs camerounais préparent leurs commandes en boutique" fill sizes="(max-width: 900px) 100vw, 45vw" />
      <span className={`${styles.badge} ${styles.badgeHaut}`}><i aria-hidden="true">✓</i>Boutique vérifiée par KatiMarket</span>
      <span className={`${styles.badge} ${styles.badgeBas}`}><i aria-hidden="true">🛵</i>Kati Express livre vos clients</span>
    </div>
    <ol className={styles.etapes} aria-label="Ouvrir sa boutique en quatre étapes">
      {ETAPES.map((etape, index) => <li key={etape}><span>{index + 1}</span>{etape}</li>)}
    </ol>
  </section>
}

/** La lettre d'information : l'adresse saisie ouvre l'inscription, deja remplie. */
export function NewsletterKatihub() {
  return <section className={styles.lettre} aria-labelledby="lettre-titre">
    <span className={styles.lettreIcone} aria-hidden="true">✉</span>
    <div className={styles.lettreTexte}>
      <h2 id="lettre-titre">Ne ratez aucune bonne affaire</h2>
      <p>Les nouveautés des boutiques, les promotions et les avantages KatiMarket, directement dans votre boîte e-mail.</p>
      <ul><li>Nouvelles boutiques</li><li>Promotions</li><li>Points KATI</li></ul>
    </div>
    <form action="/inscription" method="get" className={styles.lettreFormulaire}>
      <label className="sr-only" htmlFor="newsletter-email">Votre adresse e-mail</label>
      <input id="newsletter-email" name="email" type="email" autoComplete="email" required placeholder="Votre adresse e-mail" />
      <button type="submit">S’inscrire<span aria-hidden="true">→</span></button>
      <small>Pas de spam : un e-mail de temps en temps, désinscription en un clic.</small>
    </form>
  </section>
}
