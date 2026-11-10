// English. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "Refresh",   // fediverse cards
  snapAt: "snapshot {when}",   // fediverse cards
  noSnap: "No snapshot yet: an editor needs to open this page.",   // fediverse cards
  snapFail: "Could not fetch this from the instance (not public, or the instance is not allowed by this site).",   // fediverse cards
  fediPost: "Post",   // fediverse cards
  fediVideo: "Video",   // fediverse cards
  fediEvent: "Event",   // fediverse cards
  homeTagline: "End-to-end encrypted, anonymous collaboration suite.",   // landing page
  desc_meet: "Video calls with chat, screen and PDF sharing, annotations and polls.",   // landing card, under the tool name
  desc_when: "Find a time that works for everyone.",   // landing card, under the tool name
  desc_pad: "Write together: markdown, slides, comments, attachments.",   // landing card, under the tool name
  desc_share: "File sharing and collection.",   // landing card, under the tool name
  desc_form: "Collect information, answers and surveys, privately or publicly.",   // landing card, under the tool name
  micMuted: "Microphone muted",   // call
  camIsOff: "Camera off",   // call
  new: "New",   // header markup: <a #new>
  toolbar: "Tools",   // landing page; header markup: <div #toolbar>
  closed: "closed",   // core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "Call",   // tool name: header navigation, landing cards, page titles
  app_when: "Plan",   // tool name: header navigation, landing cards, page titles
  app_pad: "Pad",   // tool name: header navigation, landing cards, page titles
  app_share: "Files",   // files page
  app_form: "Form",   // form
  otherApps: "Other tools for this meeting",   // header markup: <nav #nav>
  noApp: "No such app.",   // header, shared
  guest: "Guest",   // call; pad; pad comments; header, shared
  detected: "(detected)",   // upload queue, widgets
  change: "Change",   // upload queue, widgets
  timezone: "Time zone",   // upload queue, widgets
  createFailed: "Could not create it ({status}).",   // form; plan; header, shared
  sendFailed: "Could not send ({status}).",   // form; plan
  answerBy: "Answer by {date}",   // form; plan
  answerByOpt: "Answer by (optional)",   // plan markup: <span>; form markup: <span>
  closedSince: "Closed since {date}. Answers sent after that are not counted.",   // form; plan
  noMicrophone: "No microphone",   // call
  blur: "Blur my background",   // call markup: <button #blurb>
  blurLabel: "Blur background",   // call markup: <span>
  settings: "Settings",   // call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "Settings",   // call markup: <span>
  drawing: "Drawing on",   // call: ink markup; call: ink
  clearInkLabel: "Clear mine",   // call: ink markup; call: ink
  done: "Done",   // call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "Open in a new tab",   // call: embed markup; call: embed
  embedBlank: "If it stays blank, that site does not allow embedding.",   // call: embed markup; call: embed
  agendaLabel: "Agenda",   // call: agenda markup; call: agenda
  themeLabel: "Theme",   // call markup: <span>
  tools: "Tools",   // header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "Tools",   // call markup: <span>
  embed: "Share a web page",   // call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "Page",   // call: embed markup; call: embed
  embedUrl: "https://…",   // call: embed markup; call: embed
  embedShare: "Share",   // call: embed markup; call: embed
  open: "Open",   // call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "Close page",   // call: embed markup; call: embed
  wantsToEmbed: "{who} wants to show a page from {origin}",   // call: embed
  embedWarn: "External page: not encrypted, and that site sees your IP address.",   // call: embed markup; call: embed
  noCamera: "no camera",   // call
  noMedia: "no camera or microphone",   // call
  dismiss: "Dismiss",   // call: poll markup; call: poll
  raiseHand: "Raise hand",   // call: hand; call: hand markup
  lowerHand: "Lower hand",   // call: hand
  poll: "Polls",   // call: poll; call: poll markup; call extensions
  pollLabel: "Poll",   // call: poll markup; call: poll
  pollQuestion: "Question",   // call: poll markup; call: poll
  pollOptions: "Options, one per line",   // call: poll markup; call: poll
  pollStart: "Start",   // call: poll markup; call: poll
  cancel: "Cancel",   // call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "Close poll",   // call: poll markup; call: poll
  votes: "{n} votes",   // call: poll
  agenda: "Agenda and timer",   // call: agenda; call: agenda markup; call extensions
  agendaItem: "New agenda item",   // call: agenda markup; call: agenda
  add: "Add",   // call: agenda markup
  timerMinutes: "Minutes",   // call: agenda markup; call: agenda
  start: "Start",   // pad; plan; call: agenda markup; call: agenda
  stop: "Stop",   // shared helpers; call: agenda markup; call: agenda
  remove: "Remove",   // form; call: agenda
  record: "Record locally",   // call: record; call: record markup; call extensions
  stopRecording: "Stop recording",   // call: record
  recLabel: "Rec",   // call: record markup; call: record
  recordingBy: "⏺ {who} is recording",   // call: record
  pip: "Show all videos in a floating window",   // call: pip markup
  pipLabel: "PiP",   // call: pip markup; call: pip
  openPdf: "Open the PDF (page {page})",   // call: pdf
  call: "Call",   // call; call markup: <section #call>
  controls: "Call controls",   // call markup: <div #bar>
  subtitle: "Link-based end-to-end encrypted call.",   // call markup: <small #subtitle>
  yourName: "Your name",   // call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "Media path",   // call markup: <legend>
  p2p: "P2P",   // call markup: <span>
  relay: "Server",   // core/config; call; call markup: <span>
  advanced: "Advanced",   // call; call markup: <summary>
  relayServer: "Relay server",   // call markup: <span>
  iceServers: "ICE servers",   // core/config; call markup: <span>
  advancedError: "Advanced settings",   // call
  notHostPort: "not a host:port",   // call
  join: "Join call",   // call; call markup: <button #join>
  copied: "✅ Copied",   // shared helpers
  theme: "Toggle dark or light theme",   // core/config; header, shared; call markup: <button>; header markup: <button>
  language: "Language",   // header markup: <select>
  relayNote: "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants.",   // call markup: <small #relaynote>
  invalidKey: "Invalid room key in URL.",   // header, shared
  mic: "Mic",   // call markup: <span>
  cam: "Cam",   // call markup: <span>
  share: "Share",   // core/config; form; call; files page; call markup: <span>
  chat: "Chat",   // call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "Copy link",   // call markup: <span>; header markup: <button #copy>
  leave: "Leave",   // call; call markup: <span>
  mute: "Mute microphone",   // call; call markup: <button #mic>
  unmute: "Unmute microphone",   // call
  camOff: "Turn camera off",   // call; call markup: <button #camb>
  camOn: "Turn camera on",   // call
  shareScreen: "Share screen",   // call; call markup: <button #share>
  stopSharing: "Stop sharing",   // call
  toggleChat: "Toggle chat",   // call markup: <button #chatb>
  hideChat: "Hide chat",   // call
  showChat: "Show chat",   // call
  leaveCall: "Leave call",   // call markup: <button #leave>
  inCall: "🔒 E2EE · {n} in call",   // call
  disconnected: "⚠️ Disconnected",   // call
  you: "You",   // call; pad
  yourScreen: "Your screen",   // call
  screen: "(screen)",   // core/relaymedia; core/roster; call
  message: "Message (encrypted)",   // shared helpers; call markup: <input #msg>
  send: "Send",   // call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // pad; call: pdf markup
  sharePdf: "Share a PDF",   // call: pdf markup; call: pdf
  accept: "Accept",   // call: pdf markup; call: pdf
  decline: "Decline",   // call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} wants to share \"{name}\" ({size} MB)",   // call: pdf
  receiving: "Receiving \"{name}\"… {pct}%",   // call: pdf
  pdfTooLarge: "PDF too large (50 MB max)",   // call: pdf
  prevPage: "Previous page",   // call: pdf markup; call: pdf
  nextPage: "Next page",   // call: pdf markup; call: pdf
  fullScreen: "Full screen",   // call: pdf markup; call: pdf
  closePdf: "Close PDF",   // call: pdf markup; call: pdf
  sharedPdf: "Shared PDF",   // call: pdf markup; call: pdf
  draw: "Draw",   // call: ink markup; call: ink
  drawAria: "Draw annotations",   // call: ink markup; call: ink
  clearInk: "Clear my annotations",   // call: ink markup; call: ink
  annotations: "Annotations",   // call: ink
  pin: "Pin this tile",   // call
  removeFile: "Remove",   // pad; files page
  removeFileAsk: "Remove {name} for everyone? Its bytes are deleted from the server.",   // pad; files page
  removeFailed: "Could not remove ({status})",   // pad; files page
  siteLinks: "Links",   // landing page markup: <nav #homelinks>
  keyTaken: "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one.",   // header, shared
  comments: "Comments",   // pad; pad markup: <aside #padcomments>
  commentOn: "Comment on the selection",   // pad markup: <button #commenton>
  commentPh: "Write a comment…",   // pad markup: <textarea #commenttext>
  post: "Post",   // core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "Reply",   // pad comments
  resolve: "Resolve",   // pad comments
  reopen: "Reopen",   // pad comments
  resolvedN: "Resolved ({n})",   // pad comments
  noComments: "No comments yet. Select some text to comment on it.",   // pad markup: <p #threadsempty>
  textChanged: "the text this referred to has changed",   // pad comments
  toTex: "Convert to LaTeX",   // pad
  toTexConfirm: "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back.",   // pad
  filesPanel: "Files",   // pad; pad markup: <aside #padfiles>
  insert: "Insert",   // pad
  compiling: "Compiling…",   // pad
  texError: "LaTeX: {err}",   // pad
  typesetting: "Typesetting the PDF… ({n} files fetched)",   // pad
  pdfFallback: "Typesetting failed, printing instead",   // pad
  fediProfile: "Profile",   // fediverse cards
  queued: "Queued",   // upload queue, widgets
  uploadingShort: "Uploading…",   // upload queue, widgets
  uploads: "Uploads",   // pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "This link opens only this tool. The meeting link is on the landing page.",   // header markup: <small>
  contents: "Contents",   // pad markup: <nav #toc>
  fWords: "Word cloud",   // form: question type, builder and presenting
  fScale: "Scale 1 to 5",   // form: question type, builder and presenting
  reveal: "Show results",   // form
  hideResults: "Hide results",   // form
  resultsHidden: "Results hidden until you show them",   // form
  waiting: "Waiting for the presenter to show the results.",   // form; form markup: <p #waiting>
  scan: "Scan to answer",   // form markup: <small>
  questionOf: "Question {n} of {total}",   // form
  average: "Average {n}",   // form
  prevQuestion: "Previous question",   // form markup: <button #fpprev>
  nextQuestion: "Next question",   // form markup: <button #fpnext>
  presentResults: "Present the results full screen",   // form markup: <div #fpresent>
  qr: "Show the link as a QR code",   // header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "QR code of this link",   // form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "Find a time that works for everyone. End-to-end encrypted, by link.",   // plan markup: <small>
  eventName: "Event name",   // plan markup: <span>
  from: "From",   // core/doc; core/signaling; pad; plan markup: <span>
  to: "To",   // plan markup: <span>
  create: "Create event",   // plan; plan markup: <button #go>
  prevMonth: "Previous month",   // plan markup: <button #prev>
  nextMonth: "Next month",   // plan markup: <button #next>
  noDates: "Pick at least one date.",   // plan
  sameTimes: "Start and end must differ.",   // plan
  untitledEvent: "Untitled event",   // plan
  yourAvailability: "Your availability",   // plan markup: <span>
  sentAs: "Sent as {name}.",   // plan
  group: "Group availability",   // plan
  groupTab: "Group ({n})",   // plan
  noAnswersShare: "No answers yet. Share the link.",   // plan
  available: "{n}/{total} available",   // plan
  hoverHint: "Hover a slot to see who is free.",   // plan
  calHint: "Pick the days: click, drag, or shift-click for a range.",   // plan markup: <small #calhint>
  view: "View",   // pad; header, shared; plan markup: <div>
  answers: "Answers",   // plan markup: <ul #people>
  gridLabel: "Availability grid: one button per quarter hour",   // plan markup: <div #editor>
  heatLabel: "Group availability heatmap; the best times are listed below",   // plan markup: <div #heat>
  best: "Best times",   // plan; plan markup: <b>
  addToCalendar: "Add {len} to calendar (.ics)",   // plan
  length: "Meeting length",   // plan markup: <span>
  untitledPad: "Untitled pad",   // pad
  edit: "Edit",   // pad
  both: "Both",   // pad
  slides: "Slides",   // pad
  viewMode: "View mode",   // pad
  present: "Present",   // form; pad; form markup: <span>
  presentLabel: "Present the slides full screen",   // pad
  downloadMd: "Download .md",   // pad
  pdfLabel: "PDF, typeset with LaTeX: pages, or one slide per page in the slides view",   // pad
  attach: "Attach a file",   // pad
  history: "History",   // pad
  historyLabel: "Earlier versions",   // pad
  restore: "Restore this version",   // pad markup: <button #histrestore>
  back: "Back to the live pad",   // pad markup: <button #histback>
  viewing: "Viewing the version saved {when}",   // pad; files page; header, shared
  online: "{n} online: {names}",   // pad
  syncing: "Connecting…",   // pad
  saved: "Saved",   // core/doc; pad
  saving: "Saving…",   // core/doc; pad
  saveFailed: "Not saved: too large or the store refused",   // pad
  storeDown: "The server cannot store the text right now. Editing is paused; your text stays here and saving resumes when it can.",   // pad
  placeholder: "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide.",   // pad
  slideOf: "Slide {n} of {total}",   // pad
  exit: "Exit (Esc)",   // pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "Pad text",   // pad markup: <textarea #editor>
  previewLabel: "Preview",   // pad; pad markup: <div #preview>
  colors: "Author colours",   // pad
  wroteBy: "Written by {names}",   // pad
  viewLink: "View link",   // header, shared
  viewCopied: "✅ View link copied",   // header, shared
  readOnly: "Read-only view",   // pad; files page
  noHead: "This pad has no editor key yet; open the edit link first.",   // pad
  shareSubtitle: "Encrypted in your browser. Anyone with the link can add and download.",   // files page markup; files page; files page markup: <small>
  shareSubtitleView: "Read-only view. Files are decrypted in your browser when you download them.",   // files page
  dropLabel: "Add files",   // files page markup: <div #drop>
  dropHint: "Drop files here or",   // files page markup: <span>
  choose: "choose files",   // files page markup: <span>
  filesLabel: "Files",   // files page markup: <ul #files>
  noFiles: "No files yet.",   // pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "Downloading {name}",   // files page
  downloadFile: "Download",   // pad; files page
  preview: "Preview",   // pad; files page
  by: "by {who}",   // files page
  failed: "Failed: {err}",   // core/doc; pad; upload queue, widgets
  nFiles: "{n} files, {size}",   // files page
  formSubtitle: "Build a form. Answers are encrypted; only you read them unless you open the results to everyone.",   // form markup: <small>
  formTitle: "Title",   // form markup: <span>
  addField: "Add a question",   // form markup: <span>
  question: "Question",   // form
  type: "Type",   // core/fedi; form
  options: "Options, one per line",   // form
  required: "Required",   // form
  up: "Move up",   // form
  down: "Move down",   // form
  fText: "Short text",   // form: question type, builder and presenting
  fLong: "Paragraph",   // form: question type, builder and presenting
  fNumber: "Number",   // form: question type, builder and presenting
  fDate: "Date",   // form: question type, builder and presenting
  fOne: "One choice",   // form: question type, builder and presenting
  fMany: "Several choices",   // form: question type, builder and presenting
  openResults: "Results visible to everyone with the link",   // form markup: <span>
  createForm: "Create form",   // form markup: <button #go>
  needFields: "Give a title and at least one question.",   // form
  thanks: "Thank you, your answer was sent.",   // form
  results: "Results",   // form; form markup: <h2 #rtitle>
  nAnswers: "{n} answers",   // form
  csv: "Download CSV",   // form markup: <button #csv>
  answered: "Answered",   // form
  noAnswers: "No answers yet.",   // form markup: <p #empty>
  lockedResults: "Only the owner sees the answers.",   // form markup: <small #locked>
  shareTitle: "Share",   // form markup: <h2 #sharetitle>
  copy: "Copy",   // shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "Send this link to the people who should answer.",   // form markup: <small>
  ownerHint: "Your owner link: it holds the key that opens the answers. Keep it private.",   // form markup: <small>
};
export default dict;
