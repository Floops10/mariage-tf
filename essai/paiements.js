/**
 * paiements.js — T & F Mariage · la page « paiement » (paiement.html)
 *
 * La page « paiement » n'est liée depuis aucune page du site : seule son adresse
 * l'ouvre (c'est elle que reprennent les QR codes affichés dans la salle).
 * Elle lit ce fichier. Pour changer un lien ou retirer un moyen de paiement,
 * c'est ici et nulle part ailleurs.
 *
 * ATTENTION — ce fichier contient les coordonnées bancaires du compte joint.
 * Le dépôt GitHub étant public, il est lisible par quiconque connaît son adresse
 * (et l'historique en garde la trace). Pour ne plus proposer le virement :
 * supprimez le bloc TF_VIREMENT, la page n'affichera alors que Wero et PayPal.
 *
 * Moyens en ligne (TF_PAIEMENTS), dans l'ordre d'affichage :
 *   nom     le nom affiché
 *   url     le lien de paiement (https) : la page en fait un bouton ET un QR code
 *   bouton  le texte du bouton
 *   aide    une phrase d'explication sous le nom
 *   badge   (facultatif) une étiquette, par exemple « Recommandé »
 */
window.TF_PAIEMENTS = [
  {
    nom: 'Wero',
    badge: 'Recommandé',
    url: 'https://share.weropay.eu/p/1/c/MjMhUcaVcJ',
    aide: 'Wero se trouve dans l\u2019application de votre banque : le paiement est instantané et gratuit.',
    bouton: 'Je participe à l\u2019urne avec Wero'
  },
  {
    nom: 'PayPal',
    url: 'https://www.paypal.com/qrcodes/p2pqrc/7EP43472926LE',
    aide: 'Touchez le bouton, indiquez le montant de votre choix et validez. Vous pouvez aussi chercher @TPhanzu dans l\u2019application PayPal.',
    bouton: 'Je préfère utiliser PayPal'
  }
];

/* Virement : le RIB n'apparaît qu'après un clic sur le bouton (jamais dans le texte de la page). */
window.TF_VIREMENT = {
  bouton: 'Je préfère faire un virement',
  titulaire: 'Florian Bouchart & Thomy Phanzu',
  iban: ['FR76', '2823', '3000', '0155', '9555', '4822', '851'],
  bic: 'REVOFRP2',
  /* pour un virement depuis l'étranger */
  banque: 'Revolut Bank UAB',
  adresse: '10 avenue Kléber, 75116 Paris, France',
  bicCorrespondant: 'CHASDEFX'
};
