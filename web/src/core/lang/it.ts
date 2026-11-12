// Italiano. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows and give the English source.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "Aggiorna",   // "Refresh" — fediverse cards
  snapAt: "istantanea {when}",   // "snapshot {when}" — fediverse cards
  noSnap: "Nessuna istantanea: un editor deve aprire questa pagina.",   // "No snapshot yet: an editor needs to open this page." — fediverse cards
  snapFail: "Impossibile leggerlo dall’istanza (non pubblico, o istanza non consentita da questo sito).",   // "Could not fetch this from the instance (not public, or the instance is not allowed by this site)." — fediverse cards
  fediPost: "Post",   // "Post" — fediverse cards
  fediVideo: "Video",   // "Video" — fediverse cards
  fediEvent: "Evento",   // "Event" — fediverse cards
  homeTagline: "Suite di collaborazione anonima, cifrata end-to-end.",   // "End-to-end encrypted, anonymous collaboration suite." — landing page
  desc_meet: "Videochiamate con chat, condivisione di schermo e PDF, annotazioni e sondaggi.",   // "Video calls with chat, screen and PDF sharing, annotations and polls." — landing card, under the tool name
  desc_when: "Trova un orario che vada bene a tutti.",   // "Find a time that works for everyone." — landing card, under the tool name
  desc_pad: "Scrivete insieme: markdown, slide, commenti, allegati.",   // "Write together: markdown, slides, comments, attachments." — landing card, under the tool name
  desc_share: "Condivisione e raccolta di file.",   // "File sharing and collection." — landing card, under the tool name
  desc_form: "Raccogli informazioni, risposte e sondaggi, in privato o in pubblico.",   // "Collect information, answers and surveys, privately or publicly." — landing card, under the tool name
  micMuted: "Microfono disattivato",   // "Microphone muted" — call
  camIsOff: "Fotocamera spenta",   // "Camera off" — call
  new: "Nuovo",   // "New" — header markup: <a #new>
  toolbar: "Strumenti",   // "Tools" — landing page; header markup: <div #toolbar>
  closed: "chiuso",   // "closed" — core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "Chiamata",   // "Call" — tool name: header navigation, landing cards, page titles
  app_when: "Pianifica",   // "Plan" — tool name: header navigation, landing cards, page titles
  app_pad: "Pad",   // "Pad" — tool name: header navigation, landing cards, page titles
  app_share: "File",   // "Files" — files page
  app_form: "Modulo",   // "Form" — form
  otherApps: "Altri strumenti per questa riunione",   // "Other tools for this meeting" — header markup: <nav #nav>
  noApp: "App inesistente.",   // "No such app." — header, shared
  guest: "Ospite",   // "Guest" — call; pad; pad comments; header, shared
  detected: "(rilevato)",   // "(detected)" — upload queue, widgets
  change: "Cambia",   // "Change" — upload queue, widgets
  timezone: "Fuso orario",   // "Time zone" — upload queue, widgets
  createFailed: "Impossibile creare ({status}).",   // "Could not create it ({status})." — form; plan; header, shared
  sendFailed: "Invio non riuscito ({status}).",   // "Could not send ({status})." — form; plan
  answerBy: "Rispondi entro il {date}",   // "Answer by {date}" — form; plan
  answerByOpt: "Rispondi entro (facoltativo)",   // "Answer by (optional)" — plan markup: <span>; form markup: <span>
  closedSince: "Chiuso dal {date}. Le risposte inviate dopo non contano.",   // "Closed since {date}. Answers sent after that are not counted." — form; plan
  noMicrophone: "Nessun microfono",   // "No microphone" — call
  blur: "Sfoca il mio sfondo",   // "Blur my background" — call markup: <button #blurb>
  blurLabel: "Sfoca sfondo",   // "Blur background" — call markup: <span>
  settings: "Impostazioni",   // "Settings" — call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "Impostazioni",   // "Settings" — call markup: <span>
  drawing: "Disegno attivo",   // "Drawing on" — call: ink markup; call: ink
  clearInkLabel: "Cancella i miei",   // "Clear mine" — call: ink markup; call: ink
  done: "Fine",   // "Done" — call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "Apri in una nuova scheda",   // "Open in a new tab" — call: embed markup; call: embed
  embedBlank: "Se resta vuota, quel sito non consente l’incorporamento.",   // "If it stays blank, that site does not allow embedding." — call: embed markup; call: embed
  agendaLabel: "Agenda",   // "Agenda" — call: agenda markup; call: agenda
  themeLabel: "Tema",   // "Theme" — call markup: <span>
  tools: "Strumenti",   // "Tools" — header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "Strumenti",   // "Tools" — call markup: <span>
  embed: "Condividi una pagina web",   // "Share a web page" — call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "Pagina",   // "Page" — call: embed markup; call: embed
  embedUrl: "https://…",   // "https://…" — call: embed markup; call: embed
  embedShare: "Condividi",   // "Share" — call: embed markup; call: embed
  open: "Apri",   // "Open" — call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "Chiudi pagina",   // "Close page" — call: embed markup; call: embed
  wantsToEmbed: "{who} vuole mostrare una pagina da {origin}",   // "{who} wants to show a page from {origin}" — call: embed
  embedWarn: "Pagina esterna: non cifrata, e quel sito vede il tuo indirizzo IP.",   // "External page: not encrypted, and that site sees your IP address." — call: embed markup; call: embed
  noCamera: "senza fotocamera",   // "no camera" — call
  noMedia: "senza fotocamera né microfono",   // "no camera or microphone" — call
  dismiss: "Chiudi",   // "Dismiss" — call: poll markup; call: poll
  raiseHand: "Alza la mano",   // "Raise hand" — call: hand; call: hand markup
  lowerHand: "Abbassa la mano",   // "Lower hand" — call: hand
  poll: "Sondaggi",   // "Polls" — call: poll; call: poll markup; call extensions
  pollLabel: "Sondaggio",   // "Poll" — call: poll markup; call: poll
  pollQuestion: "Domanda",   // "Question" — call: poll markup; call: poll
  pollOptions: "Opzioni, una per riga",   // "Options, one per line" — call: poll markup; call: poll
  pollStart: "Avvia",   // "Start" — call: poll markup; call: poll
  cancel: "Annulla",   // "Cancel" — call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "Chiudi sondaggio",   // "Close poll" — call: poll markup; call: poll
  votes: "{n} voti",   // "{n} votes" — call: poll
  agenda: "Ordine del giorno e timer",   // "Agenda and timer" — call: agenda; call: agenda markup; call extensions
  agendaItem: "Nuovo punto",   // "New agenda item" — call: agenda markup; call: agenda
  add: "Aggiungi",   // "Add" — call: agenda markup
  timerMinutes: "Minuti",   // "Minutes" — call: agenda markup; call: agenda
  start: "Avvia",   // "Start" — pad; plan; call: agenda markup; call: agenda
  stop: "Ferma",   // "Stop" — shared helpers; call: agenda markup; call: agenda
  remove: "Rimuovi",   // "Remove" — form; call: agenda
  record: "Registra in locale",   // "Record locally" — call: record; call: record markup; call extensions
  stopRecording: "Ferma registrazione",   // "Stop recording" — call: record
  recLabel: "Rec",   // "Rec" — call: record markup; call: record
  recordingBy: "⏺ {who} sta registrando",   // "⏺ {who} is recording" — call: record
  pip: "Mostra tutti i video in una finestra flottante",   // "Show all videos in a floating window" — call: pip markup
  pipLabel: "PiP",   // "PiP" — call: pip markup; call: pip
  openPdf: "Apri il PDF (pagina {page})",   // "Open the PDF (page {page})" — call: pdf
  call: "Chiamata",   // "Call" — call; call markup: <section #call>
  controls: "Controlli della chiamata",   // "Call controls" — call markup: <div #bar>
  subtitle: "Chiamata cifrata end-to-end basata su link.",   // "Link-based end-to-end encrypted call." — call markup: <small #subtitle>
  yourName: "Il tuo nome",   // "Your name" — call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "Percorso media",   // "Media path" — call markup: <legend>
  p2p: "P2P",   // "P2P" — call markup: <span>
  relay: "Server",   // "Server" — core/config; call; call markup: <span>
  advanced: "Avanzate",   // "Advanced" — call; call markup: <summary>
  relayServer: "Server relay",   // "Relay server" — call markup: <span>
  iceServers: "Server ICE",   // "ICE servers" — core/config; call markup: <span>
  advancedError: "Impostazioni avanzate",   // "Advanced settings" — call
  notHostPort: "non è un host:porta",   // "not a host:port" — call
  join: "Entra nella chiamata",   // "Join call" — call; call markup: <button #join>
  copied: "✅ Copiato",   // "✅ Copied" — shared helpers
  theme: "Tema chiaro o scuro",   // "Toggle dark or light theme" — core/config; header, shared; call markup: <button>; header markup: <button>
  language: "Lingua",   // "Language" — header markup: <select>
  relayNote: "È configurato un relay TURN: aggiungi ?turnonly all’URL per instradare i media attraverso il server e nascondere il tuo IP agli altri partecipanti.",   // "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants." — call markup: <small #relaynote>
  invalidKey: "Chiave della stanza non valida nell’URL.",   // "Invalid room key in URL." — header, shared
  mic: "Mic",   // "Mic" — call markup: <span>
  cam: "Cam",   // "Cam" — call markup: <span>
  share: "Condividi",   // "Share" — core/config; form; call; files page; call markup: <span>
  chat: "Chat",   // "Chat" — call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "Copia link",   // "Copy link" — call markup: <span>; header markup: <button #copy>
  leave: "Esci",   // "Leave" — call; call markup: <span>
  mute: "Disattiva microfono",   // "Mute microphone" — call; call markup: <button #mic>
  unmute: "Attiva microfono",   // "Unmute microphone" — call
  camOff: "Spegni fotocamera",   // "Turn camera off" — call; call markup: <button #camb>
  camOn: "Accendi fotocamera",   // "Turn camera on" — call
  shareScreen: "Condividi schermo",   // "Share screen" — call; call markup: <button #share>
  stopSharing: "Interrompi condivisione",   // "Stop sharing" — call
  toggleChat: "Mostra/nascondi chat",   // "Toggle chat" — call markup: <button #chatb>
  hideChat: "Nascondi chat",   // "Hide chat" — call
  showChat: "Mostra chat",   // "Show chat" — call
  leaveCall: "Esci dalla chiamata",   // "Leave call" — call markup: <button #leave>
  inCall: "🔒 E2EE · {n} in chiamata",   // "🔒 E2EE · {n} in call" — call
  disconnected: "⚠️ Disconnesso",   // "⚠️ Disconnected" — call
  you: "Tu",   // "You" — call; pad
  yourScreen: "Il tuo schermo",   // "Your screen" — call
  screen: "(schermo)",   // "(screen)" — core/relaymedia; core/roster; call
  message: "Messaggio (cifrato)",   // "Message (encrypted)" — shared helpers; call markup: <input #msg>
  send: "Invia",   // "Send" — call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // "PDF" — pad; call: pdf markup
  sharePdf: "Condividi un PDF",   // "Share a PDF" — call: pdf markup; call: pdf
  accept: "Accetta",   // "Accept" — call: pdf markup; call: pdf
  decline: "Rifiuta",   // "Decline" — call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} vuole condividere \"{name}\" ({size} MB)",   // "{who} wants to share \"{name}\" ({size} MB)" — call: pdf
  receiving: "Ricezione di \"{name}\"… {pct}%",   // "Receiving \"{name}\"… {pct}%" — call: pdf
  pdfTooLarge: "PDF troppo grande (max 50 MB)",   // "PDF too large (50 MB max)" — call: pdf
  prevPage: "Pagina precedente",   // "Previous page" — call: pdf markup; call: pdf
  nextPage: "Pagina successiva",   // "Next page" — call: pdf markup; call: pdf
  fullScreen: "Schermo intero",   // "Full screen" — call: pdf markup; call: pdf
  closePdf: "Chiudi PDF",   // "Close PDF" — call: pdf markup; call: pdf
  sharedPdf: "PDF condiviso",   // "Shared PDF" — call: pdf markup; call: pdf
  draw: "Disegna",   // "Draw" — call: ink markup; call: ink
  drawAria: "Disegna annotazioni",   // "Draw annotations" — call: ink markup; call: ink
  clearInk: "Cancella le mie annotazioni",   // "Clear my annotations" — call: ink markup; call: ink
  annotations: "Annotazioni",   // "Annotations" — call: ink
  pin: "Fissa questo riquadro",   // "Pin this tile" — call
  removeFile: "Rimuovi",   // "Remove" — pad; files page
  removeFileAsk: "Rimuovere {name} per tutti? I suoi byte vengono cancellati dal server.",   // "Remove {name} for everyone? Its bytes are deleted from the server." — pad; files page
  removeFailed: "Impossibile rimuovere ({status})",   // "Could not remove ({status})" — pad; files page
  siteLinks: "Collegamenti",   // "Links" — landing page markup: <nav #homelinks>
  keyTaken: "La chiave di firma di questa stanza è di qualcun altro; il link di sola lettura non è affidabile. Creane una nuova.",   // "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one." — header, shared
  comments: "Commenti",   // "Comments" — pad; pad markup: <aside #padcomments>
  commentOn: "Commenta la selezione",   // "Comment on the selection" — pad markup: <button #commenton>
  commentPh: "Scrivi un commento…",   // "Write a comment…" — pad markup: <textarea #commenttext>
  post: "Pubblica",   // "Post" — core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "Rispondi",   // "Reply" — pad comments
  resolve: "Risolvi",   // "Resolve" — pad comments
  reopen: "Riapri",   // "Reopen" — pad comments
  resolvedN: "Risolti ({n})",   // "Resolved ({n})" — pad comments
  noComments: "Ancora nessun commento. Seleziona del testo per commentarlo.",   // "No comments yet. Select some text to comment on it." — pad markup: <p #threadsempty>
  textChanged: "il testo a cui si riferiva è cambiato",   // "the text this referred to has changed" — pad comments
  toTex: "Converti in LaTeX",   // "Convert to LaTeX" — pad
  toTexConfirm: "Trasformare questo pad in un documento LaTeX? Il markdown viene sostituito dal sorgente LaTeX e l’anteprima diventa il PDF compilato. Non si torna indietro.",   // "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back." — pad
  filesPanel: "File",   // "Files" — pad; pad markup: <aside #padfiles>
  insert: "Inserisci",   // "Insert" — pad
  compiling: "Compilazione…",   // "Compiling…" — pad
  texError: "LaTeX: {err}",   // "LaTeX: {err}" — pad
  typesetting: "Composizione del PDF… ({n} file scaricati)",   // "Typesetting the PDF… ({n} files fetched)" — pad
  pdfFallback: "Composizione fallita, uso la stampa",   // "Typesetting failed, printing instead" — pad
  fediProfile: "Profilo",   // "Profile" — fediverse cards
  queued: "In coda",   // "Queued" — upload queue, widgets
  uploadingShort: "Caricamento…",   // "Uploading…" — upload queue, widgets
  uploads: "Caricamenti",   // "Uploads" — pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "Questo link apre solo questo strumento. Il link della riunione è nella pagina iniziale.",   // "This link opens only this tool. The meeting link is on the landing page." — header markup: <small>
  contents: "Indice",   // "Contents" — pad markup: <nav #toc>
  fWords: "Nuvola di parole",   // "Word cloud" — form: question type, builder and presenting
  fScale: "Scala da 1 a 5",   // "Scale 1 to 5" — form: question type, builder and presenting
  reveal: "Mostra i risultati",   // "Show results" — form
  hideResults: "Nascondi i risultati",   // "Hide results" — form
  resultsHidden: "Risultati nascosti finché non li mostri",   // "Results hidden until you show them" — form
  waiting: "In attesa che chi presenta mostri i risultati.",   // "Waiting for the presenter to show the results." — form; form markup: <p #waiting>
  scan: "Inquadra per rispondere",   // "Scan to answer" — form markup: <small>
  questionOf: "Domanda {n} di {total}",   // "Question {n} of {total}" — form
  average: "Media {n}",   // "Average {n}" — form
  prevQuestion: "Domanda precedente",   // "Previous question" — form markup: <button #fpprev>
  nextQuestion: "Domanda successiva",   // "Next question" — form markup: <button #fpnext>
  presentResults: "Presenta i risultati a schermo intero",   // "Present the results full screen" — form markup: <div #fpresent>
  qr: "Mostra il link come codice QR",   // "Show the link as a QR code" — header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "Codice QR di questo link",   // "QR code of this link" — form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "Trova un orario che vada bene a tutti. Cifrato end-to-end, via link.",   // "Find a time that works for everyone. End-to-end encrypted, by link." — plan markup: <small>
  eventName: "Nome dell’evento",   // "Event name" — plan markup: <span>
  from: "Dalle",   // "From" — core/doc; core/signaling; pad; plan markup: <span>
  to: "Alle",   // "To" — plan markup: <span>
  create: "Crea evento",   // "Create event" — plan; plan markup: <button #go>
  prevMonth: "Mese precedente",   // "Previous month" — plan markup: <button #prev>
  nextMonth: "Mese successivo",   // "Next month" — plan markup: <button #next>
  noDates: "Scegli almeno una data.",   // "Pick at least one date." — plan
  sameTimes: "Inizio e fine devono essere diversi.",   // "Start and end must differ." — plan
  untitledEvent: "Evento senza nome",   // "Untitled event" — plan
  yourAvailability: "La tua disponibilità",   // "Your availability" — plan markup: <span>
  sentAs: "Inviata come {name}.",   // "Sent as {name}." — plan
  group: "Disponibilità del gruppo",   // "Group availability" — plan
  groupTab: "Gruppo ({n})",   // "Group ({n})" — plan
  noAnswersShare: "Ancora nessuna risposta. Condividi il link.",   // "No answers yet. Share the link." — plan
  available: "{n}/{total} disponibili",   // "{n}/{total} available" — plan
  hoverHint: "Passa su uno slot per vedere chi è libero.",   // "Hover a slot to see who is free." — plan
  calHint: "Scegli i giorni: clic, trascina, o maiusc+clic per un intervallo.",   // "Pick the days: click, drag, or shift-click for a range." — plan markup: <small #calhint>
  view: "Vista",   // "View" — pad; header, shared; plan markup: <div>
  answers: "Risposte",   // "Answers" — plan markup: <ul #people>
  gridLabel: "Griglia di disponibilità: un pulsante per quarto d’ora",   // "Availability grid: one button per quarter hour" — plan markup: <div #editor>
  heatLabel: "Mappa della disponibilità del gruppo; i momenti migliori sono elencati sotto",   // "Group availability heatmap; the best times are listed below" — plan markup: <div #heat>
  best: "Momenti migliori",   // "Best times" — plan; plan markup: <b>
  addToCalendar: "Aggiungi {len} al calendario (.ics)",   // "Add {len} to calendar (.ics)" — plan
  length: "Durata della riunione",   // "Meeting length" — plan markup: <span>
  untitledPad: "Pad senza titolo",   // "Untitled pad" — pad
  edit: "Modifica",   // "Edit" — pad
  both: "Entrambi",   // "Both" — pad
  slides: "Slide",   // "Slides" — pad
  viewMode: "Vista",   // "View mode" — pad
  present: "Presenta",   // "Present" — form; pad; form markup: <span>
  presentLabel: "Presenta le slide a schermo intero",   // "Present the slides full screen" — pad
  downloadMd: "Scarica .md",   // "Download .md" — pad
  pdfLabel: "PDF composto con LaTeX: pagine, o una slide per pagina nella vista slide",   // "PDF, typeset with LaTeX: pages, or one slide per page in the slides view" — pad
  attach: "Allega un file",   // "Attach a file" — pad
  history: "Cronologia",   // "History" — pad
  historyLabel: "Versioni precedenti",   // "Earlier versions" — pad
  restore: "Ripristina questa versione",   // "Restore this version" — pad markup: <button #histrestore>
  back: "Torna al pad attuale",   // "Back to the live pad" — pad markup: <button #histback>
  viewing: "Versione salvata {when}",   // "Viewing the version saved {when}" — pad; files page; header, shared
  online: "{n} online: {names}",   // "{n} online: {names}" — pad
  syncing: "Connessione…",   // "Connecting…" — pad
  saved: "Salvato",   // "Saved" — core/doc; pad
  saving: "Salvataggio…",   // "Saving…" — core/doc; pad
  saveFailed: "Non salvato: troppo grande o rifiutato",   // "Not saved: too large or the store refused" — pad
  storeDown: "Il server non riesce a salvare il testo. La modifica è in pausa; il testo resta qui e il salvataggio riprende appena possibile.",   // "The server cannot store the text right now. Editing is paused; your text stays here and saving resumes when it can." — pad
  placeholder: "# Titolo\n\nScrivi markdown qui. Chi ha il link modifica lo stesso testo, cifrato end-to-end.\n\n---\n\nUna riga con --- inizia una nuova slide.",   // "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide." — pad
  slideOf: "Slide {n} di {total}",   // "Slide {n} of {total}" — pad
  exit: "Esci (Esc)",   // "Exit (Esc)" — pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "Testo del pad",   // "Pad text" — pad markup: <textarea #editor>
  previewLabel: "Anteprima",   // "Preview" — pad; pad markup: <div #preview>
  colors: "Colori degli autori",   // "Author colours" — pad
  wroteBy: "Scritto da {names}",   // "Written by {names}" — pad
  viewLink: "Link di sola lettura",   // "View link" — header, shared
  viewCopied: "✅ Link di lettura copiato",   // "✅ View link copied" — header, shared
  readOnly: "Sola lettura",   // "Read-only view" — pad; files page
  noHead: "Questo pad non ha ancora una chiave di modifica; apri prima il link di modifica.",   // "This pad has no editor key yet; open the edit link first." — pad
  noHeadFiles: "Questa pagina file non ha ancora una chiave di modifica; apri prima il link di modifica.",   // "This files page has no editor key yet; open the edit link first." — files page
  shareSubtitle: "Cifrati nel browser. Chi ha il link può aggiungere e scaricare.",   // "Encrypted in your browser. Anyone with the link can add and download." — files page markup; files page; files page markup: <small>
  shareSubtitleView: "Sola lettura. I file vengono decifrati nel browser al download.",   // "Read-only view. Files are decrypted in your browser when you download them." — files page
  dropLabel: "Aggiungi file",   // "Add files" — files page markup: <div #drop>
  dropHint: "Trascina i file qui o",   // "Drop files here or" — files page markup: <span>
  choose: "scegli i file",   // "choose files" — files page markup: <span>
  filesLabel: "File",   // "Files" — files page markup: <ul #files>
  noFiles: "Ancora nessun file.",   // "No files yet." — pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "Scarico {name}",   // "Downloading {name}" — files page
  downloadFile: "Scarica",   // "Download" — pad; files page
  preview: "Anteprima",   // "Preview" — pad; files page
  by: "di {who}",   // "by {who}" — files page
  failed: "Non riuscito: {err}",   // "Failed: {err}" — core/doc; pad; upload queue, widgets
  nFiles: "{n} file, {size}",   // "{n} files, {size}" — files page
  formSubtitle: "Crea un modulo. Le risposte sono cifrate; solo tu le leggi, a meno che non apra i risultati a tutti.",   // "Build a form. Answers are encrypted; only you read them unless you open the results to everyone." — form markup: <small>
  formTitle: "Titolo",   // "Title" — form markup: <span>
  addField: "Aggiungi una domanda",   // "Add a question" — form markup: <span>
  question: "Domanda",   // "Question" — form
  type: "Tipo",   // "Type" — core/fedi; form
  options: "Opzioni, una per riga",   // "Options, one per line" — form
  required: "Obbligatoria",   // "Required" — form
  up: "Sposta su",   // "Move up" — form
  down: "Sposta giù",   // "Move down" — form
  fText: "Testo breve",   // "Short text" — form: question type, builder and presenting
  fLong: "Paragrafo",   // "Paragraph" — form: question type, builder and presenting
  fNumber: "Numero",   // "Number" — form: question type, builder and presenting
  fDate: "Data",   // "Date" — form: question type, builder and presenting
  fOne: "Una scelta",   // "One choice" — form: question type, builder and presenting
  fMany: "Più scelte",   // "Several choices" — form: question type, builder and presenting
  openResults: "Risultati visibili a chi ha il link",   // "Results visible to everyone with the link" — form markup: <span>
  createForm: "Crea modulo",   // "Create form" — form markup: <button #go>
  needFields: "Serve un titolo e almeno una domanda.",   // "Give a title and at least one question." — form
  thanks: "Grazie, la risposta è stata inviata.",   // "Thank you, your answer was sent." — form
  results: "Risultati",   // "Results" — form; form markup: <h2 #rtitle>
  nAnswers: "{n} risposte",   // "{n} answers" — form
  csv: "Scarica CSV",   // "Download CSV" — form markup: <button #csv>
  answered: "Risposto",   // "Answered" — form
  noAnswers: "Ancora nessuna risposta.",   // "No answers yet." — form markup: <p #empty>
  lockedResults: "Solo il proprietario vede le risposte.",   // "Only the owner sees the answers." — form markup: <small #locked>
  shareTitle: "Condividi",   // "Share" — form markup: <h2 #sharetitle>
  copy: "Copia",   // "Copy" — shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "Manda questo link a chi deve rispondere.",   // "Send this link to the people who should answer." — form markup: <small>
  ownerHint: "Il tuo link da proprietario: contiene la chiave che apre le risposte. Tienilo privato.",   // "Your owner link: it holds the key that opens the answers. Keep it private." — form markup: <small>
};
export default dict;
