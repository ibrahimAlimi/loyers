// Textes lus par la voix off et affichés en sous-titres. Données pures : le script `npm run voix`
// les lit pour générer les fichiers audio (un fichier par phrase, régénéré seulement si le texte change).
// Clé d'un fichier : `<démo>.<numéro de l'étape>`.

export const RAPPEL_PERSONNALISER = 'Vous pouvez choisir ce qui s’affiche ici avec le bouton « Personnaliser ».';

export const NARRATIONS: Record<string, string[]> = {
  rappel: [RAPPEL_PERSONNALISER],
  visite: [
    'Bienvenue ! Voici, en quelques secondes, l’essentiel de votre application. Si vous connaissez déjà, touchez « Tout passer ».',
    'Pour encaisser un loyer, touchez ici. L’application vous guide pas à pas, puis prépare le reçu.',
    'Ici, vos locataires : qui est à jour, qui est en retard, et combien il doit.',
    'Ici, tous vos reçus. Vous pouvez les renvoyer sur WhatsApp ou les réimprimer.',
    'Ici, vos chiffres : ce qui est encaissé, ce qui reste à percevoir, et l’occupation de vos maisons.',
    'La cloche vous prévient de ce qui se passe : un paiement, un retard, une demande.',
    'Avec « Personnaliser », vous choisissez ce qui s’affiche à l’écran.',
    'C’est tout ! Pour revoir ces explications, ouvrez « Apprendre » dans le menu.',
  ],
  encaisser: [
    'Pour encaisser un loyer, touchez « Encaisser un loyer ».',
    'Choisissez le locataire. Ceux qui sont en retard apparaissent en premier.',
    'L’application propose le montant dû. Vous pouvez le changer si le locataire paie moins, ou plus d’avance.',
    'Choisissez comment il a payé : espèces, MTN Mobile Money, Moov Money ou Celtiis Cash.',
    'Vérifiez le résumé, puis touchez « Valider l’encaissement ».',
    'C’est fait : le reçu est prêt. Vous pouvez l’envoyer tout de suite sur WhatsApp.',
  ],
  recu_whatsapp: [
    'Pour envoyer un reçu sur WhatsApp, ouvrez « Reçus ».',
    'Trouvez le reçu : tapez le nom du locataire ou le numéro du reçu.',
    'Touchez le bouton WhatsApp à côté du reçu.',
    'Choisissez l’image, plus pratique sur téléphone, ou le PDF.',
    'WhatsApp s’ouvre avec le reçu et un message déjà écrit. Il ne reste qu’à envoyer.',
  ],
  reimprimer: [
    'Pour réimprimer un reçu, ouvrez « Reçus » et trouvez le reçu.',
    'Touchez les trois points, puis « Imprimer ».',
    'Un reçu réimprimé porte la mention « DUPLICATA » avec la date du jour. L’original reste unique.',
    'Le propriétaire est prévenu de chaque duplicata.',
  ],
  maison_logements: [
    'Pour ajouter une maison, ouvrez « Maisons », puis touchez « Ajouter une maison ».',
    'Donnez-lui un nom, le quartier et la ville, puis enregistrez.',
    'Dans la maison, touchez « Ajouter un logement ».',
    'Choisissez le type, chambre, appartement ou boutique, la désignation, et le loyer habituel.',
    'Recommencez pour chaque logement. Les logements libres sont marqués « Libre ».',
  ],
  locataire_bail: [
    'Pour installer un locataire, ouvrez la maison et touchez « Louer » sur un logement libre.',
    'Indiquez le nom, le prénom et le téléphone du locataire.',
    'Indiquez la date d’entrée et le loyer mensuel. Le premier mois peut avoir un montant différent.',
    'Si le locataire verse une caution, indiquez son montant : vous pourrez l’encaisser avec un reçu.',
    'Enregistrez. Le locataire apparaît dans la liste, avec ses loyers à payer.',
  ],
  lire_chiffres: [
    'Pour lire vos chiffres, ouvrez « Statistiques ».',
    'En haut, choisissez la période : ce mois, cette année, ou des dates au choix.',
    '« Encaissé », c’est ce que vous avez reçu. « Reste à percevoir », c’est ce qu’on vous doit encore.',
    'La petite flèche compare avec la période d’avant : en vert, c’est mieux ; en rouge, c’est moins bien.',
    'Plus bas, « Qui doit combien » : vous pouvez relancer un locataire sur WhatsApp en un geste.',
    'Le bouton « Exporter » prépare un rapport PDF ou un tableau Excel.',
  ],
  personnaliser: [
    'Sur chaque page, le bouton « Personnaliser » vous laisse choisir ce que vous voyez.',
    'Cochez ce que vous voulez voir, décochez le reste.',
    'Les flèches changent l’ordre : mettez en haut ce qui compte le plus pour vous.',
    'Votre choix est gardé, séparément pour le téléphone et pour l’ordinateur.',
    'Pour tout remettre comme au début, touchez « Revenir au choix par défaut ».',
  ],
  identite: [
    'Pour personnaliser votre espace, ouvrez « Paramètres ».',
    'Dans « Logo et couleur », envoyez votre logo et choisissez une couleur. L’aperçu change tout de suite.',
    'Vous pouvez aussi changer les icônes du menu.',
    'Dans « Signature et cachet », signez avec le doigt, ou envoyez une photo de votre signature et de votre cachet.',
    'Tout cela est facultatif : sans logo ni signature, vos reçus restent valables et vous pouvez signer à la main.',
  ],
  gestionnaires: [
    'Un gestionnaire encaisse les loyers des maisons que vous lui confiez.',
    'Ouvrez « Comptes », puis touchez « Ajouter un compte ».',
    'Choisissez le rôle « Gestionnaire », donnez un identifiant et un mot de passe provisoire.',
    'Dans chaque maison, choisissez son gestionnaire.',
    'Vous êtes prévenu de chacun de ses encaissements. Pour annuler ou supprimer, il doit vous le demander.',
  ],
  corbeille: [
    'Quand vous supprimez quelque chose, il part d’abord dans la « Corbeille ».',
    'Une fenêtre vous explique toujours ce qui sera touché avant de confirmer.',
    'Dans la Corbeille, touchez « Restaurer » pour tout remettre comme avant.',
    'Seul l’administrateur peut supprimer définitivement.',
  ],
  presentation: [
    'Mes Loyers : la gestion de vos loyers, simplement.',
    'Aujourd’hui, beaucoup de propriétaires notent leurs loyers dans des cahiers, ou paient cher des logiciels compliqués. On perd du temps, des reçus, et parfois de l’argent.',
    'Mes Loyers réunit tout au même endroit : vos maisons, vos logements, vos locataires et leurs baux.',
    'Pour encaisser un loyer, quatre étapes suffisent : le locataire, le montant, le mode de paiement, et c’est fait. Espèces, MTN, Moov ou Celtiis.',
    'Le reçu est prêt aussitôt, à vos couleurs. Vous l’envoyez sur WhatsApp en un geste.',
    'Vos chiffres sont toujours à jour : ce qui est encaissé, ce qui reste à percevoir, qui doit combien, et depuis quand.',
    'Vous pouvez confier des maisons à des gestionnaires. Vous êtes prévenu de chaque encaissement, et rien ne s’efface sans votre accord.',
    'Chaque reçu porte un code QR. Il suffit de le scanner pour vérifier qu’il est authentique.',
    'Mes Loyers marche sur le téléphone et sur l’ordinateur, avec les mêmes données, et s’installe comme une application.',
    'Vos données sont protégées : double authentification, sauvegardes, journal de toutes les actions, et une corbeille pour ne rien perdre par erreur.',
    'Les formules commencent gratuitement, jusqu’à trois logements, puis à partir de cinq mille francs par mois.',
    'Demandez votre accès dès aujourd’hui sur Mes Loyers.',
  ],
  installer: [
    'Installez l’application pour l’ouvrir comme les autres, depuis l’écran d’accueil.',
    'Sur Android, dans Chrome : touchez les trois points en haut, puis « Ajouter à l’écran d’accueil ».',
    'Sur iPhone, dans Safari : touchez le bouton Partager, puis « Sur l’écran d’accueil ».',
    'L’icône apparaît sur votre téléphone. Touchez-la pour ouvrir vos loyers.',
  ],
};
