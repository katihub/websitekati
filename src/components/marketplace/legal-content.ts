export type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] }
export type LegalPage = { title: string; eyebrow: string; intro: string; sections: LegalSection[] }

export const legalPages = {
  'mentions-legales': {
    title: 'Mentions légales', eyebrow: 'Informations juridiques',
    intro: 'Les informations essentielles sur l’éditeur de la plateforme KatiHub.',
    sections: [
      { title: 'Éditeur du site', paragraphs: ['KatiHub est une plateforme de mise en relation entre acheteurs et boutiques au Cameroun. Les informations d’identification de l’entité exploitante doivent être complétées avant la mise en production de cette page.'], bullets: ['Dénomination sociale et forme juridique : à compléter', 'Adresse du siège social : à compléter', 'Numéro RCCM et numéro d’identifiant unique (NIU) : à compléter', 'Contact officiel : à compléter'] },
      { title: 'Directeur de la publication', paragraphs: ['Nom et qualité du responsable de la publication : à compléter par l’exploitant de KatiHub.'] },
      { title: 'Hébergement', paragraphs: ['Le fournisseur d’hébergement, son adresse et ses coordonnées contractuelles sont à renseigner à partir du contrat d’hébergement effectivement utilisé.'] },
      { title: 'Activité de la plateforme', paragraphs: ['KatiHub présente les offres de boutiques indépendantes et facilite la commande, le paiement et le suivi de la livraison. La boutique qui figure sur une offre demeure identifiée tout au long du parcours d’achat.'] },
      { title: 'Propriété intellectuelle', paragraphs: ['Les textes, visuels, logos et éléments d’interface publiés sur ce site sont protégés. Leur reproduction ou réutilisation nécessite l’autorisation de leurs titulaires, sous réserve des exceptions prévues par la loi. Les vendeurs restent responsables des contenus qu’ils soumettent.'] },
      { title: 'Données et réclamations', paragraphs: ['Les traitements de données sont décrits dans la politique de confidentialité. Pour signaler une erreur, un contenu ou une difficulté liée à une commande, utilisez la page de contact.'] },
      { title: 'Droit applicable', paragraphs: ['L’utilisation de la plateforme et les ventes réalisées au Cameroun relèvent du droit camerounais, sous réserve des dispositions impératives applicables. Une tentative de résolution amiable est privilégiée avant toute procédure.'] },
    ],
  },
  'politique-confidentialite': {
    title: 'Politique de confidentialité', eyebrow: 'Vos données',
    intro: 'Comment les informations confiées à KatiHub sont utilisées dans le parcours client et vendeur.',
    sections: [
      { title: 'Responsable et contact', paragraphs: ['L’entité exploitant KatiHub détermine les traitements nécessaires au fonctionnement de la plateforme. Son identité et son adresse officielle seront précisées dans les mentions légales. Les demandes relatives aux données personnelles peuvent être envoyées depuis la page de contact.'] },
      { title: 'Données concernées', paragraphs: ['Selon votre utilisation, nous pouvons traiter vos nom, coordonnées, identifiants de compte, adresse de livraison, commandes, échanges avec l’assistance et données nécessaires à la vérification d’une boutique. Des données techniques de sécurité et de navigation peuvent également être produites.'] },
      { title: 'Pourquoi ces données sont utilisées', paragraphs: ['Elles servent à créer et sécuriser votre compte, présenter les offres, enregistrer et suivre vos commandes, organiser la livraison, traiter les paiements et répondre à vos demandes. Les données des vendeurs servent aussi à vérifier leur identité et à administrer leurs offres. Les communications promotionnelles nécessitent une démarche ou un accord adapté.'] },
      { title: 'Destinataires', paragraphs: ['Les données utiles à une commande peuvent être communiquées à la boutique concernée, au transporteur choisi et au prestataire de paiement, chacun dans la limite de sa mission. Des prestataires techniques peuvent héberger ou maintenir le service. KatiHub ne revend pas les données personnelles.'] },
      { title: 'Durée de conservation', paragraphs: ['Les données sont conservées pendant la durée nécessaire aux comptes, commandes et obligations applicables, puis supprimées ou archivées selon les délais légaux. Les durées détaillées par catégorie doivent être confirmées par l’exploitant avant publication définitive.'] },
      { title: 'Vos droits et sécurité', paragraphs: ['Vous pouvez demander l’accès, la rectification ou la suppression de vos données, ainsi que vous opposer à certains usages, dans les conditions prévues par la loi. Nous appliquons des mesures de protection adaptées et limitons l’accès aux personnes qui en ont besoin. Pour exercer vos droits, utilisez la page de contact.'] },
      { title: 'Cookies et services tiers', paragraphs: ['Les cookies nécessaires au compte et au panier assurent le fonctionnement du site. Les autres catégories, si elles sont activées, sont détaillées dans la politique de cookies. Certains prestataires peuvent traiter des données hors du Cameroun : leurs lieux de traitement et garanties doivent être confirmés dans la version définitive.'] },
    ],
  },
  cookies: {
    title: 'Politique de cookies', eyebrow: 'Navigation',
    intro: 'Les technologies utilisées pour faire fonctionner KatiHub et les choix disponibles.',
    sections: [
      { title: 'Cookies nécessaires', paragraphs: ['Le site peut utiliser des éléments de session et de stockage local nécessaires à la connexion, au panier et à la sécurité. Leur désactivation dans votre navigateur peut empêcher certaines fonctions de marcher.'] },
      { title: 'Mesure d’audience et publicité', paragraphs: ['Aucun outil de mesure d’audience ou de publicité ne doit être déclaré comme actif sans vérification de sa présence réelle. Si ces outils sont ajoutés, cette page précisera leur fournisseur, leur finalité, leur durée et la manière de donner ou retirer votre accord.'] },
      { title: 'Gérer vos choix', paragraphs: ['Vous pouvez effacer ou bloquer les cookies depuis les réglages de votre navigateur. Les données du panier enregistrées localement peuvent alors disparaître. Pour toute question, contactez KatiHub.'] },
    ],
  },
  conditions: {
    title: 'Conditions d’utilisation', eyebrow: 'Utiliser KatiHub',
    intro: 'Les règles communes aux visiteurs, clients et vendeurs de la plateforme.',
    sections: [
      { title: 'Accès et compte', paragraphs: ['La consultation des offres est ouverte aux visiteurs. Un compte peut être nécessaire pour commander ou gérer une boutique. Vous devez fournir des informations exactes, garder vos accès confidentiels et signaler tout usage non autorisé.'] },
      { title: 'Rôle de KatiHub', paragraphs: ['KatiHub facilite la présentation des offres, la commande et le suivi. Chaque offre indique la boutique vendeuse. Les modalités spécifiques à l’achat figurent dans les conditions générales de vente et celles de la boutique, lorsqu’elles sont communiquées avant validation.'] },
      { title: 'Utilisation loyale', paragraphs: ['Il est interdit de publier des informations trompeuses, de porter atteinte aux droits d’autrui, de contourner les mesures de sécurité ou de perturber le service. KatiHub peut retirer un contenu manifestement illicite et suspendre un compte en cas d’abus, dans le respect des droits applicables.'] },
      { title: 'Disponibilité et évolution', paragraphs: ['Le service peut être modifié ou interrompu temporairement pour maintenance ou incident. Les changements importants de ces conditions seront rendus accessibles sur cette page avec leur date de mise à jour.'] },
      { title: 'Questions et litiges', paragraphs: ['Adressez vos questions à KatiHub via la page de contact. Le droit camerounais s’applique, sans priver les consommateurs des protections impératives qui leur sont reconnues.'] },
    ],
  },
  'conditions-generales-vente': {
    title: 'Conditions générales de vente', eyebrow: 'Acheter en confiance',
    intro: 'Le déroulement d’une commande passée auprès d’une ou plusieurs boutiques sur KatiHub.',
    sections: [
      { title: 'Vendeur et produits', paragraphs: ['Chaque fiche et récapitulatif identifie la boutique qui propose le produit. Le vendeur est responsable de l’exactitude de son offre, de la disponibilité, de la conformité et des garanties qui lui incombent. KatiHub facilite le parcours et l’assistance.'] },
      { title: 'Prix et validation', paragraphs: ['Les prix sont affichés en francs CFA. Le récapitulatif présente les produits, les éventuels frais de livraison et le montant à régler avant confirmation. Prix et stock sont revérifiés au moment de la validation ; une commande peut comprendre plusieurs sous-commandes, une par boutique.'] },
      { title: 'Paiement', paragraphs: ['Le parcours actuellement proposé prévoit un acompte par Orange Money ou MTN Mobile Money après l’enregistrement de la commande, puis un solde à la livraison. Le montant effectivement dû apparaît dans le récapitulatif et sur la page de paiement. Ne communiquez jamais votre code secret à KatiHub.'] },
      { title: 'Livraison', paragraphs: ['La livraison peut être assurée par la boutique ou par KatiHub selon les options affichées pour les articles et la ville choisie. Les frais, zones et délais disponibles sont indiqués avant validation ou confirmés avec la boutique lorsqu’ils ne peuvent être déterminés immédiatement.'] },
      { title: 'Annulation, retour et remboursement', paragraphs: ['Contactez l’assistance dès que possible en indiquant votre référence de commande. Les possibilités de retour, les conditions de remboursement et les garanties dépendent de la nature du produit, de son état, des informations annoncées avant l’achat et des règles impératives applicables. Aucun délai uniforme de rétractation ou de remboursement n’est promis ici.'] },
      { title: 'Réclamation et litige', paragraphs: ['En cas de produit manquant, endommagé ou non conforme, conservez les éléments utiles et signalez le problème via la page de contact. KatiHub aide à transmettre et suivre la réclamation auprès de la boutique concernée. Une résolution amiable est recherchée en priorité.'] },
    ],
  },
  'contrat-vendeurs': {
    title: 'Contrat avec les vendeurs', eyebrow: 'Partenariat KatiHub',
    intro: 'Le cadre de référence public pour les boutiques qui souhaitent vendre sur KatiHub.',
    sections: [
      { title: 'Adhésion et vérification', paragraphs: ['La candidature vendeur comprend l’identité du responsable, les informations de l’entreprise et celles de la boutique. KatiHub peut demander les justificatifs adaptés, notamment NIU et RCCM selon le statut, puis accepter ou refuser l’activation du compte. La soumission d’une candidature ne vaut pas acceptation.'] },
      { title: 'Obligations du vendeur', paragraphs: ['Le vendeur publie des offres exactes, licites et disponibles, indique un prix complet, prépare les commandes, respecte les modalités de livraison annoncées et traite les demandes après-vente. Il est responsable de la conformité des produits et des droits sur ses textes et images.'] },
      { title: 'Commandes et paiement', paragraphs: ['Les commandes sont attribuées à la boutique identifiée lors de l’achat. Les modalités de perception, de reversement, de commission éventuelle et de remboursement doivent être fixées dans un accord commercial individuel avant toute activation de ventes payantes. Aucun taux de commission n’est défini par cette page.'] },
      { title: 'Livraison et incidents', paragraphs: ['La boutique choisit parmi les modes de livraison disponibles pour ses offres. Elle coopère avec KatiHub pour résoudre retard, rupture de stock, retour ou réclamation et fournit les informations nécessaires au suivi du client.'] },
      { title: 'Données et confidentialité', paragraphs: ['Les données clients reçues pour traiter une commande ne peuvent être utilisées que pour cette finalité, sauf autre base valable. Le vendeur les protège, limite les accès et avertit KatiHub de tout incident susceptible de les concerner.'] },
      { title: 'Suspension et fin du partenariat', paragraphs: ['KatiHub peut suspendre une offre ou une boutique en cas de risque sérieux, de fraude ou de manquements répétés, après examen proportionné de la situation. Les commandes en cours et sommes dues restent à régulariser selon l’accord signé et la loi applicable.'] },
      { title: 'Accord à signer', paragraphs: ['Cette page présente les principes du partenariat. Les conditions financières, les niveaux de service, la durée, les signatures et les coordonnées des parties doivent figurer dans un contrat vendeur nominatif avant de produire leurs effets.'] },
    ],
  },
  'livraison-retours': {
    title: 'Livraison et retours', eyebrow: 'Après votre commande',
    intro: 'Retrouvez les étapes de livraison et la marche à suivre si un article pose problème.',
    sections: [
      { title: 'Options de livraison', paragraphs: ['Selon la boutique et le produit, la livraison peut être proposée par le vendeur ou KatiHub. Les villes, les délais annoncés et les frais disponibles apparaissent pendant la commande. Chaque boutique peut préparer son colis séparément.'] },
      { title: 'Suivi de la commande', paragraphs: ['Votre espace commandes affiche la référence et les informations de suivi disponibles. Gardez votre téléphone joignable et vérifiez l’adresse ainsi que le repère transmis au moment de l’achat.'] },
      { title: 'Un problème à la réception ?', paragraphs: ['Signalez rapidement un article manquant, abîmé ou différent de la description. Indiquez la référence, la boutique, le produit concerné et, si possible, des photos. L’assistance vous orientera vers la solution applicable à votre commande.'] },
      { title: 'Retour et remboursement', paragraphs: ['N’expédiez pas un produit avant d’avoir reçu les instructions de retour. Les modalités dépendent du motif, du produit et des protections légales applicables ; le sort de l’acompte et des frais éventuels sera confirmé pour votre dossier.'] },
    ],
  },
  securite: {
    title: 'Sécurité des achats', eyebrow: 'En toute confiance',
    intro: 'Les bons réflexes pour protéger votre compte et vos paiements.',
    sections: [
      { title: 'Protéger votre compte', paragraphs: ['Choisissez un mot de passe unique, ne partagez pas vos codes de connexion et déconnectez-vous sur un appareil partagé. Si vous soupçonnez une activité inhabituelle, contactez l’assistance.'] },
      { title: 'Paiement mobile', paragraphs: ['Validez une demande Orange Money ou MTN Mobile Money uniquement après avoir vérifié le montant et la référence de commande. Votre code secret doit être saisi dans l’environnement de votre opérateur, jamais dans un message adressé à KatiHub ou à un vendeur.'] },
      { title: 'Échanges avec les vendeurs', paragraphs: ['Vérifiez que la boutique et le produit figurent dans votre commande KatiHub. Méfiez-vous des demandes de paiement ou de données personnelles envoyées hors du parcours affiché sur le site. Signalez tout message suspect.'] },
    ],
  },
} satisfies Record<string, LegalPage>

export type LegalSlug = keyof typeof legalPages
