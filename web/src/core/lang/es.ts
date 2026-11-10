// Español. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows and give the English source.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "Actualizar",   // "Refresh" — fediverse cards
  snapAt: "instantánea {when}",   // "snapshot {when}" — fediverse cards
  noSnap: "Aún sin instantánea: un editor debe abrir esta página.",   // "No snapshot yet: an editor needs to open this page." — fediverse cards
  snapFail: "No se pudo leer de la instancia (no es público, o la instancia no está permitida en este sitio).",   // "Could not fetch this from the instance (not public, or the instance is not allowed by this site)." — fediverse cards
  fediPost: "Publicación",   // "Post" — fediverse cards
  fediVideo: "Vídeo",   // "Video" — fediverse cards
  fediEvent: "Evento",   // "Event" — fediverse cards
  homeTagline: "Suite de colaboración anónima, cifrada de extremo a extremo.",   // "End-to-end encrypted, anonymous collaboration suite." — landing page
  desc_meet: "Videollamadas con chat, pantalla y PDF compartidos, anotaciones y encuestas.",   // "Video calls with chat, screen and PDF sharing, annotations and polls." — landing card, under the tool name
  desc_when: "Encuentra una hora que les vaya bien a todos.",   // "Find a time that works for everyone." — landing card, under the tool name
  desc_pad: "Escribid juntos: markdown, diapositivas, comentarios, adjuntos.",   // "Write together: markdown, slides, comments, attachments." — landing card, under the tool name
  desc_share: "Compartir y recoger archivos.",   // "File sharing and collection." — landing card, under the tool name
  desc_form: "Recoge información, respuestas y encuestas, en privado o en público.",   // "Collect information, answers and surveys, privately or publicly." — landing card, under the tool name
  micMuted: "Micrófono silenciado",   // "Microphone muted" — call
  camIsOff: "Cámara apagada",   // "Camera off" — call
  new: "Nuevo",   // "New" — header markup: <a #new>
  toolbar: "Herramientas",   // "Tools" — landing page; header markup: <div #toolbar>
  closed: "cerrado",   // "closed" — core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "Llamada",   // "Call" — tool name: header navigation, landing cards, page titles
  app_when: "Planificar",   // "Plan" — tool name: header navigation, landing cards, page titles
  app_pad: "Pad",   // "Pad" — tool name: header navigation, landing cards, page titles
  app_share: "Archivos",   // "Files" — files page
  app_form: "Formulario",   // "Form" — form
  otherApps: "Otras herramientas para esta reunión",   // "Other tools for this meeting" — header markup: <nav #nav>
  noApp: "No existe esa aplicación.",   // "No such app." — header, shared
  guest: "Invitado",   // "Guest" — call; pad; pad comments; header, shared
  detected: "(detectada)",   // "(detected)" — upload queue, widgets
  change: "Cambiar",   // "Change" — upload queue, widgets
  timezone: "Zona horaria",   // "Time zone" — upload queue, widgets
  createFailed: "No se pudo crear ({status}).",   // "Could not create it ({status})." — form; plan; header, shared
  sendFailed: "No se pudo enviar ({status}).",   // "Could not send ({status})." — form; plan
  answerBy: "Responder antes del {date}",   // "Answer by {date}" — form; plan
  answerByOpt: "Responder antes de (opcional)",   // "Answer by (optional)" — plan markup: <span>; form markup: <span>
  closedSince: "Cerrado desde el {date}. Las respuestas posteriores no cuentan.",   // "Closed since {date}. Answers sent after that are not counted." — form; plan
  noMicrophone: "Sin micrófono",   // "No microphone" — call
  blur: "Desenfocar mi fondo",   // "Blur my background" — call markup: <button #blurb>
  blurLabel: "Desenfocar fondo",   // "Blur background" — call markup: <span>
  settings: "Ajustes",   // "Settings" — call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "Ajustes",   // "Settings" — call markup: <span>
  drawing: "Dibujo activado",   // "Drawing on" — call: ink markup; call: ink
  clearInkLabel: "Borrar los míos",   // "Clear mine" — call: ink markup; call: ink
  done: "Listo",   // "Done" — call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "Abrir en una pestaña nueva",   // "Open in a new tab" — call: embed markup; call: embed
  embedBlank: "Si queda en blanco, ese sitio no permite incrustarlo.",   // "If it stays blank, that site does not allow embedding." — call: embed markup; call: embed
  agendaLabel: "Agenda",   // "Agenda" — call: agenda markup; call: agenda
  themeLabel: "Tema",   // "Theme" — call markup: <span>
  tools: "Herramientas",   // "Tools" — header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "Herramientas",   // "Tools" — call markup: <span>
  embed: "Compartir una página web",   // "Share a web page" — call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "Página",   // "Page" — call: embed markup; call: embed
  embedUrl: "https://…",   // "https://…" — call: embed markup; call: embed
  embedShare: "Compartir",   // "Share" — call: embed markup; call: embed
  open: "Abrir",   // "Open" — call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "Cerrar página",   // "Close page" — call: embed markup; call: embed
  wantsToEmbed: "{who} quiere mostrar una página de {origin}",   // "{who} wants to show a page from {origin}" — call: embed
  embedWarn: "Página externa: no cifrada, y ese sitio ve tu dirección IP.",   // "External page: not encrypted, and that site sees your IP address." — call: embed markup; call: embed
  noCamera: "sin cámara",   // "no camera" — call
  noMedia: "sin cámara ni micrófono",   // "no camera or microphone" — call
  dismiss: "Cerrar",   // "Dismiss" — call: poll markup; call: poll
  raiseHand: "Levantar la mano",   // "Raise hand" — call: hand; call: hand markup
  lowerHand: "Bajar la mano",   // "Lower hand" — call: hand
  poll: "Encuestas",   // "Polls" — call: poll; call: poll markup; call extensions
  pollLabel: "Encuesta",   // "Poll" — call: poll markup; call: poll
  pollQuestion: "Pregunta",   // "Question" — call: poll markup; call: poll
  pollOptions: "Opciones, una por línea",   // "Options, one per line" — call: poll markup; call: poll
  pollStart: "Iniciar",   // "Start" — call: poll markup; call: poll
  cancel: "Cancelar",   // "Cancel" — call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "Cerrar encuesta",   // "Close poll" — call: poll markup; call: poll
  votes: "{n} votos",   // "{n} votes" — call: poll
  agenda: "Orden del día y temporizador",   // "Agenda and timer" — call: agenda; call: agenda markup; call extensions
  agendaItem: "Nuevo punto",   // "New agenda item" — call: agenda markup; call: agenda
  add: "Añadir",   // "Add" — call: agenda markup
  timerMinutes: "Minutos",   // "Minutes" — call: agenda markup; call: agenda
  start: "Iniciar",   // "Start" — pad; plan; call: agenda markup; call: agenda
  stop: "Detener",   // "Stop" — shared helpers; call: agenda markup; call: agenda
  remove: "Quitar",   // "Remove" — form; call: agenda
  record: "Grabar localmente",   // "Record locally" — call: record; call: record markup; call extensions
  stopRecording: "Detener grabación",   // "Stop recording" — call: record
  recLabel: "Rec",   // "Rec" — call: record markup; call: record
  recordingBy: "⏺ {who} está grabando",   // "⏺ {who} is recording" — call: record
  pip: "Mostrar todos los vídeos en una ventana flotante",   // "Show all videos in a floating window" — call: pip markup
  pipLabel: "PiP",   // "PiP" — call: pip markup; call: pip
  openPdf: "Abrir el PDF (página {page})",   // "Open the PDF (page {page})" — call: pdf
  call: "Llamada",   // "Call" — call; call markup: <section #call>
  controls: "Controles de la llamada",   // "Call controls" — call markup: <div #bar>
  subtitle: "Llamada cifrada de extremo a extremo basada en enlace.",   // "Link-based end-to-end encrypted call." — call markup: <small #subtitle>
  yourName: "Tu nombre",   // "Your name" — call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "Ruta de medios",   // "Media path" — call markup: <legend>
  p2p: "P2P",   // "P2P" — call markup: <span>
  relay: "Servidor",   // "Server" — core/config; call; call markup: <span>
  advanced: "Avanzado",   // "Advanced" — call; call markup: <summary>
  relayServer: "Servidor relay",   // "Relay server" — call markup: <span>
  iceServers: "Servidores ICE",   // "ICE servers" — core/config; call markup: <span>
  advancedError: "Ajustes avanzados",   // "Advanced settings" — call
  notHostPort: "no es un host:puerto",   // "not a host:port" — call
  join: "Unirse a la llamada",   // "Join call" — call; call markup: <button #join>
  copied: "✅ Copiado",   // "✅ Copied" — shared helpers
  theme: "Tema claro u oscuro",   // "Toggle dark or light theme" — core/config; header, shared; call markup: <button>; header markup: <button>
  language: "Idioma",   // "Language" — header markup: <select>
  relayNote: "Hay un relay TURN configurado: añade ?turnonly a la URL para enviar los medios por el servidor y ocultar tu IP a los demás participantes.",   // "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants." — call markup: <small #relaynote>
  invalidKey: "Clave de sala no válida en la URL.",   // "Invalid room key in URL." — header, shared
  mic: "Micro",   // "Mic" — call markup: <span>
  cam: "Cámara",   // "Cam" — call markup: <span>
  share: "Compartir",   // "Share" — core/config; form; call; files page; call markup: <span>
  chat: "Chat",   // "Chat" — call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "Copiar enlace",   // "Copy link" — call markup: <span>; header markup: <button #copy>
  leave: "Salir",   // "Leave" — call; call markup: <span>
  mute: "Silenciar micrófono",   // "Mute microphone" — call; call markup: <button #mic>
  unmute: "Activar micrófono",   // "Unmute microphone" — call
  camOff: "Apagar cámara",   // "Turn camera off" — call; call markup: <button #camb>
  camOn: "Encender cámara",   // "Turn camera on" — call
  shareScreen: "Compartir pantalla",   // "Share screen" — call; call markup: <button #share>
  stopSharing: "Dejar de compartir",   // "Stop sharing" — call
  toggleChat: "Mostrar/ocultar chat",   // "Toggle chat" — call markup: <button #chatb>
  hideChat: "Ocultar chat",   // "Hide chat" — call
  showChat: "Mostrar chat",   // "Show chat" — call
  leaveCall: "Salir de la llamada",   // "Leave call" — call markup: <button #leave>
  inCall: "🔒 E2EE · {n} en la llamada",   // "🔒 E2EE · {n} in call" — call
  disconnected: "⚠️ Desconectado",   // "⚠️ Disconnected" — call
  you: "Tú",   // "You" — call; pad
  yourScreen: "Tu pantalla",   // "Your screen" — call
  screen: "(pantalla)",   // "(screen)" — core/relaymedia; core/roster; call
  message: "Mensaje (cifrado)",   // "Message (encrypted)" — shared helpers; call markup: <input #msg>
  send: "Enviar",   // "Send" — call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // "PDF" — pad; call: pdf markup
  sharePdf: "Compartir un PDF",   // "Share a PDF" — call: pdf markup; call: pdf
  accept: "Aceptar",   // "Accept" — call: pdf markup; call: pdf
  decline: "Rechazar",   // "Decline" — call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} quiere compartir \"{name}\" ({size} MB)",   // "{who} wants to share \"{name}\" ({size} MB)" — call: pdf
  receiving: "Recibiendo \"{name}\"… {pct}%",   // "Receiving \"{name}\"… {pct}%" — call: pdf
  pdfTooLarge: "PDF demasiado grande (máx. 50 MB)",   // "PDF too large (50 MB max)" — call: pdf
  prevPage: "Página anterior",   // "Previous page" — call: pdf markup; call: pdf
  nextPage: "Página siguiente",   // "Next page" — call: pdf markup; call: pdf
  fullScreen: "Pantalla completa",   // "Full screen" — call: pdf markup; call: pdf
  closePdf: "Cerrar PDF",   // "Close PDF" — call: pdf markup; call: pdf
  sharedPdf: "PDF compartido",   // "Shared PDF" — call: pdf markup; call: pdf
  draw: "Dibujar",   // "Draw" — call: ink markup; call: ink
  drawAria: "Dibujar anotaciones",   // "Draw annotations" — call: ink markup; call: ink
  clearInk: "Borrar mis anotaciones",   // "Clear my annotations" — call: ink markup; call: ink
  annotations: "Anotaciones",   // "Annotations" — call: ink
  pin: "Fijar este mosaico",   // "Pin this tile" — call
  removeFile: "Quitar",   // "Remove" — pad; files page
  removeFileAsk: "¿Quitar {name} para todos? Sus bytes se borran del servidor.",   // "Remove {name} for everyone? Its bytes are deleted from the server." — pad; files page
  removeFailed: "No se pudo quitar ({status})",   // "Could not remove ({status})" — pad; files page
  siteLinks: "Enlaces",   // "Links" — landing page markup: <nav #homelinks>
  keyTaken: "Otra persona tiene la clave de firma de esta sala; su enlace de solo lectura no es fiable. Crea una nueva.",   // "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one." — header, shared
  comments: "Comentarios",   // "Comments" — pad; pad markup: <aside #padcomments>
  commentOn: "Comentar la selección",   // "Comment on the selection" — pad markup: <button #commenton>
  commentPh: "Escribe un comentario…",   // "Write a comment…" — pad markup: <textarea #commenttext>
  post: "Publicar",   // "Post" — core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "Responder",   // "Reply" — pad comments
  resolve: "Resolver",   // "Resolve" — pad comments
  reopen: "Reabrir",   // "Reopen" — pad comments
  resolvedN: "Resueltos ({n})",   // "Resolved ({n})" — pad comments
  noComments: "Aún no hay comentarios. Selecciona texto para comentarlo.",   // "No comments yet. Select some text to comment on it." — pad markup: <p #threadsempty>
  textChanged: "el texto al que se refería ha cambiado",   // "the text this referred to has changed" — pad comments
  toTex: "Convertir a LaTeX",   // "Convert to LaTeX" — pad
  toTexConfirm: "¿Convertir este pad en un documento LaTeX? El markdown se sustituye por su fuente LaTeX y la vista previa pasa a ser el PDF compilado. No hay vuelta atrás.",   // "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back." — pad
  filesPanel: "Archivos",   // "Files" — pad; pad markup: <aside #padfiles>
  insert: "Insertar",   // "Insert" — pad
  compiling: "Compilando…",   // "Compiling…" — pad
  texError: "LaTeX: {err}",   // "LaTeX: {err}" — pad
  typesetting: "Componiendo el PDF… ({n} archivos recibidos)",   // "Typesetting the PDF… ({n} files fetched)" — pad
  pdfFallback: "La composición falló, se imprime en su lugar",   // "Typesetting failed, printing instead" — pad
  fediProfile: "Perfil",   // "Profile" — fediverse cards
  queued: "En cola",   // "Queued" — upload queue, widgets
  uploadingShort: "Subiendo…",   // "Uploading…" — upload queue, widgets
  uploads: "Subidas",   // "Uploads" — pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "Este enlace abre solo esta herramienta. El enlace de la reunión está en la página de inicio.",   // "This link opens only this tool. The meeting link is on the landing page." — header markup: <small>
  contents: "Índice",   // "Contents" — pad markup: <nav #toc>
  fWords: "Nube de palabras",   // "Word cloud" — form: question type, builder and presenting
  fScale: "Escala de 1 a 5",   // "Scale 1 to 5" — form: question type, builder and presenting
  reveal: "Mostrar resultados",   // "Show results" — form
  hideResults: "Ocultar resultados",   // "Hide results" — form
  resultsHidden: "Resultados ocultos hasta que los muestres",   // "Results hidden until you show them" — form
  waiting: "Esperando a que quien presenta muestre los resultados.",   // "Waiting for the presenter to show the results." — form; form markup: <p #waiting>
  scan: "Escanea para responder",   // "Scan to answer" — form markup: <small>
  questionOf: "Pregunta {n} de {total}",   // "Question {n} of {total}" — form
  average: "Media {n}",   // "Average {n}" — form
  prevQuestion: "Pregunta anterior",   // "Previous question" — form markup: <button #fpprev>
  nextQuestion: "Pregunta siguiente",   // "Next question" — form markup: <button #fpnext>
  presentResults: "Presentar los resultados a pantalla completa",   // "Present the results full screen" — form markup: <div #fpresent>
  qr: "Mostrar el enlace como código QR",   // "Show the link as a QR code" — header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "Código QR de este enlace",   // "QR code of this link" — form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "Encuentra una hora que les venga bien a todos. Cifrado de extremo a extremo, por enlace.",   // "Find a time that works for everyone. End-to-end encrypted, by link." — plan markup: <small>
  eventName: "Nombre del evento",   // "Event name" — plan markup: <span>
  from: "Desde",   // "From" — core/doc; core/signaling; pad; plan markup: <span>
  to: "Hasta",   // "To" — plan markup: <span>
  create: "Crear evento",   // "Create event" — plan; plan markup: <button #go>
  prevMonth: "Mes anterior",   // "Previous month" — plan markup: <button #prev>
  nextMonth: "Mes siguiente",   // "Next month" — plan markup: <button #next>
  noDates: "Elige al menos una fecha.",   // "Pick at least one date." — plan
  sameTimes: "Inicio y fin deben ser distintos.",   // "Start and end must differ." — plan
  untitledEvent: "Evento sin nombre",   // "Untitled event" — plan
  yourAvailability: "Tu disponibilidad",   // "Your availability" — plan markup: <span>
  sentAs: "Enviada como {name}.",   // "Sent as {name}." — plan
  group: "Disponibilidad del grupo",   // "Group availability" — plan
  groupTab: "Grupo ({n})",   // "Group ({n})" — plan
  noAnswersShare: "Aún no hay respuestas. Comparte el enlace.",   // "No answers yet. Share the link." — plan
  available: "{n}/{total} disponibles",   // "{n}/{total} available" — plan
  hoverHint: "Pasa por una franja para ver quién está libre.",   // "Hover a slot to see who is free." — plan
  calHint: "Elige los días: clic, arrastrar, o mayús+clic para un rango.",   // "Pick the days: click, drag, or shift-click for a range." — plan markup: <small #calhint>
  view: "Vista",   // "View" — pad; header, shared; plan markup: <div>
  answers: "Respuestas",   // "Answers" — plan markup: <ul #people>
  gridLabel: "Cuadrícula de disponibilidad: un botón por cuarto de hora",   // "Availability grid: one button per quarter hour" — plan markup: <div #editor>
  heatLabel: "Mapa de disponibilidad del grupo; las mejores horas se listan debajo",   // "Group availability heatmap; the best times are listed below" — plan markup: <div #heat>
  best: "Mejores horas",   // "Best times" — plan; plan markup: <b>
  addToCalendar: "Añadir {len} al calendario (.ics)",   // "Add {len} to calendar (.ics)" — plan
  length: "Duración de la reunión",   // "Meeting length" — plan markup: <span>
  untitledPad: "Pad sin título",   // "Untitled pad" — pad
  edit: "Editar",   // "Edit" — pad
  both: "Ambos",   // "Both" — pad
  slides: "Diapositivas",   // "Slides" — pad
  viewMode: "Modo de vista",   // "View mode" — pad
  present: "Presentar",   // "Present" — form; pad; form markup: <span>
  presentLabel: "Presentar las diapositivas a pantalla completa",   // "Present the slides full screen" — pad
  downloadMd: "Descargar .md",   // "Download .md" — pad
  pdfLabel: "PDF compuesto con LaTeX: páginas, o una diapositiva por página en la vista de diapositivas",   // "PDF, typeset with LaTeX: pages, or one slide per page in the slides view" — pad
  attach: "Adjuntar un archivo",   // "Attach a file" — pad
  history: "Historial",   // "History" — pad
  historyLabel: "Versiones anteriores",   // "Earlier versions" — pad
  restore: "Restaurar esta versión",   // "Restore this version" — pad markup: <button #histrestore>
  back: "Volver al pad actual",   // "Back to the live pad" — pad markup: <button #histback>
  viewing: "Versión guardada {when}",   // "Viewing the version saved {when}" — pad; files page; header, shared
  online: "{n} en línea: {names}",   // "{n} online: {names}" — pad
  syncing: "Conectando…",   // "Connecting…" — pad
  saved: "Guardado",   // "Saved" — core/doc; pad
  saving: "Guardando…",   // "Saving…" — core/doc; pad
  saveFailed: "No guardado: demasiado grande o rechazado",   // "Not saved: too large or the store refused" — pad
  placeholder: "# Título\n\nEscribe markdown aquí. Quien tenga el enlace edita el mismo texto, cifrado de extremo a extremo.\n\n---\n\nUna línea con --- empieza una nueva diapositiva.",   // "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide." — pad
  slideOf: "Diapositiva {n} de {total}",   // "Slide {n} of {total}" — pad
  exit: "Salir (Esc)",   // "Exit (Esc)" — pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "Texto del pad",   // "Pad text" — pad markup: <textarea #editor>
  previewLabel: "Vista previa",   // "Preview" — pad; pad markup: <div #preview>
  colors: "Colores de autor",   // "Author colours" — pad
  wroteBy: "Escrito por {names}",   // "Written by {names}" — pad
  viewLink: "Enlace de solo lectura",   // "View link" — header, shared
  viewCopied: "✅ Enlace de lectura copiado",   // "✅ View link copied" — header, shared
  readOnly: "Solo lectura",   // "Read-only view" — pad; files page
  noHead: "Este pad aún no tiene clave de edición; abre primero el enlace de edición.",   // "This pad has no editor key yet; open the edit link first." — pad
  shareSubtitle: "Cifrado en tu navegador. Quien tenga el enlace puede añadir y descargar.",   // "Encrypted in your browser. Anyone with the link can add and download." — files page markup: <small>
  dropLabel: "Añadir archivos",   // "Add files" — files page markup: <div #drop>
  dropHint: "Suelta archivos aquí o",   // "Drop files here or" — files page markup: <span>
  choose: "elige archivos",   // "choose files" — files page markup: <span>
  filesLabel: "Archivos",   // "Files" — files page markup: <ul #files>
  noFiles: "Aún no hay archivos.",   // "No files yet." — pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "Descargando {name}",   // "Downloading {name}" — files page
  downloadFile: "Descargar",   // "Download" — pad; files page
  preview: "Vista previa",   // "Preview" — pad; files page
  by: "de {who}",   // "by {who}" — files page
  failed: "Error: {err}",   // "Failed: {err}" — core/doc; pad; upload queue, widgets
  nFiles: "{n} archivos, {size}",   // "{n} files, {size}" — files page
  formSubtitle: "Crea un formulario. Las respuestas van cifradas; solo tú las lees, salvo que abras los resultados a todos.",   // "Build a form. Answers are encrypted; only you read them unless you open the results to everyone." — form markup: <small>
  formTitle: "Título",   // "Title" — form markup: <span>
  addField: "Añadir una pregunta",   // "Add a question" — form markup: <span>
  question: "Pregunta",   // "Question" — form
  type: "Tipo",   // "Type" — core/fedi; form
  options: "Opciones, una por línea",   // "Options, one per line" — form
  required: "Obligatoria",   // "Required" — form
  up: "Subir",   // "Move up" — form
  down: "Bajar",   // "Move down" — form
  fText: "Texto corto",   // "Short text" — form: question type, builder and presenting
  fLong: "Párrafo",   // "Paragraph" — form: question type, builder and presenting
  fNumber: "Número",   // "Number" — form: question type, builder and presenting
  fDate: "Fecha",   // "Date" — form: question type, builder and presenting
  fOne: "Una opción",   // "One choice" — form: question type, builder and presenting
  fMany: "Varias opciones",   // "Several choices" — form: question type, builder and presenting
  openResults: "Resultados visibles para quien tenga el enlace",   // "Results visible to everyone with the link" — form markup: <span>
  createForm: "Crear formulario",   // "Create form" — form markup: <button #go>
  needFields: "Pon un título y al menos una pregunta.",   // "Give a title and at least one question." — form
  thanks: "Gracias, tu respuesta se ha enviado.",   // "Thank you, your answer was sent." — form
  results: "Resultados",   // "Results" — form; form markup: <h2 #rtitle>
  nAnswers: "{n} respuestas",   // "{n} answers" — form
  csv: "Descargar CSV",   // "Download CSV" — form markup: <button #csv>
  answered: "Respondido",   // "Answered" — form
  noAnswers: "Aún no hay respuestas.",   // "No answers yet." — form markup: <p #empty>
  lockedResults: "Solo el propietario ve las respuestas.",   // "Only the owner sees the answers." — form markup: <small #locked>
  shareTitle: "Compartir",   // "Share" — form markup: <h2 #sharetitle>
  copy: "Copiar",   // "Copy" — shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "Envía este enlace a quienes deban responder.",   // "Send this link to the people who should answer." — form markup: <small>
  ownerHint: "Tu enlace de propietario: contiene la clave que abre las respuestas. Mantenlo privado.",   // "Your owner link: it holds the key that opens the answers. Keep it private." — form markup: <small>
};
export default dict;
