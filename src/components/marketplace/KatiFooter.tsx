import Link from 'next/link'
import { KatiLogo } from './KatiLogo'
import styles from './marketplace-shell-v2.module.css'

export function KatiFooter() {
  return (
    <footer className={styles.footer} data-marketplace-footer>
      <div className={`${styles.shell} ${styles.footerGrid}`}>
        <div><KatiLogo footer /><p>Votre marketplace de confiance au Cameroun. Des produits utiles, des vendeurs locaux vérifiés et une livraison suivie.</p><span className={styles.socials}>f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</span></div>
        <div><h2>Acheter sur KatiMarket</h2><Link href="/catalogue">Toutes les catégories</Link><Link href="/catalogue">Meilleures ventes</Link><Link href="/boutiques">Boutiques recommandées</Link><Link href="/livraison-retours">Livraison et retours</Link></div>
        <div><h2>Vendre sur KatiMarket</h2><Link href="/devenir-vendeur">Créer une boutique</Link><Link href="/espace-vendeur">Espace vendeur</Link><Link href="/contact">Centre d’aide vendeurs</Link><Link href="/contrat-vendeurs">Contrat avec les vendeurs</Link></div>
        <div><h2>Aide & informations</h2><Link href="/compte/commandes">Suivi de commande</Link><Link href="/compte/devis">Mes devis</Link><Link href="/compte/favoris">Mes favoris</Link><Link href="/contact">Nous contacter</Link><Link href="/a-propos">À propos de KatiMarket</Link><Link href="/securite">Sécurité des achats</Link></div>
        <div><h2>Informations légales</h2><Link href="/mentions-legales">Mentions légales</Link><Link href="/politique-confidentialite">Politique de confidentialité</Link><Link href="/conditions-generales-vente">Conditions générales de vente</Link><Link href="/conditions">Conditions d’utilisation</Link><Link href="/cookies">Politique de cookies</Link></div>
      </div>
      <div className={`${styles.shell} ${styles.legal}`}><span>© 2026 KatiMarket Cameroun. Tous droits réservés.</span><nav aria-label="Liens légaux du pied de page"><Link href="/mentions-legales">Mentions légales</Link><Link href="/politique-confidentialite">Confidentialité</Link><Link href="/conditions-generales-vente">Conditions de vente</Link><Link href="/contrat-vendeurs">Vendeurs</Link></nav></div>
    </footer>
  )
}
