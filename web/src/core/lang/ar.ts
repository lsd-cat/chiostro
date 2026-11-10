// العربية. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows and give the English source.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "تحديث",   // "Refresh" — fediverse cards
  snapAt: "لقطة {when}",   // "snapshot {when}" — fediverse cards
  noSnap: "لا لقطة بعد: يجب أن يفتح محرر هذه الصفحة.",   // "No snapshot yet: an editor needs to open this page." — fediverse cards
  snapFail: "تعذّر الجلب من المثيل (غير عام، أو المثيل غير مسموح به في هذا الموقع).",   // "Could not fetch this from the instance (not public, or the instance is not allowed by this site)." — fediverse cards
  fediPost: "منشور",   // "Post" — fediverse cards
  fediVideo: "فيديو",   // "Video" — fediverse cards
  fediEvent: "حدث",   // "Event" — fediverse cards
  homeTagline: "أدوات اجتماعات مشفّرة من طرف إلى طرف. رابط واحد يفتحها كلها.",   // "Meeting tools, end-to-end encrypted. One link opens all of them." — landing page
  homeKey: "الروابط أعلاه تتشارك مفتاحًا جديدًا: افتح أي أداة ثم أرسل رابطها للآخرين.",   // "The links above share one fresh key: open any tool, then send its link to the others." — landing page
  desc_meet: "مكالمات فيديو مع دردشة ومشاركة الشاشة وملفات PDF وتعليقات واستطلاعات.",   // "Video calls with chat, screen and PDF sharing, annotations, polls." — landing card, under the tool name
  desc_when: "اعثر على وقت يناسب الجميع.",   // "Find a time that works for everyone." — landing card, under the tool name
  desc_pad: "اكتبوا معًا: ماركداون وشرائح ومرفقات وألوان للمؤلفين.",   // "Write together: markdown, slides, attachments, author colours." — landing card, under the tool name
  desc_share: "ملفات الاجتماع، مشفّرة في المتصفح.",   // "Files for the meeting, encrypted in the browser." — landing card, under the tool name
  desc_form: "نماذج واستطلاعات، الإجابات يقرؤها المالك وحده أو الجميع.",   // "Forms and polls, answers readable only by the owner or by everyone." — landing card, under the tool name
  micMuted: "الميكروفون مكتوم",   // "Microphone muted" — call
  camIsOff: "الكاميرا مغلقة",   // "Camera off" — call
  new: "جديد",   // "New" — header markup: <a #new>
  toolbar: "أدوات",   // "Tools" — landing page; header markup: <div #toolbar>
  closed: "مغلق",   // "closed" — core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "مكالمة",   // "Call" — tool name: header navigation, landing cards, page titles
  app_when: "تخطيط",   // "Plan" — tool name: header navigation, landing cards, page titles
  app_pad: "لوحة",   // "Pad" — tool name: header navigation, landing cards, page titles
  app_share: "ملفات",   // "Files" — files page
  app_form: "نموذج",   // "Form" — form
  otherApps: "أدوات أخرى لهذا الاجتماع",   // "Other tools for this meeting" — header markup: <nav #nav>
  noApp: "لا يوجد تطبيق بهذا الاسم.",   // "No such app." — header, shared
  guest: "ضيف",   // "Guest" — call; pad; pad comments; header, shared
  detected: "(مكتشفة)",   // "(detected)" — upload queue, widgets
  change: "تغيير",   // "Change" — upload queue, widgets
  timezone: "المنطقة الزمنية",   // "Time zone" — upload queue, widgets
  createFailed: "تعذّر الإنشاء ({status}).",   // "Could not create it ({status})." — form; plan; header, shared
  sendFailed: "تعذّر الإرسال ({status}).",   // "Could not send ({status})." — form; plan
  answerBy: "أجب قبل {date}",   // "Answer by {date}" — form; plan
  answerByOpt: "أجب قبل (اختياري)",   // "Answer by (optional)" — plan markup: <span>; form markup: <span>
  closedSince: "أُغلق منذ {date}. الإجابات اللاحقة لا تُحتسب.",   // "Closed since {date}. Answers sent after that are not counted." — form; plan
  noMicrophone: "لا يوجد ميكروفون",   // "No microphone" — call
  blur: "تمويه خلفيتي",   // "Blur my background" — call markup: <button #blurb>
  blurLabel: "تمويه الخلفية",   // "Blur background" — call markup: <span>
  settings: "الإعدادات",   // "Settings" — call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "الإعدادات",   // "Settings" — call markup: <span>
  drawing: "الرسم مفعّل",   // "Drawing on" — call: ink markup; call: ink
  clearInkLabel: "مسح رسوماتي",   // "Clear mine" — call: ink markup; call: ink
  done: "تم",   // "Done" — call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "فتح في تبويب جديد",   // "Open in a new tab" — call: embed markup; call: embed
  embedBlank: "إذا بقيت فارغة فهذا الموقع لا يسمح بالتضمين.",   // "If it stays blank, that site does not allow embedding." — call: embed markup; call: embed
  agendaLabel: "جدول الأعمال",   // "Agenda" — call: agenda markup; call: agenda
  themeLabel: "السمة",   // "Theme" — call markup: <span>
  tools: "أدوات",   // "Tools" — header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "أدوات",   // "Tools" — call markup: <span>
  embed: "مشاركة صفحة ويب",   // "Share a web page" — call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "صفحة",   // "Page" — call: embed markup; call: embed
  embedUrl: "https://…",   // "https://…" — call: embed markup; call: embed
  embedShare: "مشاركة",   // "Share" — call: embed markup; call: embed
  open: "فتح",   // "Open" — call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "إغلاق الصفحة",   // "Close page" — call: embed markup; call: embed
  wantsToEmbed: "{who} يريد عرض صفحة من {origin}",   // "{who} wants to show a page from {origin}" — call: embed
  embedWarn: "صفحة خارجية: غير مشفّرة، وذلك الموقع يرى عنوان IP الخاص بك.",   // "External page: not encrypted, and that site sees your IP address." — call: embed markup; call: embed
  noCamera: "بدون كاميرا",   // "no camera" — call
  noMedia: "بدون كاميرا أو ميكروفون",   // "no camera or microphone" — call
  dismiss: "إخفاء",   // "Dismiss" — call: poll markup; call: poll
  raiseHand: "رفع اليد",   // "Raise hand" — call: hand; call: hand markup
  lowerHand: "خفض اليد",   // "Lower hand" — call: hand
  poll: "استطلاعات",   // "Polls" — call: poll; call: poll markup; call extensions
  pollLabel: "استطلاع",   // "Poll" — call: poll markup; call: poll
  pollQuestion: "السؤال",   // "Question" — call: poll markup; call: poll
  pollOptions: "الخيارات، واحد في كل سطر",   // "Options, one per line" — call: poll markup; call: poll
  pollStart: "ابدأ",   // "Start" — call: poll markup; call: poll
  cancel: "إلغاء",   // "Cancel" — call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "إغلاق الاستطلاع",   // "Close poll" — call: poll markup; call: poll
  votes: "{n} أصوات",   // "{n} votes" — call: poll
  agenda: "جدول الأعمال والمؤقت",   // "Agenda and timer" — call: agenda; call: agenda markup; call extensions
  agendaItem: "بند جديد",   // "New agenda item" — call: agenda markup; call: agenda
  add: "إضافة",   // "Add" — call: agenda markup
  timerMinutes: "دقائق",   // "Minutes" — call: agenda markup; call: agenda
  start: "ابدأ",   // "Start" — pad; plan; call: agenda markup; call: agenda
  stop: "إيقاف",   // "Stop" — shared helpers; call: agenda markup; call: agenda
  remove: "إزالة",   // "Remove" — form; call: agenda
  record: "تسجيل محلي",   // "Record locally" — call: record; call: record markup; call extensions
  stopRecording: "إيقاف التسجيل",   // "Stop recording" — call: record
  recLabel: "تسجيل",   // "Rec" — call: record markup; call: record
  recordingBy: "⏺ {who} يسجّل",   // "⏺ {who} is recording" — call: record
  pip: "عرض كل الفيديوهات في نافذة عائمة",   // "Show all videos in a floating window" — call: pip markup
  pipLabel: "PiP",   // "PiP" — call: pip markup; call: pip
  openPdf: "افتح ملف PDF (صفحة {page})",   // "Open the PDF (page {page})" — call: pdf
  call: "المكالمة",   // "Call" — call; call markup: <section #call>
  controls: "أدوات التحكم في المكالمة",   // "Call controls" — call markup: <div #bar>
  subtitle: "مكالمة مشفّرة من طرف إلى طرف عبر رابط.",   // "Link-based end-to-end encrypted call." — call markup: <small #subtitle>
  yourName: "اسمك",   // "Your name" — call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "مسار الوسائط",   // "Media path" — call markup: <legend>
  p2p: "P2P",   // "P2P" — call markup: <span>
  relay: "الخادم",   // "Server" — core/config; call; call markup: <span>
  advanced: "متقدم",   // "Advanced" — call; call markup: <summary>
  relayServer: "خادم المرحّل",   // "Relay server" — call markup: <span>
  iceServers: "خوادم ICE",   // "ICE servers" — core/config; call markup: <span>
  advancedError: "الإعدادات المتقدمة",   // "Advanced settings" — call
  notHostPort: "ليس مضيف:منفذ",   // "not a host:port" — call
  join: "انضم إلى المكالمة",   // "Join call" — call; call markup: <button #join>
  copied: "✅ تم النسخ",   // "✅ Copied" — shared helpers
  theme: "تبديل السمة الداكنة أو الفاتحة",   // "Toggle dark or light theme" — core/config; header, shared; call markup: <button>; header markup: <button>
  language: "اللغة",   // "Language" — header markup: <select>
  relayNote: "تم إعداد مرحّل TURN: أضف ?turnonly إلى الرابط لتمرير الوسائط عبر الخادم وإخفاء عنوان IP الخاص بك عن المشاركين الآخرين.",   // "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants." — call markup: <small #relaynote>
  invalidKey: "مفتاح الغرفة في الرابط غير صالح.",   // "Invalid room key in URL." — header, shared
  mic: "الميكروفون",   // "Mic" — call markup: <span>
  cam: "الكاميرا",   // "Cam" — call markup: <span>
  share: "مشاركة",   // "Share" — core/config; form; call; files page; call markup: <span>
  chat: "الدردشة",   // "Chat" — call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "نسخ الرابط",   // "Copy link" — call markup: <span>; header markup: <button #copy>
  leave: "مغادرة",   // "Leave" — call; call markup: <span>
  mute: "كتم الميكروفون",   // "Mute microphone" — call; call markup: <button #mic>
  unmute: "إلغاء كتم الميكروفون",   // "Unmute microphone" — call
  camOff: "إيقاف الكاميرا",   // "Turn camera off" — call; call markup: <button #camb>
  camOn: "تشغيل الكاميرا",   // "Turn camera on" — call
  shareScreen: "مشاركة الشاشة",   // "Share screen" — call; call markup: <button #share>
  stopSharing: "إيقاف المشاركة",   // "Stop sharing" — call
  toggleChat: "إظهار/إخفاء الدردشة",   // "Toggle chat" — call markup: <button #chatb>
  hideChat: "إخفاء الدردشة",   // "Hide chat" — call
  showChat: "إظهار الدردشة",   // "Show chat" — call
  leaveCall: "مغادرة المكالمة",   // "Leave call" — call markup: <button #leave>
  inCall: "🔒 E2EE · {n} في المكالمة",   // "🔒 E2EE · {n} in call" — call
  disconnected: "⚠️ انقطع الاتصال",   // "⚠️ Disconnected" — call
  you: "أنت",   // "You" — call; pad
  yourScreen: "شاشتك",   // "Your screen" — call
  screen: "(شاشة)",   // "(screen)" — core/relaymedia; core/roster; call
  message: "رسالة (مشفّرة)",   // "Message (encrypted)" — shared helpers; call markup: <input #msg>
  send: "إرسال",   // "Send" — call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // "PDF" — pad; call: pdf markup
  sharePdf: "مشاركة ملف PDF",   // "Share a PDF" — call: pdf markup; call: pdf
  accept: "قبول",   // "Accept" — call: pdf markup; call: pdf
  decline: "رفض",   // "Decline" — call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} يريد مشاركة \"{name}\" ({size} م.ب)",   // "{who} wants to share \"{name}\" ({size} MB)" — call: pdf
  receiving: "جارٍ استلام \"{name}\"… {pct}%",   // "Receiving \"{name}\"… {pct}%" — call: pdf
  pdfTooLarge: "ملف PDF كبير جدًا (الحد 50 م.ب)",   // "PDF too large (50 MB max)" — call: pdf
  prevPage: "الصفحة السابقة",   // "Previous page" — call: pdf markup; call: pdf
  nextPage: "الصفحة التالية",   // "Next page" — call: pdf markup; call: pdf
  fullScreen: "ملء الشاشة",   // "Full screen" — call: pdf markup; call: pdf
  closePdf: "إغلاق PDF",   // "Close PDF" — call: pdf markup; call: pdf
  sharedPdf: "PDF مشترك",   // "Shared PDF" — call: pdf markup; call: pdf
  draw: "رسم",   // "Draw" — call: ink markup; call: ink
  drawAria: "رسم تعليقات",   // "Draw annotations" — call: ink markup; call: ink
  clearInk: "مسح تعليقاتي",   // "Clear my annotations" — call: ink markup; call: ink
  annotations: "تعليقات",   // "Annotations" — call: ink
  pin: "تثبيت هذه النافذة",   // "Pin this tile" — call
  removeFile: "إزالة",   // "Remove" — pad; files page
  removeFileAsk: "إزالة {name} للجميع؟ ستُحذف بياناته من الخادم.",   // "Remove {name} for everyone? Its bytes are deleted from the server." — pad; files page
  removeFailed: "تعذّرت الإزالة ({status})",   // "Could not remove ({status})" — pad; files page
  siteLinks: "روابط",   // "Links" — landing page markup: <nav #homelinks>
  keyTaken: "شخص آخر يملك مفتاح توقيع هذه الغرفة؛ رابط القراءة فقط غير موثوق. أنشئ غرفة جديدة.",   // "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one." — header, shared
  comments: "التعليقات",   // "Comments" — pad; pad markup: <aside #padcomments>
  commentOn: "التعليق على التحديد",   // "Comment on the selection" — pad markup: <button #commenton>
  commentPh: "اكتب تعليقًا…",   // "Write a comment…" — pad markup: <textarea #commenttext>
  post: "نشر",   // "Post" — core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "رد",   // "Reply" — pad comments
  resolve: "حل",   // "Resolve" — pad comments
  reopen: "إعادة فتح",   // "Reopen" — pad comments
  resolvedN: "محلولة ({n})",   // "Resolved ({n})" — pad comments
  noComments: "لا تعليقات بعد. حدّد نصًا للتعليق عليه.",   // "No comments yet. Select some text to comment on it." — pad markup: <p #threadsempty>
  textChanged: "تغيّر النص المشار إليه",   // "the text this referred to has changed" — pad comments
  toTex: "التحويل إلى LaTeX",   // "Convert to LaTeX" — pad
  toTexConfirm: "تحويل هذا المستند إلى LaTeX؟ سيُستبدل Markdown بمصدر LaTeX وتصبح المعاينة ملف PDF المُجمَّع. لا رجوع عن ذلك.",   // "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back." — pad
  filesPanel: "الملفات",   // "Files" — pad; pad markup: <aside #padfiles>
  insert: "إدراج",   // "Insert" — pad
  compiling: "جارٍ التجميع…",   // "Compiling…" — pad
  texError: "LaTeX: {err}",   // "LaTeX: {err}" — pad
  typesetting: "جارٍ تنضيد PDF… (تم جلب {n} ملفات)",   // "Typesetting the PDF… ({n} files fetched)" — pad
  pdfFallback: "فشل التنضيد، ستتم الطباعة بدلًا منه",   // "Typesetting failed, printing instead" — pad
  fediProfile: "الملف الشخصي",   // "Profile" — fediverse cards
  queued: "في الانتظار",   // "Queued" — upload queue, widgets
  uploadingShort: "جارٍ الرفع…",   // "Uploading…" — upload queue, widgets
  uploads: "الرفع",   // "Uploads" — pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "هذا الرابط يفتح هذه الأداة فقط. رابط الاجتماع في الصفحة الرئيسية.",   // "This link opens only this tool. The meeting link is on the landing page." — header markup: <small>
  contents: "المحتويات",   // "Contents" — pad markup: <nav #toc>
  fWords: "سحابة كلمات",   // "Word cloud" — form: question type, builder and presenting
  fScale: "مقياس من 1 إلى 5",   // "Scale 1 to 5" — form: question type, builder and presenting
  reveal: "إظهار النتائج",   // "Show results" — form
  hideResults: "إخفاء النتائج",   // "Hide results" — form
  resultsHidden: "النتائج مخفية حتى تُظهرها",   // "Results hidden until you show them" — form
  waiting: "بانتظار أن يُظهر مقدّم العرض النتائج.",   // "Waiting for the presenter to show the results." — form; form markup: <p #waiting>
  scan: "امسح للإجابة",   // "Scan to answer" — form markup: <small>
  questionOf: "السؤال {n} من {total}",   // "Question {n} of {total}" — form
  average: "المتوسط {n}",   // "Average {n}" — form
  prevQuestion: "السؤال السابق",   // "Previous question" — form markup: <button #fpprev>
  nextQuestion: "السؤال التالي",   // "Next question" — form markup: <button #fpnext>
  presentResults: "عرض النتائج في ملء الشاشة",   // "Present the results full screen" — form markup: <div #fpresent>
  qr: "عرض الرابط كرمز QR",   // "Show the link as a QR code" — header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "رمز QR لهذا الرابط",   // "QR code of this link" — form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "اعثر على وقت يناسب الجميع. مشفّر من طرف إلى طرف، عبر الرابط.",   // "Find a time that works for everyone. End-to-end encrypted, by link." — plan markup: <small>
  eventName: "اسم الحدث",   // "Event name" — plan markup: <span>
  from: "من",   // "From" — core/doc; core/signaling; pad; plan markup: <span>
  to: "إلى",   // "To" — plan markup: <span>
  create: "إنشاء الحدث",   // "Create event" — plan; plan markup: <button #go>
  prevMonth: "الشهر السابق",   // "Previous month" — plan markup: <button #prev>
  nextMonth: "الشهر التالي",   // "Next month" — plan markup: <button #next>
  noDates: "اختر تاريخًا واحدًا على الأقل.",   // "Pick at least one date." — plan
  sameTimes: "يجب أن يختلف وقت البداية عن النهاية.",   // "Start and end must differ." — plan
  untitledEvent: "حدث بلا اسم",   // "Untitled event" — plan
  yourAvailability: "أوقات فراغك",   // "Your availability" — plan markup: <span>
  sentAs: "أُرسلت باسم {name}.",   // "Sent as {name}." — plan
  group: "أوقات فراغ المجموعة",   // "Group availability" — plan
  groupTab: "المجموعة ({n})",   // "Group ({n})" — plan
  noAnswersShare: "لا إجابات بعد. شارك الرابط.",   // "No answers yet. Share the link." — plan
  available: "{n}/{total} متاحون",   // "{n}/{total} available" — plan
  hoverHint: "مرّر فوق فترة لترى من هو متاح.",   // "Hover a slot to see who is free." — plan
  calHint: "اختر الأيام: نقرة، أو سحب، أو Shift+نقرة لتحديد نطاق.",   // "Pick the days: click, drag, or shift-click for a range." — plan markup: <small #calhint>
  view: "عرض",   // "View" — pad; header, shared; plan markup: <div>
  answers: "الإجابات",   // "Answers" — plan markup: <ul #people>
  gridLabel: "شبكة التوفر: زر لكل ربع ساعة",   // "Availability grid: one button per quarter hour" — plan markup: <div #editor>
  heatLabel: "خريطة توفر المجموعة؛ أفضل الأوقات مدرجة أدناه",   // "Group availability heatmap; the best times are listed below" — plan markup: <div #heat>
  best: "أفضل الأوقات",   // "Best times" — plan; plan markup: <b>
  addToCalendar: "إضافة {len} إلى التقويم (.ics)",   // "Add {len} to calendar (.ics)" — plan
  length: "مدة الاجتماع",   // "Meeting length" — plan markup: <span>
  untitledPad: "مستند بلا عنوان",   // "Untitled pad" — pad
  edit: "تحرير",   // "Edit" — pad
  both: "كلاهما",   // "Both" — pad
  slides: "شرائح",   // "Slides" — pad
  viewMode: "وضع العرض",   // "View mode" — pad
  present: "عرض تقديمي",   // "Present" — form; pad; form markup: <span>
  presentLabel: "عرض الشرائح في ملء الشاشة",   // "Present the slides full screen" — pad
  downloadMd: "تنزيل .md",   // "Download .md" — pad
  pdfLabel: "PDF منضّد بـ LaTeX: صفحات، أو شريحة لكل صفحة في عرض الشرائح",   // "PDF, typeset with LaTeX: pages, or one slide per page in the slides view" — pad
  attach: "إرفاق ملف",   // "Attach a file" — pad
  history: "السجل",   // "History" — pad
  historyLabel: "الإصدارات السابقة",   // "Earlier versions" — pad
  restore: "استعادة هذا الإصدار",   // "Restore this version" — pad markup: <button #histrestore>
  back: "العودة إلى المستند الحالي",   // "Back to the live pad" — pad markup: <button #histback>
  viewing: "عرض الإصدار المحفوظ {when}",   // "Viewing the version saved {when}" — pad; files page; header, shared
  online: "{n} متصلون: {names}",   // "{n} online: {names}" — pad
  syncing: "جارٍ الاتصال…",   // "Connecting…" — pad
  saved: "تم الحفظ",   // "Saved" — core/doc; pad
  saving: "جارٍ الحفظ…",   // "Saving…" — core/doc; pad
  saveFailed: "لم يُحفظ: كبير جدًا أو رفضه الخادم",   // "Not saved: too large or the store refused" — pad
  placeholder: "# العنوان\n\nاكتب Markdown هنا. كل من يملك الرابط يحرّر النص نفسه، مشفّرًا من طرف إلى طرف.\n\n---\n\nسطر يحتوي --- يبدأ شريحة جديدة.",   // "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide." — pad
  slideOf: "الشريحة {n} من {total}",   // "Slide {n} of {total}" — pad
  exit: "خروج (Esc)",   // "Exit (Esc)" — pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "نص المستند",   // "Pad text" — pad markup: <textarea #editor>
  previewLabel: "معاينة",   // "Preview" — pad; pad markup: <div #preview>
  colors: "ألوان المؤلفين",   // "Author colours" — pad
  wroteBy: "كتبه {names}",   // "Written by {names}" — pad
  viewLink: "رابط للقراءة فقط",   // "View link" — header, shared
  viewCopied: "✅ تم نسخ رابط القراءة",   // "✅ View link copied" — header, shared
  readOnly: "عرض للقراءة فقط",   // "Read-only view" — pad; files page
  noHead: "لا يملك هذا المستند مفتاح تحرير بعد؛ افتح رابط التحرير أولًا.",   // "This pad has no editor key yet; open the edit link first." — pad
  shareSubtitle: "مشفّر في متصفحك. كل من يملك الرابط يستطيع الإضافة والتنزيل.",   // "Encrypted in your browser. Anyone with the link can add and download." — files page markup: <small>
  dropLabel: "إضافة ملفات",   // "Add files" — files page markup: <div #drop>
  dropHint: "أفلت الملفات هنا أو",   // "Drop files here or" — files page markup: <span>
  choose: "اختر ملفات",   // "choose files" — files page markup: <span>
  filesLabel: "الملفات",   // "Files" — files page markup: <ul #files>
  noFiles: "لا ملفات بعد.",   // "No files yet." — pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "جارٍ تنزيل {name}",   // "Downloading {name}" — files page
  downloadFile: "تنزيل",   // "Download" — pad; files page
  preview: "معاينة",   // "Preview" — pad; files page
  by: "بواسطة {who}",   // "by {who}" — files page
  failed: "فشل: {err}",   // "Failed: {err}" — core/doc; pad; upload queue, widgets
  nFiles: "{n} ملفات، {size}",   // "{n} files, {size}" — files page
  formSubtitle: "أنشئ نموذجًا. الإجابات مشفّرة؛ أنت وحدك تقرأها ما لم تفتح النتائج للجميع.",   // "Build a form. Answers are encrypted; only you read them unless you open the results to everyone." — form markup: <small>
  formTitle: "العنوان",   // "Title" — form markup: <span>
  addField: "إضافة سؤال",   // "Add a question" — form markup: <span>
  question: "سؤال",   // "Question" — form
  type: "النوع",   // "Type" — core/fedi; form
  options: "الخيارات، واحد في كل سطر",   // "Options, one per line" — form
  required: "إلزامي",   // "Required" — form
  up: "نقل لأعلى",   // "Move up" — form
  down: "نقل لأسفل",   // "Move down" — form
  fText: "نص قصير",   // "Short text" — form: question type, builder and presenting
  fLong: "فقرة",   // "Paragraph" — form: question type, builder and presenting
  fNumber: "رقم",   // "Number" — form: question type, builder and presenting
  fDate: "تاريخ",   // "Date" — form: question type, builder and presenting
  fOne: "خيار واحد",   // "One choice" — form: question type, builder and presenting
  fMany: "عدة خيارات",   // "Several choices" — form: question type, builder and presenting
  openResults: "النتائج مرئية لكل من يملك الرابط",   // "Results visible to everyone with the link" — form markup: <span>
  createForm: "إنشاء النموذج",   // "Create form" — form markup: <button #go>
  needFields: "أدخل عنوانًا وسؤالًا واحدًا على الأقل.",   // "Give a title and at least one question." — form
  thanks: "شكرًا، أُرسلت إجابتك.",   // "Thank you, your answer was sent." — form
  results: "النتائج",   // "Results" — form; form markup: <h2 #rtitle>
  nAnswers: "{n} إجابات",   // "{n} answers" — form
  csv: "تنزيل CSV",   // "Download CSV" — form markup: <button #csv>
  answered: "تمت الإجابة",   // "Answered" — form
  noAnswers: "لا إجابات بعد.",   // "No answers yet." — form markup: <p #empty>
  lockedResults: "المالك وحده يرى الإجابات.",   // "Only the owner sees the answers." — form markup: <small #locked>
  shareTitle: "مشاركة",   // "Share" — form markup: <h2 #sharetitle>
  copy: "نسخ",   // "Copy" — shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "أرسل هذا الرابط إلى من يجب أن يجيبوا.",   // "Send this link to the people who should answer." — form markup: <small>
  ownerHint: "رابط المالك الخاص بك: يحتوي على المفتاح الذي يفتح الإجابات. أبقه سريًا.",   // "Your owner link: it holds the key that opens the answers. Keep it private." — form markup: <small>
};
export default dict;
