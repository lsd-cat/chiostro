// Français. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows and give the English source.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "Actualiser",   // "Refresh" — fediverse cards
  snapAt: "instantané {when}",   // "snapshot {when}" — fediverse cards
  noSnap: "Pas encore d’instantané : un éditeur doit ouvrir cette page.",   // "No snapshot yet: an editor needs to open this page." — fediverse cards
  snapFail: "Impossible de lire depuis l’instance (non public, ou instance non autorisée par ce site).",   // "Could not fetch this from the instance (not public, or the instance is not allowed by this site)." — fediverse cards
  fediPost: "Message",   // "Post" — fediverse cards
  fediVideo: "Vidéo",   // "Video" — fediverse cards
  fediEvent: "Événement",   // "Event" — fediverse cards
  homeTagline: "Suite de collaboration anonyme, chiffrée de bout en bout.",   // "End-to-end encrypted, anonymous collaboration suite." — landing page
  desc_meet: "Appels vidéo avec chat, partage d’écran et de PDF, annotations et sondages.",   // "Video calls with chat, screen and PDF sharing, annotations and polls." — landing card, under the tool name
  desc_when: "Trouvez un créneau qui convient à tous.",   // "Find a time that works for everyone." — landing card, under the tool name
  desc_pad: "Écrivez ensemble : markdown, diapositives, commentaires, pièces jointes.",   // "Write together: markdown, slides, comments, attachments." — landing card, under the tool name
  desc_share: "Partage et collecte de fichiers.",   // "File sharing and collection." — landing card, under the tool name
  desc_form: "Collectez des informations, des réponses et des sondages, en privé ou en public.",   // "Collect information, answers and surveys, privately or publicly." — landing card, under the tool name
  micMuted: "Micro coupé",   // "Microphone muted" — call
  camIsOff: "Caméra éteinte",   // "Camera off" — call
  new: "Nouveau",   // "New" — header markup: <a #new>
  toolbar: "Outils",   // "Tools" — landing page; header markup: <div #toolbar>
  closed: "clos",   // "closed" — core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "Appel",   // "Call" — tool name: header navigation, landing cards, page titles
  app_when: "Planifier",   // "Plan" — tool name: header navigation, landing cards, page titles
  app_pad: "Pad",   // "Pad" — tool name: header navigation, landing cards, page titles
  app_share: "Fichiers",   // "Files" — files page
  app_form: "Formulaire",   // "Form" — form
  otherApps: "Autres outils pour cette réunion",   // "Other tools for this meeting" — header markup: <nav #nav>
  noApp: "Application inconnue.",   // "No such app." — header, shared
  guest: "Invité",   // "Guest" — call; pad; pad comments; header, shared
  detected: "(détecté)",   // "(detected)" — upload queue, widgets
  change: "Changer",   // "Change" — upload queue, widgets
  timezone: "Fuseau horaire",   // "Time zone" — upload queue, widgets
  createFailed: "Création impossible ({status}).",   // "Could not create it ({status})." — form; plan; header, shared
  sendFailed: "Envoi impossible ({status}).",   // "Could not send ({status})." — form; plan
  answerBy: "Répondre avant le {date}",   // "Answer by {date}" — form; plan
  answerByOpt: "Répondre avant (facultatif)",   // "Answer by (optional)" — plan markup: <span>; form markup: <span>
  closedSince: "Clos depuis le {date}. Les réponses envoyées après ne comptent pas.",   // "Closed since {date}. Answers sent after that are not counted." — form; plan
  noMicrophone: "Pas de micro",   // "No microphone" — call
  blur: "Flouter mon arrière-plan",   // "Blur my background" — call markup: <button #blurb>
  blurLabel: "Flouter le fond",   // "Blur background" — call markup: <span>
  settings: "Réglages",   // "Settings" — call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "Réglages",   // "Settings" — call markup: <span>
  drawing: "Dessin activé",   // "Drawing on" — call: ink markup; call: ink
  clearInkLabel: "Effacer les miens",   // "Clear mine" — call: ink markup; call: ink
  done: "Terminé",   // "Done" — call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "Ouvrir dans un nouvel onglet",   // "Open in a new tab" — call: embed markup; call: embed
  embedBlank: "Si elle reste vide, ce site n’autorise pas l’intégration.",   // "If it stays blank, that site does not allow embedding." — call: embed markup; call: embed
  agendaLabel: "Ordre du jour",   // "Agenda" — call: agenda markup; call: agenda
  themeLabel: "Thème",   // "Theme" — call markup: <span>
  tools: "Outils",   // "Tools" — header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "Outils",   // "Tools" — call markup: <span>
  embed: "Partager une page web",   // "Share a web page" — call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "Page",   // "Page" — call: embed markup; call: embed
  embedUrl: "https://…",   // "https://…" — call: embed markup; call: embed
  embedShare: "Partager",   // "Share" — call: embed markup; call: embed
  open: "Ouvrir",   // "Open" — call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "Fermer la page",   // "Close page" — call: embed markup; call: embed
  wantsToEmbed: "{who} veut afficher une page de {origin}",   // "{who} wants to show a page from {origin}" — call: embed
  embedWarn: "Page externe : non chiffrée, et ce site voit votre adresse IP.",   // "External page: not encrypted, and that site sees your IP address." — call: embed markup; call: embed
  noCamera: "sans caméra",   // "no camera" — call
  noMedia: "sans caméra ni micro",   // "no camera or microphone" — call
  dismiss: "Fermer",   // "Dismiss" — call: poll markup; call: poll
  raiseHand: "Lever la main",   // "Raise hand" — call: hand; call: hand markup
  lowerHand: "Baisser la main",   // "Lower hand" — call: hand
  poll: "Sondages",   // "Polls" — call: poll; call: poll markup; call extensions
  pollLabel: "Sondage",   // "Poll" — call: poll markup; call: poll
  pollQuestion: "Question",   // "Question" — call: poll markup; call: poll
  pollOptions: "Options, une par ligne",   // "Options, one per line" — call: poll markup; call: poll
  pollStart: "Lancer",   // "Start" — call: poll markup; call: poll
  cancel: "Annuler",   // "Cancel" — call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "Clore le sondage",   // "Close poll" — call: poll markup; call: poll
  votes: "{n} votes",   // "{n} votes" — call: poll
  agenda: "Ordre du jour et minuteur",   // "Agenda and timer" — call: agenda; call: agenda markup; call extensions
  agendaItem: "Nouveau point",   // "New agenda item" — call: agenda markup; call: agenda
  add: "Ajouter",   // "Add" — call: agenda markup
  timerMinutes: "Minutes",   // "Minutes" — call: agenda markup; call: agenda
  start: "Démarrer",   // "Start" — pad; plan; call: agenda markup; call: agenda
  stop: "Arrêter",   // "Stop" — shared helpers; call: agenda markup; call: agenda
  remove: "Retirer",   // "Remove" — form; call: agenda
  record: "Enregistrer localement",   // "Record locally" — call: record; call: record markup; call extensions
  stopRecording: "Arrêter l’enregistrement",   // "Stop recording" — call: record
  recLabel: "Rec",   // "Rec" — call: record markup; call: record
  recordingBy: "⏺ {who} enregistre",   // "⏺ {who} is recording" — call: record
  pip: "Afficher toutes les vidéos dans une fenêtre flottante",   // "Show all videos in a floating window" — call: pip markup
  pipLabel: "PiP",   // "PiP" — call: pip markup; call: pip
  openPdf: "Ouvrir le PDF (page {page})",   // "Open the PDF (page {page})" — call: pdf
  call: "Appel",   // "Call" — call; call markup: <section #call>
  controls: "Commandes de l’appel",   // "Call controls" — call markup: <div #bar>
  subtitle: "Appel chiffré de bout en bout, par lien.",   // "Link-based end-to-end encrypted call." — call markup: <small #subtitle>
  yourName: "Votre nom",   // "Your name" — call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "Chemin média",   // "Media path" — call markup: <legend>
  p2p: "P2P",   // "P2P" — call markup: <span>
  relay: "Serveur",   // "Server" — core/config; call; call markup: <span>
  advanced: "Avancé",   // "Advanced" — call; call markup: <summary>
  relayServer: "Serveur relais",   // "Relay server" — call markup: <span>
  iceServers: "Serveurs ICE",   // "ICE servers" — core/config; call markup: <span>
  advancedError: "Paramètres avancés",   // "Advanced settings" — call
  notHostPort: "n’est pas un hôte:port",   // "not a host:port" — call
  join: "Rejoindre l’appel",   // "Join call" — call; call markup: <button #join>
  copied: "✅ Copié",   // "✅ Copied" — shared helpers
  theme: "Thème clair ou sombre",   // "Toggle dark or light theme" — core/config; header, shared; call markup: <button>; header markup: <button>
  language: "Langue",   // "Language" — header markup: <select>
  relayNote: "Un relais TURN est configuré : ajoutez ?turnonly à l’URL pour faire passer les médias par le serveur et cacher votre IP aux autres participants.",   // "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants." — call markup: <small #relaynote>
  invalidKey: "Clé de salle invalide dans l’URL.",   // "Invalid room key in URL." — header, shared
  mic: "Micro",   // "Mic" — call markup: <span>
  cam: "Caméra",   // "Cam" — call markup: <span>
  share: "Partager",   // "Share" — core/config; form; call; files page; call markup: <span>
  chat: "Chat",   // "Chat" — call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "Copier le lien",   // "Copy link" — call markup: <span>; header markup: <button #copy>
  leave: "Quitter",   // "Leave" — call; call markup: <span>
  mute: "Couper le micro",   // "Mute microphone" — call; call markup: <button #mic>
  unmute: "Réactiver le micro",   // "Unmute microphone" — call
  camOff: "Éteindre la caméra",   // "Turn camera off" — call; call markup: <button #camb>
  camOn: "Allumer la caméra",   // "Turn camera on" — call
  shareScreen: "Partager l’écran",   // "Share screen" — call; call markup: <button #share>
  stopSharing: "Arrêter le partage",   // "Stop sharing" — call
  toggleChat: "Afficher/masquer le chat",   // "Toggle chat" — call markup: <button #chatb>
  hideChat: "Masquer le chat",   // "Hide chat" — call
  showChat: "Afficher le chat",   // "Show chat" — call
  leaveCall: "Quitter l’appel",   // "Leave call" — call markup: <button #leave>
  inCall: "🔒 E2EE · {n} en ligne",   // "🔒 E2EE · {n} in call" — call
  disconnected: "⚠️ Déconnecté",   // "⚠️ Disconnected" — call
  you: "Vous",   // "You" — call; pad
  yourScreen: "Votre écran",   // "Your screen" — call
  screen: "(écran)",   // "(screen)" — core/relaymedia; core/roster; call
  message: "Message (chiffré)",   // "Message (encrypted)" — shared helpers; call markup: <input #msg>
  send: "Envoyer",   // "Send" — call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // "PDF" — pad; call: pdf markup
  sharePdf: "Partager un PDF",   // "Share a PDF" — call: pdf markup; call: pdf
  accept: "Accepter",   // "Accept" — call: pdf markup; call: pdf
  decline: "Refuser",   // "Decline" — call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} veut partager « {name} » ({size} Mo)",   // "{who} wants to share \"{name}\" ({size} MB)" — call: pdf
  receiving: "Réception de « {name} »… {pct} %",   // "Receiving \"{name}\"… {pct}%" — call: pdf
  pdfTooLarge: "PDF trop volumineux (50 Mo max)",   // "PDF too large (50 MB max)" — call: pdf
  prevPage: "Page précédente",   // "Previous page" — call: pdf markup; call: pdf
  nextPage: "Page suivante",   // "Next page" — call: pdf markup; call: pdf
  fullScreen: "Plein écran",   // "Full screen" — call: pdf markup; call: pdf
  closePdf: "Fermer le PDF",   // "Close PDF" — call: pdf markup; call: pdf
  sharedPdf: "PDF partagé",   // "Shared PDF" — call: pdf markup; call: pdf
  draw: "Dessiner",   // "Draw" — call: ink markup; call: ink
  drawAria: "Dessiner des annotations",   // "Draw annotations" — call: ink markup; call: ink
  clearInk: "Effacer mes annotations",   // "Clear my annotations" — call: ink markup; call: ink
  annotations: "Annotations",   // "Annotations" — call: ink
  pin: "Épingler cette vignette",   // "Pin this tile" — call
  removeFile: "Retirer",   // "Remove" — pad; files page
  removeFileAsk: "Retirer {name} pour tout le monde ? Ses octets sont supprimés du serveur.",   // "Remove {name} for everyone? Its bytes are deleted from the server." — pad; files page
  removeFailed: "Impossible de retirer ({status})",   // "Could not remove ({status})" — pad; files page
  siteLinks: "Liens",   // "Links" — landing page markup: <nav #homelinks>
  keyTaken: "Quelqu’un d’autre détient la clé de signature de cette salle ; son lien en lecture seule n’est pas fiable. Créez-en une nouvelle.",   // "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one." — header, shared
  comments: "Commentaires",   // "Comments" — pad; pad markup: <aside #padcomments>
  commentOn: "Commenter la sélection",   // "Comment on the selection" — pad markup: <button #commenton>
  commentPh: "Écrire un commentaire…",   // "Write a comment…" — pad markup: <textarea #commenttext>
  post: "Publier",   // "Post" — core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "Répondre",   // "Reply" — pad comments
  resolve: "Résoudre",   // "Resolve" — pad comments
  reopen: "Rouvrir",   // "Reopen" — pad comments
  resolvedN: "Résolus ({n})",   // "Resolved ({n})" — pad comments
  noComments: "Pas encore de commentaire. Sélectionnez du texte pour le commenter.",   // "No comments yet. Select some text to comment on it." — pad markup: <p #threadsempty>
  textChanged: "le texte visé a changé",   // "the text this referred to has changed" — pad comments
  toTex: "Convertir en LaTeX",   // "Convert to LaTeX" — pad
  toTexConfirm: "Transformer ce pad en document LaTeX ? Le markdown est remplacé par sa source LaTeX et l’aperçu devient le PDF compilé. Sans retour possible.",   // "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back." — pad
  filesPanel: "Fichiers",   // "Files" — pad; pad markup: <aside #padfiles>
  insert: "Insérer",   // "Insert" — pad
  compiling: "Compilation…",   // "Compiling…" — pad
  texError: "LaTeX : {err}",   // "LaTeX: {err}" — pad
  typesetting: "Composition du PDF… ({n} fichiers reçus)",   // "Typesetting the PDF… ({n} files fetched)" — pad
  pdfFallback: "Composition échouée, impression à la place",   // "Typesetting failed, printing instead" — pad
  fediProfile: "Profil",   // "Profile" — fediverse cards
  queued: "En attente",   // "Queued" — upload queue, widgets
  uploadingShort: "Envoi…",   // "Uploading…" — upload queue, widgets
  uploads: "Envois",   // "Uploads" — pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "Ce lien n’ouvre que cet outil. Le lien de la réunion est sur la page d’accueil.",   // "This link opens only this tool. The meeting link is on the landing page." — header markup: <small>
  contents: "Sommaire",   // "Contents" — pad markup: <nav #toc>
  fWords: "Nuage de mots",   // "Word cloud" — form: question type, builder and presenting
  fScale: "Échelle de 1 à 5",   // "Scale 1 to 5" — form: question type, builder and presenting
  reveal: "Afficher les résultats",   // "Show results" — form
  hideResults: "Masquer les résultats",   // "Hide results" — form
  resultsHidden: "Résultats masqués jusqu’à ce que vous les affichiez",   // "Results hidden until you show them" — form
  waiting: "En attente que le présentateur affiche les résultats.",   // "Waiting for the presenter to show the results." — form; form markup: <p #waiting>
  scan: "Scannez pour répondre",   // "Scan to answer" — form markup: <small>
  questionOf: "Question {n} sur {total}",   // "Question {n} of {total}" — form
  average: "Moyenne {n}",   // "Average {n}" — form
  prevQuestion: "Question précédente",   // "Previous question" — form markup: <button #fpprev>
  nextQuestion: "Question suivante",   // "Next question" — form markup: <button #fpnext>
  presentResults: "Présenter les résultats en plein écran",   // "Present the results full screen" — form markup: <div #fpresent>
  qr: "Afficher le lien en QR code",   // "Show the link as a QR code" — header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "QR code de ce lien",   // "QR code of this link" — form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "Trouvez un créneau qui convient à tous. Chiffré de bout en bout, par lien.",   // "Find a time that works for everyone. End-to-end encrypted, by link." — plan markup: <small>
  eventName: "Nom de l’événement",   // "Event name" — plan markup: <span>
  from: "De",   // "From" — core/doc; core/signaling; pad; plan markup: <span>
  to: "À",   // "To" — plan markup: <span>
  create: "Créer l’événement",   // "Create event" — plan; plan markup: <button #go>
  prevMonth: "Mois précédent",   // "Previous month" — plan markup: <button #prev>
  nextMonth: "Mois suivant",   // "Next month" — plan markup: <button #next>
  noDates: "Choisissez au moins une date.",   // "Pick at least one date." — plan
  sameTimes: "Le début et la fin doivent différer.",   // "Start and end must differ." — plan
  untitledEvent: "Événement sans nom",   // "Untitled event" — plan
  yourAvailability: "Vos disponibilités",   // "Your availability" — plan markup: <span>
  sentAs: "Envoyé en tant que {name}.",   // "Sent as {name}." — plan
  group: "Disponibilités du groupe",   // "Group availability" — plan
  groupTab: "Groupe ({n})",   // "Group ({n})" — plan
  noAnswersShare: "Pas encore de réponse. Partagez le lien.",   // "No answers yet. Share the link." — plan
  available: "{n}/{total} disponibles",   // "{n}/{total} available" — plan
  hoverHint: "Survolez un créneau pour voir qui est libre.",   // "Hover a slot to see who is free." — plan
  calHint: "Choisissez les jours : clic, glisser, ou maj+clic pour une plage.",   // "Pick the days: click, drag, or shift-click for a range." — plan markup: <small #calhint>
  view: "Vue",   // "View" — pad; header, shared; plan markup: <div>
  answers: "Réponses",   // "Answers" — plan markup: <ul #people>
  gridLabel: "Grille de disponibilité : un bouton par quart d’heure",   // "Availability grid: one button per quarter hour" — plan markup: <div #editor>
  heatLabel: "Carte des disponibilités du groupe ; les meilleurs créneaux sont listés dessous",   // "Group availability heatmap; the best times are listed below" — plan markup: <div #heat>
  best: "Meilleurs créneaux",   // "Best times" — plan; plan markup: <b>
  addToCalendar: "Ajouter {len} au calendrier (.ics)",   // "Add {len} to calendar (.ics)" — plan
  length: "Durée de la réunion",   // "Meeting length" — plan markup: <span>
  untitledPad: "Pad sans titre",   // "Untitled pad" — pad
  edit: "Éditer",   // "Edit" — pad
  both: "Les deux",   // "Both" — pad
  slides: "Diapos",   // "Slides" — pad
  viewMode: "Mode d’affichage",   // "View mode" — pad
  present: "Présenter",   // "Present" — form; pad; form markup: <span>
  presentLabel: "Présenter les diapos en plein écran",   // "Present the slides full screen" — pad
  downloadMd: "Télécharger .md",   // "Download .md" — pad
  pdfLabel: "PDF composé avec LaTeX : pages, ou une diapo par page dans la vue diapos",   // "PDF, typeset with LaTeX: pages, or one slide per page in the slides view" — pad
  attach: "Joindre un fichier",   // "Attach a file" — pad
  history: "Historique",   // "History" — pad
  historyLabel: "Versions précédentes",   // "Earlier versions" — pad
  restore: "Restaurer cette version",   // "Restore this version" — pad markup: <button #histrestore>
  back: "Retour au pad actuel",   // "Back to the live pad" — pad markup: <button #histback>
  viewing: "Version enregistrée {when}",   // "Viewing the version saved {when}" — pad; files page; header, shared
  online: "{n} en ligne : {names}",   // "{n} online: {names}" — pad
  syncing: "Connexion…",   // "Connecting…" — pad
  saved: "Enregistré",   // "Saved" — core/doc; pad
  saving: "Enregistrement…",   // "Saving…" — core/doc; pad
  saveFailed: "Non enregistré : trop grand ou refusé",   // "Not saved: too large or the store refused" — pad
  storeDown: "Le serveur ne peut pas enregistrer le texte pour le moment. L’édition est en pause ; votre texte reste ici et l’enregistrement reprendra dès que possible.",   // "The server cannot store the text right now. Editing is paused; your text stays here and saving resumes when it can." — pad
  placeholder: "# Titre\n\nÉcrivez du markdown ici. Toute personne ayant le lien modifie le même texte, chiffré de bout en bout.\n\n---\n\nUne ligne avec --- commence une nouvelle diapo.",   // "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide." — pad
  slideOf: "Diapo {n} sur {total}",   // "Slide {n} of {total}" — pad
  exit: "Quitter (Échap)",   // "Exit (Esc)" — pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "Texte du pad",   // "Pad text" — pad markup: <textarea #editor>
  previewLabel: "Aperçu",   // "Preview" — pad; pad markup: <div #preview>
  colors: "Couleurs des auteurs",   // "Author colours" — pad
  wroteBy: "Écrit par {names}",   // "Written by {names}" — pad
  viewLink: "Lien en lecture seule",   // "View link" — header, shared
  viewCopied: "✅ Lien de lecture copié",   // "✅ View link copied" — header, shared
  readOnly: "Lecture seule",   // "Read-only view" — pad; files page
  noHead: "Ce pad n’a pas encore de clé d’édition ; ouvrez d’abord le lien d’édition.",   // "This pad has no editor key yet; open the edit link first." — pad
  noHeadFiles: "Cette page de fichiers n’a pas encore de clé d’édition ; ouvrez d’abord le lien d’édition.",   // "This files page has no editor key yet; open the edit link first." — files page
  shareSubtitle: "Chiffré dans votre navigateur. Toute personne ayant le lien peut ajouter et télécharger.",   // "Encrypted in your browser. Anyone with the link can add and download." — files page markup; files page; files page markup: <small>
  shareSubtitleView: "Lecture seule. Les fichiers sont déchiffrés dans votre navigateur au téléchargement.",   // "Read-only view. Files are decrypted in your browser when you download them." — files page
  dropLabel: "Ajouter des fichiers",   // "Add files" — files page markup: <div #drop>
  dropHint: "Déposez des fichiers ici ou",   // "Drop files here or" — files page markup: <span>
  choose: "choisissez des fichiers",   // "choose files" — files page markup: <span>
  filesLabel: "Fichiers",   // "Files" — files page markup: <ul #files>
  noFiles: "Pas encore de fichier.",   // "No files yet." — pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "Téléchargement de {name}",   // "Downloading {name}" — files page
  downloadFile: "Télécharger",   // "Download" — pad; files page
  preview: "Aperçu",   // "Preview" — pad; files page
  by: "par {who}",   // "by {who}" — files page
  failed: "Échec : {err}",   // "Failed: {err}" — core/doc; pad; upload queue, widgets
  nFiles: "{n} fichiers, {size}",   // "{n} files, {size}" — files page
  formSubtitle: "Créez un formulaire. Les réponses sont chiffrées ; vous seul les lisez, sauf si vous ouvrez les résultats à tous.",   // "Build a form. Answers are encrypted; only you read them unless you open the results to everyone." — form markup: <small>
  formTitle: "Titre",   // "Title" — form markup: <span>
  addField: "Ajouter une question",   // "Add a question" — form markup: <span>
  question: "Question",   // "Question" — form
  type: "Type",   // "Type" — core/fedi; form
  options: "Options, une par ligne",   // "Options, one per line" — form
  required: "Obligatoire",   // "Required" — form
  up: "Monter",   // "Move up" — form
  down: "Descendre",   // "Move down" — form
  fText: "Texte court",   // "Short text" — form: question type, builder and presenting
  fLong: "Paragraphe",   // "Paragraph" — form: question type, builder and presenting
  fNumber: "Nombre",   // "Number" — form: question type, builder and presenting
  fDate: "Date",   // "Date" — form: question type, builder and presenting
  fOne: "Un choix",   // "One choice" — form: question type, builder and presenting
  fMany: "Plusieurs choix",   // "Several choices" — form: question type, builder and presenting
  openResults: "Résultats visibles par toute personne ayant le lien",   // "Results visible to everyone with the link" — form markup: <span>
  createForm: "Créer le formulaire",   // "Create form" — form markup: <button #go>
  needFields: "Donnez un titre et au moins une question.",   // "Give a title and at least one question." — form
  thanks: "Merci, votre réponse a été envoyée.",   // "Thank you, your answer was sent." — form
  results: "Résultats",   // "Results" — form; form markup: <h2 #rtitle>
  nAnswers: "{n} réponses",   // "{n} answers" — form
  csv: "Télécharger le CSV",   // "Download CSV" — form markup: <button #csv>
  answered: "Répondu",   // "Answered" — form
  noAnswers: "Pas encore de réponse.",   // "No answers yet." — form markup: <p #empty>
  lockedResults: "Seul le propriétaire voit les réponses.",   // "Only the owner sees the answers." — form markup: <small #locked>
  shareTitle: "Partager",   // "Share" — form markup: <h2 #sharetitle>
  copy: "Copier",   // "Copy" — shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "Envoyez ce lien aux personnes qui doivent répondre.",   // "Send this link to the people who should answer." — form markup: <small>
  ownerHint: "Votre lien de propriétaire : il contient la clé qui ouvre les réponses. Gardez-le privé.",   // "Your owner link: it holds the key that opens the answers. Keep it private." — form markup: <small>
};
export default dict;
