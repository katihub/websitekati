'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { BlocConditions } from '@/components/commande/Conditions'
import { normalisePhone, useAccount } from '@/lib/account'
import type { Conditions } from '@/lib/catalogue-en-direct'
import { counterLandmark, findCounter } from '@/lib/comptoirs'
import { ErreurApi, api, apiDisponible } from '@/lib/api'
import {
  type Commande,
  type ModePaiement,
  type ModeRemise,
  libellePaiement,
  paiementEnLigneDu,
} from '@/lib/commandes'
import { type CartLine, useCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { enregistrerFiche, lireProfilServeur, type ReponseProfil } from '@/lib/profil'
import { useSession } from '@/lib/session'
import { lienCommande, memoriserSuivi } from '@/lib/suivi'
import { libelleMotif, useVerification } from '@/lib/verification'
import type { PointDeVente } from '@/types/catalogue'

/** Une adresse enregistrée, telle que `GET /profil` la rend. */
interface Adresse {
  id: string
  mode: ModeRemise
  ville: string
  quartier: string | null
  repere: string | null
  telephoneDestinataire: string | null
}

/** Les paiements proposés dépendent de la façon dont on récupère la commande. */
const PAIEMENTS_PAR_REMISE: Record<ModeRemise, ModePaiement[]> = {
  retrait: ['especes_comptoir', 'mobile_plateforme'],
  domicile: ['especes_livraison', 'mobile_livraison', 'mobile_plateforme'],
  agence: ['mobile_plateforme'],
}

/**
 * LA REGLE DE CHAQUE MODE DE REMISE, DITE AU MOMENT DE CHOISIR.
 *
 * Resumee de la fiche « Livraison et expedition » que la maison a ecrite dans
 * sa base de connaissances ; le texte entier est plus bas, dans les conditions,
 * tel que le panel le porte. Si la maison change sa regle, c'est la fiche qui
 * fait foi et ces trois lignes qu'il faut relire.
 */
const REGLES_REMISE: Record<ModeRemise, string> = {
  retrait:
    'Gratuit. Votre commande vous attend 7 jours au comptoir choisi ; on vous appelle dès qu’elle est prête.',
  domicile:
    'Douala et Yaoundé uniquement. Les frais dépendent des articles et de l’adresse ; ils vous sont confirmés avant la livraison.',
  agence:
    'Pour les autres villes : envoi par l’agence de voyage de votre choix, 8 à 72 h selon le trajet. Le reçu d’envoi vous est transmis.',
}

/** L'adresse d'un client sans compte : tapee ici, figee sur la commande, gardee nulle part ailleurs. */
interface AdresseSaisie {
  ville: string
  quartier: string
  repere: string
  telephone: string
}

const ADRESSE_VIDE: AdresseSaisie = { ville: '', quartier: '', repere: '', telephone: '' }

/** Le moment du paiement découle du mode : en ligne = maintenant, sinon à la remise. */
function momentDe(mode: ModePaiement): 'maintenant' | 'a_la_livraison' {
  return mode === 'mobile_plateforme' ? 'maintenant' : 'a_la_livraison'
}

export function ValiderCommande({
  pointsVente,
  conditions,
}: {
  pointsVente: readonly PointDeVente[]
  conditions: Conditions
}) {
  const router = useRouter()
  const { lines, setQty, remove, vider } = useCart()
  const { session, chargement } = useSession()
  const { account, openPourCommande } = useAccount()
  const verif = useVerification(lines)

  const [remise, setRemise] = useState<ModeRemise>('retrait')
  /* Le comptoir de la fiche seulement s'il est encore publié : une fiche écrite
     avant la fermeture d'un comptoir enverrait sinon une commande vers une clé
     que le panel ne connaît plus, sans qu'aucune case ne paraisse cochée. */
  const [comptoir, setComptoir] = useState<string>(
    (account && findCounter(account.counter, pointsVente)?.key) ?? pointsVente[0]?.key ?? '',
  )
  const [paiementChoisi, setPaiementChoisi] = useState<ModePaiement>('especes_comptoir')
  const [adresses, setAdresses] = useState<Adresse[] | null>(null)
  const [adresseId, setAdresseId] = useState<string>('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const cle = useRef(idempotence())

  /* LA FICHE DU SERVEUR, POUR SAVOIR CE QUI MANQUE. `undefined` tant qu'elle
     n'est pas lue. Une fiche nee de l'inscription en une etape n'a pas de nom :
     la commande le demande, et le backend l'enregistre sur la fiche. Sans
     fiche du tout — un compte d'avant l'inscription en une etape —, la commande
     demande aussi le telephone. */
  const [profil, setProfil] = useState<ReponseProfil | null | undefined>(undefined)
  const [nom, setNom] = useState(account?.name ?? '')
  const [telephone, setTelephone] = useState(account?.phone ?? '')
  const ficheManquante = profil !== undefined && !profil?.profil
  const nomManquant = profil !== undefined && !profil?.profil?.nom

  /* SANS COMPTE, LA COMMANDE PORTE TOUT : nom, mobile, et l'adresse hors
     retrait. Le courriel est facultatif — il recoit le lien de suivi. */
  const [courriel, setCourriel] = useState('')
  const [adresseSaisie, setAdresseSaisie] = useState<AdresseSaisie>(ADRESSE_VIDE)

  // Le paiement est CONTRAINT par la remise, et la contrainte se lit au rendu :
  // si le choix courant n'est plus permis, c'est le premier permis qui vaut.
  // Corriger cela depuis un effet déclencherait un rendu en cascade, que le
  // dépôt interdit.
  const permis = PAIEMENTS_PAR_REMISE[remise]
  const paiement = permis.includes(paiementChoisi) ? paiementChoisi : permis[0]!
  const setPaiement = setPaiementChoisi

  // La fiche et les adresses arrivent par la meme lecture, une fois par session.
  useEffect(() => {
    if (!session) return
    let vivant = true
    void lireProfilServeur().then((r) => {
      if (!vivant) return
      setProfil(r)
      const liste = (r?.adresses ?? []) as Adresse[]
      setAdresses(liste)
      const parDefaut = liste[0]
      if (parDefaut) setAdresseId((id) => id || parDefaut.id)
    })
    return () => {
      vivant = false
    }
  }, [session])

  const total = verif.reponse?.totaux.ttc ?? null
  const bloque = verif.indisponibles.length > 0

  if (!apiDisponible) {
    return <Encadre>La commande en ligne n’est pas encore ouverte sur cette boutique.</Encadre>
  }

  if (chargement) {
    return (
      <p className="text-small text-ink-3" role="status">
        Chargement…
      </p>
    )
  }

  /* SANS SESSION, ON COMMANDE QUAND MEME. La page demandait de se connecter et
     renvoyait sinon au devis WhatsApp : decision du 5 octobre, une personne
     sans compte commande ici, en donnant ce que sa fiche aurait porte. */
  const invite = !session

  if (lines.length === 0) {
    return (
      <Encadre>
        <p className="text-small text-ink">Votre panier est vide.</p>
        <Link href="/" className="mt-3 inline-flex text-micro text-secondary underline underline-offset-2">
          Parcourir le catalogue
        </Link>
      </Encadre>
    )
  }

  const soumettreSansCompte = async () => {
    if (envoi || total === null) return
    if (nom.trim().length < 2) {
      setErreur('Indiquez le nom qui doit figurer sur la commande.')
      return
    }
    const mobile = normalisePhone(telephone)
    if (!mobile) {
      setErreur('Indiquez un mobile camerounais : neuf chiffres commençant par 6.')
      return
    }
    if (remise === 'retrait' && !comptoir) {
      setErreur('Choisissez le comptoir de retrait.')
      return
    }
    if (remise !== 'retrait' && (!adresseSaisie.ville.trim() || !adresseSaisie.quartier.trim())) {
      setErreur('La ville et le quartier sont nécessaires pour livrer.')
      return
    }
    setEnvoi(true)
    setErreur(null)

    const corps = {
      lignes: lines.map((l) => ({ slug: l.slug, quantite: l.qty })),
      totalAttendu: total,
      modePaiement: paiement,
      momentPaiement: momentDe(paiement),
      modeRemise: remise,
      nom: nom.trim(),
      telephone: mobile,
      ...(courriel.trim() ? { courriel: courriel.trim() } : {}),
      ...(remise === 'retrait'
        ? { comptoir }
        : {
            adresse: {
              ville: adresseSaisie.ville.trim(),
              quartier: adresseSaisie.quartier.trim(),
              ...(adresseSaisie.repere.trim() ? { repere: adresseSaisie.repere.trim() } : {}),
              ...(adresseSaisie.telephone.trim()
                ? { telephoneDestinataire: adresseSaisie.telephone.trim() }
                : {}),
            },
          }),
    }

    try {
      const { commande, jeton } = await api<{ commande: Commande; jeton: string }>(
        '/commandes/sans-compte',
        { methode: 'POST', corps, anonyme: true },
      )
      /* LA CLE D'ABORD, LE PANIER ENSUITE. Le jeton est la seule cle de cette
         commande : garde dans ce navigateur avant toute autre chose, il survit
         a une navigation qui echouerait. */
      memoriserSuivi(commande.reference, jeton)
      vider()
      router.push(
        lienCommande(commande.reference, jeton, paiementEnLigneDu(commande) ? '/paiement' : ''),
      )
    } catch (e) {
      setEnvoi(false)
      setErreur(messageErreur(e))
    }
  }

  const soumettre = async () => {
    if (invite) return soumettreSansCompte()
    if (envoi || total === null) return
    if (remise !== 'retrait' && !adresseId) {
      setErreur('Choisissez une adresse de livraison.')
      return
    }
    if (nomManquant && nom.trim().length < 2) {
      setErreur('Indiquez le nom qui doit figurer sur la commande.')
      return
    }
    const telephoneNormalise = ficheManquante ? normalisePhone(telephone) : null
    if (ficheManquante && !telephoneNormalise) {
      setErreur('Indiquez un mobile camerounais : neuf chiffres commençant par 6.')
      return
    }
    setEnvoi(true)
    setErreur(null)

    /* SANS FICHE DU TOUT, on la cree d'abord : le backend refuse une commande
       sans telephone connu. Le nom part aussi, pour ne pas le redemander. */
    if (ficheManquante && telephoneNormalise) {
      const creee = await enregistrerFiche({ telephone: telephoneNormalise, nom: nom.trim() })
      if (!creee) {
        setEnvoi(false)
        setErreur('Vos coordonnées n’ont pas pu être enregistrées. Réessayez.')
        return
      }
    }

    const corps = {
      lignes: lines.map((l) => ({ slug: l.slug, quantite: l.qty })),
      totalAttendu: total,
      modePaiement: paiement,
      momentPaiement: momentDe(paiement),
      modeRemise: remise,
      ...(remise === 'retrait' ? { comptoir } : { adresseId }),
      ...(nomManquant ? { nom: nom.trim() } : {}),
    }

    try {
      const commande = await creer(corps, cle.current)
      /* LE PANIER SE VIDE UNE FOIS LA COMMANDE PASSEE. Il restait plein, pret
         a repartir une seconde fois (retour du client, 5 octobre). */
      vider()
      router.push(
        paiementEnLigneDu(commande)
          ? `/commande/${encodeURIComponent(commande.reference)}/paiement`
          : `/commande/${encodeURIComponent(commande.reference)}`,
      )
    } catch (e) {
      setEnvoi(false)
      setErreur(messageErreur(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {invite ? (
        <p className="text-small text-ink-2">
          Vous commandez sans compte.{' '}
          <button
            type="button"
            onClick={openPourCommande}
            className="font-semibold text-secondary underline underline-offset-2"
          >
            Se connecter
          </button>{' '}
          pour retrouver la commande dans votre espace.
        </p>
      ) : null}

      <LignesCommande lines={lines} setQty={setQty} remove={remove} />

      {bloque ? (
        <Encadre ton="alerte">
          <p className="text-small font-semibold text-ink">
            Certaines références ne peuvent pas être commandées :
          </p>
          <ul className="mt-2 space-y-1 text-small text-ink-2">
            {verif.indisponibles.map((i) => (
              <li key={i.slug}>
                {i.nom} — {libelleMotif(i.motif)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-micro text-ink-3">Retirez-les du panier pour continuer.</p>
        </Encadre>
      ) : null}

      <section>
        <h2 className="t-label text-ink-3">Comment récupérer</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(['retrait', 'domicile', 'agence'] as ModeRemise[]).map((m) => (
            <Choix key={m} actif={remise === m} onClick={() => setRemise(m)}>
              {m === 'retrait' ? 'Retrait au comptoir' : m === 'domicile' ? 'Livraison à domicile' : 'Expédition en agence'}
            </Choix>
          ))}
        </div>
        <p className="mt-2 text-micro leading-[1.6] text-ink-3">{REGLES_REMISE[remise]}</p>
      </section>

      {remise === 'retrait' ? (
        <section>
          <h2 className="t-label text-ink-3">Comptoir de retrait</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {pointsVente.map((s) => (
              <Choix key={s.key} actif={comptoir === s.key} onClick={() => setComptoir(s.key)}>
                <span className="block font-semibold">{s.district}</span>
                <span className="block text-micro text-ink-3">{counterLandmark(s, pointsVente) ?? s.city}</span>
              </Choix>
            ))}
          </div>
        </section>
      ) : invite ? (
        <AdresseSansCompte adresse={adresseSaisie} onChange={setAdresseSaisie} />
      ) : (
        <ChoixAdresse
          mode={remise}
          adresses={adresses}
          adresseId={adresseId}
          onChoisir={setAdresseId}
          onAjoutee={(a) => {
            setAdresses((liste) => [...(liste ?? []), a])
            setAdresseId(a.id)
          }}
        />
      )}

      {invite ? (
        <section>
          <h2 className="t-label text-ink-3">Vos coordonnées</h2>
          <p className="mt-1 text-micro text-ink-3">
            Le comptoir vous appelle à ce numéro pour confirmer. Le courriel, facultatif, reçoit le
            lien de suivi de la commande.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Champ label="Nom et prénom" value={nom} onChange={setNom} autoComplete="name" />
            <Champ
              label="Téléphone WhatsApp"
              value={telephone}
              onChange={setTelephone}
              placeholder="6XX XX XX XX"
              autoComplete="tel-national"
              inputMode="tel"
            />
            <Champ
              label="Courriel (facultatif)"
              value={courriel}
              onChange={setCourriel}
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </section>
      ) : nomManquant || ficheManquante ? (
        <section>
          <h2 className="t-label text-ink-3">Vos coordonnées</h2>
          <p className="mt-1 text-micro text-ink-3">
            Une seule fois : elles sont gardées pour vos prochaines commandes.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {nomManquant ? <Champ label="Nom et prénom" value={nom} onChange={setNom} /> : null}
            {ficheManquante ? (
              <Champ
                label="Téléphone WhatsApp"
                value={telephone}
                onChange={setTelephone}
                placeholder="6XX XX XX XX"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="t-label text-ink-3">Paiement</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {permis.map((p) => (
            <Choix key={p} actif={paiement === p} onClick={() => setPaiement(p)}>
              {libellePaiement(p)}
            </Choix>
          ))}
        </div>
        {paiement === 'mobile_plateforme' ? (
          <p className="mt-2 text-micro text-ink-3">
            Vous réglerez tout de suite après la validation : votre téléphone sonnera pour valider.
          </p>
        ) : (
          <p className="mt-2 text-micro text-ink-3">Réglé au moment de la remise.</p>
        )}
      </section>

      <section className="rounded-well border border-rule bg-space p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-small text-ink-2">Total</span>
          <span className="t-num text-h4 font-semibold text-ink">
            {total === null ? '…' : formatPrice(total)}
          </span>
        </div>
        <p className="mt-1 text-micro text-ink-3">
          {verif.enCours ? 'Vérification des prix…' : 'Prix vérifiés à l’instant. Hors livraison.'}
        </p>
      </section>

      <BlocConditions conditions={conditions} />

      {erreur ? (
        <p className="text-small text-warn" role="alert">
          {erreur}
        </p>
      ) : null}

      <button
        type="button"
        onClick={soumettre}
        disabled={envoi || bloque || total === null || verif.enCours}
        className="press fill inline-flex min-h-12 items-center justify-center rounded-control bg-secondary px-6 text-small font-bold text-on-surface transition-colors [--fill-to:var(--secondary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {envoi ? 'Validation…' : 'Passer la commande'}
      </button>
    </div>
  )
}

function ChoixAdresse({
  mode,
  adresses,
  adresseId,
  onChoisir,
  onAjoutee,
}: {
  mode: ModeRemise
  adresses: Adresse[] | null
  adresseId: string
  onChoisir: (id: string) => void
  onAjoutee: (a: Adresse) => void
}) {
  const [ouvertAjout, setOuvertAjout] = useState(false)
  /* OUVERT D'OFFICE QUAND IL N'Y A RIEN A CHOISIR. Un client sans adresse
     enregistree devait cliquer « Ajouter une adresse » pour voir le
     formulaire qu'il allait de toute facon remplir. Avec des adresses, la
     liste suffit, et le formulaire reste a un clic. */
  const aucune = adresses !== null && adresses.length === 0
  const formulaireOuvert = ouvertAjout || aucune

  return (
    <section>
      <h2 className="t-label text-ink-3">Adresse de livraison</h2>
      {adresses === null ? (
        <p className="mt-2 text-small text-ink-3" role="status">
          Chargement des adresses…
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {adresses.map((a) => (
            <Choix key={a.id} actif={adresseId === a.id} onClick={() => onChoisir(a.id)}>
              <span className="block font-semibold">{a.ville}</span>
              <span className="block text-micro text-ink-3">
                {[a.quartier, a.repere].filter(Boolean).join(' · ') || '—'}
              </span>
            </Choix>
          ))}
          {formulaireOuvert ? (
            <FormAdresse
              mode={mode}
              /* Sans adresse, il n'y a rien vers quoi revenir : pas d'« Annuler ». */
              onAnnuler={aucune ? undefined : () => setOuvertAjout(false)}
              onCreee={(a) => {
                onAjoutee(a)
                setOuvertAjout(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setOuvertAjout(true)}
              className="press inline-flex min-h-11 items-center justify-center rounded-control border border-dashed border-rule px-4 text-small text-ink-2 hover:border-ink hover:text-secondary"
            >
              + Ajouter une adresse
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * L'ADRESSE D'UN CLIENT SANS COMPTE. Les memes champs que le carnet, sans
 * bouton « Enregistrer » : il n'y a pas de carnet ou la ranger. Elle part avec
 * la commande, qui la fige.
 */
function AdresseSansCompte({
  adresse,
  onChange,
}: {
  adresse: AdresseSaisie
  onChange: (a: AdresseSaisie) => void
}) {
  const poser = (champ: keyof AdresseSaisie) => (valeur: string) => onChange({ ...adresse, [champ]: valeur })
  return (
    <section>
      <h2 className="t-label text-ink-3">Adresse de livraison</h2>
      <div className="mt-2 grid gap-2 rounded-well border border-rule p-3 sm:grid-cols-2">
        <Champ label="Ville" value={adresse.ville} onChange={poser('ville')} autoComplete="address-level2" />
        <Champ label="Quartier" value={adresse.quartier} onChange={poser('quartier')} />
        <Champ
          label="Repère (facultatif)"
          value={adresse.repere}
          onChange={poser('repere')}
          placeholder="Ex. : face à la pharmacie — aide le livreur"
        />
        <Champ
          label="Téléphone du destinataire (facultatif)"
          value={adresse.telephone}
          onChange={poser('telephone')}
          inputMode="tel"
        />
      </div>
    </section>
  )
}

function FormAdresse({
  mode,
  onAnnuler,
  onCreee,
}: {
  mode: ModeRemise
  onAnnuler?: () => void
  onCreee: (a: Adresse) => void
}) {
  const [ville, setVille] = useState('')
  const [quartier, setQuartier] = useState('')
  const [repere, setRepere] = useState('')
  const [tel, setTel] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const enregistrer = async () => {
    if (envoi) return
    if (!ville.trim() || !quartier.trim()) {
      setErreur('La ville et le quartier sont nécessaires pour livrer.')
      return
    }
    setEnvoi(true)
    setErreur(null)
    try {
      const a = await api<Adresse>('/adresses', {
        methode: 'POST',
        corps: {
          /* Le mode de la commande, et non « domicile » toujours : une adresse
             d'expedition en agence est rangee comme telle. */
          mode: mode === 'retrait' ? 'domicile' : mode,
          ville: ville.trim(),
          quartier: quartier.trim(),
          ...(repere.trim() ? { repere: repere.trim() } : {}),
          ...(tel.trim() ? { telephoneDestinataire: tel.trim() } : {}),
        },
      })
      onCreee(a)
    } catch (e) {
      setEnvoi(false)
      setErreur(messageErreur(e))
    }
  }

  return (
    <div className="rounded-well border border-rule p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Champ label="Ville" value={ville} onChange={setVille} />
        <Champ label="Quartier" value={quartier} onChange={setQuartier} />
        <Champ
          label="Repère (facultatif)"
          value={repere}
          onChange={setRepere}
          placeholder="Ex. : face à la pharmacie — aide le livreur"
        />
        <Champ label="Téléphone du destinataire (facultatif)" value={tel} onChange={setTel} />
      </div>
      {erreur ? (
        <p className="mt-2 text-micro text-warn" role="alert">
          {erreur}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="press fill inline-flex min-h-10 items-center rounded-control bg-secondary px-4 text-micro font-bold text-on-surface [--fill-to:var(--secondary)] disabled:opacity-60"
        >
          {envoi ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {onAnnuler ? (
          <button
            type="button"
            onClick={onAnnuler}
            className="press inline-flex min-h-10 items-center rounded-control border border-rule px-4 text-micro text-ink-2 hover:text-secondary"
          >
            Annuler
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Champ({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email'
}) {
  return (
    <label className="flex flex-col gap-1 text-micro text-ink-3">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 rounded-control border border-rule bg-paper px-3 text-[1rem] text-ink outline-none focus:border-ink md:text-small"
      />
    </label>
  )
}

/**
 * LES PRODUITS DE LA COMMANDE, MODIFIABLES SUR PLACE.
 *
 * La page ne les montrait pas : le client validait un total sans revoir ce
 * qu'il achetait, et devait rouvrir le panier pour changer une quantite. Ils
 * sont en tete, avec la quantite et « Retirer » : chaque changement relance la
 * verification des prix, et le total plus bas suit.
 *
 * « − » s'arrete a un : retirer un produit est un geste a part, nomme, pour
 * qu'un double-clic sur « − » ne vide pas une ligne par megarde.
 */
function LignesCommande({
  lines,
  setQty,
  remove,
}: {
  lines: readonly CartLine[]
  setQty: (slug: string, qty: number) => void
  remove: (slug: string) => void
}) {
  return (
    <section>
      <h2 className="t-label text-ink-3">Votre commande</h2>
      <ul className="mt-2 divide-y divide-rule rounded-well border border-rule">
        {lines.map((l) => (
          <li key={l.slug} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-control border border-rule bg-surface">
              {l.image ? (
                <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/produit/${l.slug}`}
                className="line-clamp-2 text-small font-semibold text-ink hover:text-secondary"
              >
                {l.name}
              </Link>
              <p className="t-num mt-0.5 text-micro text-ink-3">{formatPrice(l.price)} l’unité</p>
            </div>
            <div
              className="flex items-center rounded-control border border-rule"
              role="group"
              aria-label={`Quantité, ${l.name}`}
            >
              <button
                type="button"
                onClick={() => setQty(l.slug, l.qty - 1)}
                disabled={l.qty <= 1}
                aria-label={`Une unité de moins de ${l.name}`}
                className="press grid size-10 place-items-center text-ink-2 hover:text-secondary disabled:opacity-40"
              >
                −
              </button>
              <span className="t-num w-8 text-center text-small" aria-live="polite">
                {l.qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(l.slug, l.qty + 1)}
                aria-label={`Une unité de plus de ${l.name}`}
                className="press grid size-10 place-items-center text-ink-2 hover:text-secondary"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(l.slug)}
              className="press min-h-10 px-2 text-micro text-ink-3 hover:text-warn"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Choix({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`press min-h-12 rounded-control border px-4 text-left text-small transition-colors ${
        actif ? 'border-secondary bg-secondary text-ink' : 'border-rule text-ink-2 hover:border-ink'
      }`}
    >
      {children}
    </button>
  )
}

function Encadre({ children, ton }: { children: React.ReactNode; ton?: 'alerte' }) {
  return (
    <div
      className={`rounded-well border p-4 ${ton === 'alerte' ? 'border-warn bg-paper' : 'border-rule bg-space'}`}
    >
      {children}
    </div>
  )
}

async function creer(corps: unknown, cle: string): Promise<Commande> {
  return api<Commande>('/commandes', { methode: 'POST', corps, cleIdempotence: cle })
}

function messageErreur(e: unknown): string {
  /* Le limiteur de debit repond en anglais : on le dit en francais, avec la suite. */
  if (e instanceof ErreurApi && e.code === 429) {
    return 'Votre commande vient d’être envoyée plusieurs fois. Patientez quelques secondes, puis réessayez.'
  }
  return e instanceof ErreurApi ? e.message : 'La commande n’a pas pu être enregistrée. Réessayez.'
}

/** Une clé stable pour toute la vie du formulaire : elle absorbe le double-clic. */
function idempotence(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `cmd-${Date.now()}-${Math.round(Math.random() * 1e9)}`
  }
}
