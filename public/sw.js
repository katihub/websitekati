/**
 * LE TRAVAILLEUR DE SERVICE, ET IL EN FAIT LE MOINS POSSIBLE.
 *
 * POURQUOI IL EXISTE. Un navigateur ne propose « installer » que si le site
 * en déclare un : c'est la condition, avec le manifeste, que Chrome et Edge
 * exigent avant d'émettre `beforeinstallprompt`. Sans ce fichier, le bouton
 * d'installation n'apparaîtrait jamais, quoi qu'on écrive autour.
 *
 * POURQUOI IL NE MET PRESQUE RIEN EN CACHE. Ce catalogue affiche des PRIX et
 * des DISPONIBILITÉS. Une page servie depuis un cache est une page qui peut
 * annoncer 40 000 FCFA sur un article passé à 52 000, ou « en stock » sur le
 * dernier exemplaire vendu ce matin. Sur une boutique, un cache trop zélé ne
 * fait pas gagner du temps : il fait perdre une vente et la confiance qui va
 * avec. Le réseau reste donc la source, toujours.
 *
 * CE QU'IL GARDE QUAND MÊME : la page hors-ligne, et seulement elle. Quand la
 * connexion tombe — ce qui arrive — une navigation rend une page de la maison
 * qui dit ce qui se passe et donne le numéro du comptoir, au lieu du dinosaure
 * du navigateur. Les requêtes non-navigation échouent normalement : c'est au
 * code de la page de les rattraper, il sait le faire.
 */

const CACHE = 'nowtech-coquille-v1'
const HORS_LIGNE = '/hors-ligne'

/**
 * GARDER LA PAGE HORS-LIGNE, MAIS SEULEMENT ENTIÈRE.
 *
 * L'en-tête et le pied de page de /hors-ligne listent les rayons, lus au
 * backend. Pendant une panne, le serveur rend la page sans eux et le dit sur
 * `<body data-habillage="incomplet">`. Gardée à ce moment-là, cette copie
 * serait restée celle du téléphone jusqu'au prochain changement de version de
 * ce fichier : constaté, 0 lien /rayon/ au lieu de 14 dans la version
 * régénérée pendant une panne. Une copie incomplète est donc refusée, et la
 * page est redemandée à la navigation suivante qui réussit.
 */
function garderHorsLigne() {
  return caches.open(CACHE).then((cache) =>
    cache.match(HORS_LIGNE).then((deja) => {
      if (deja) return undefined
      return fetch(HORS_LIGNE, { cache: 'no-store' }).then((reponse) => {
        if (!reponse.ok) return undefined
        return reponse
          .clone()
          .text()
          .then((html) =>
            html.includes('data-habillage="incomplet"') ? undefined : cache.put(HORS_LIGNE, reponse),
          )
      })
    }),
  )
}

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(
    garderHorsLigne()
      // Un échec de pré-cache ne doit pas empêcher l'installation : le service
      // worker sert d'abord à rendre le site installable.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request

  /* SEULES LES NAVIGATIONS SONT INTERCEPTÉES, et uniquement pour leur offrir
     un repli. Tout le reste — API, images, scripts — passe au réseau sans que
     ce fichier s'en mêle : intercepter une requête pour la relayer telle
     quelle n'ajoute qu'une latence et un point de panne. */
  if (requete.mode !== 'navigate') return

  const reseau = fetch(requete)

  // La copie a pu être refusée à l'installation : dès que le réseau répond de
  // nouveau, c'est le moment de la reprendre. Sans effet quand elle y est.
  evenement.waitUntil(reseau.then(() => garderHorsLigne()).catch(() => undefined))

  evenement.respondWith(
    reseau.catch(() =>
      caches.match(HORS_LIGNE).then((repli) =>
        repli ??
        new Response(
          '<!doctype html><meta charset="utf-8"><title>Hors ligne</title>' +
            '<p style="font:16px system-ui;padding:2rem">Vous êtes hors ligne. ' +
            'Reconnectez-vous, puis rechargez la page.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
        ),
      ),
    ),
  )
})
