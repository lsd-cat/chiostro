// 中文. Edit the strings on the right; keep every {placeholder} as it is. Comments say where a string shows and give the English source.
// Regenerate the comments after a build with: node tools/i18n-split.mjs

const dict: Record<string, string> = {
  refresh: "刷新",   // "Refresh" — fediverse cards
  snapAt: "快照 {when}",   // "snapshot {when}" — fediverse cards
  noSnap: "尚无快照：需要编辑者打开此页面。",   // "No snapshot yet: an editor needs to open this page." — fediverse cards
  snapFail: "无法从实例读取（非公开，或此站点不允许该实例）。",   // "Could not fetch this from the instance (not public, or the instance is not allowed by this site)." — fediverse cards
  fediPost: "帖子",   // "Post" — fediverse cards
  fediVideo: "视频",   // "Video" — fediverse cards
  fediEvent: "活动",   // "Event" — fediverse cards
  homeTagline: "端到端加密的匿名协作套件。",   // "End-to-end encrypted, anonymous collaboration suite." — landing page
  desc_meet: "视频通话，含聊天、屏幕与 PDF 共享、批注和投票。",   // "Video calls with chat, screen and PDF sharing, annotations and polls." — landing card, under the tool name
  desc_when: "找到大家都方便的时间。",   // "Find a time that works for everyone." — landing card, under the tool name
  desc_pad: "一起写作：markdown、幻灯片、评论、附件。",   // "Write together: markdown, slides, comments, attachments." — landing card, under the tool name
  desc_share: "文件分享与收集。",   // "File sharing and collection." — landing card, under the tool name
  desc_form: "私下或公开地收集信息、回答和问卷。",   // "Collect information, answers and surveys, privately or publicly." — landing card, under the tool name
  micMuted: "麦克风已静音",   // "Microphone muted" — call
  camIsOff: "摄像头已关闭",   // "Camera off" — call
  new: "新建",   // "New" — header markup: <a #new>
  toolbar: "工具",   // "Tools" — landing page; header markup: <div #toolbar>
  closed: "已关闭",   // "closed" — core/lang/ar; core/lang/en; core/lang/es; core/lang/fr; core/lang/it; core/lang/zh; core/relaymedia; call: poll
  app_meet: "通话",   // "Call" — tool name: header navigation, landing cards, page titles
  app_when: "安排",   // "Plan" — tool name: header navigation, landing cards, page titles
  app_pad: "记事板",   // "Pad" — tool name: header navigation, landing cards, page titles
  app_share: "文件",   // "Files" — files page
  app_form: "表单",   // "Form" — form
  otherApps: "本次会议的其他工具",   // "Other tools for this meeting" — header markup: <nav #nav>
  noApp: "没有这个应用。",   // "No such app." — header, shared
  guest: "访客",   // "Guest" — call; pad; pad comments; header, shared
  detected: "（已检测）",   // "(detected)" — upload queue, widgets
  change: "更改",   // "Change" — upload queue, widgets
  timezone: "时区",   // "Time zone" — upload queue, widgets
  createFailed: "无法创建（{status}）。",   // "Could not create it ({status})." — form; plan; header, shared
  sendFailed: "无法发送（{status}）。",   // "Could not send ({status})." — form; plan
  answerBy: "请在 {date} 前回答",   // "Answer by {date}" — form; plan
  answerByOpt: "截止日期（可选）",   // "Answer by (optional)" — plan markup: <span>; form markup: <span>
  closedSince: "已于 {date} 关闭。之后的回答不计入。",   // "Closed since {date}. Answers sent after that are not counted." — form; plan
  noMicrophone: "无麦克风",   // "No microphone" — call
  blur: "模糊我的背景",   // "Blur my background" — call markup: <button #blurb>
  blurLabel: "背景模糊",   // "Blur background" — call markup: <span>
  settings: "设置",   // "Settings" — call markup: <button #settingsb>; call markup: <div #settingsmenu>
  settingsLabel: "设置",   // "Settings" — call markup: <span>
  drawing: "绘制已开启",   // "Drawing on" — call: ink markup; call: ink
  clearInkLabel: "清除我的",   // "Clear mine" — call: ink markup; call: ink
  done: "完成",   // "Done" — call: agenda; call: ink markup; call: ink; upload queue, widgets
  openTab: "在新标签页打开",   // "Open in a new tab" — call: embed markup; call: embed
  embedBlank: "如果一直空白，说明该网站不允许嵌入。",   // "If it stays blank, that site does not allow embedding." — call: embed markup; call: embed
  agendaLabel: "议程",   // "Agenda" — call: agenda markup; call: agenda
  themeLabel: "主题",   // "Theme" — call markup: <span>
  tools: "工具",   // "Tools" — header, shared; landing page markup: <nav #toolgrid>; call markup: <button #toolsb>; call markup: <div #toolsmenu>
  toolsLabel: "工具",   // "Tools" — call markup: <span>
  embed: "共享网页",   // "Share a web page" — call: embed; shared helpers; call: embed markup; call extensions; header, shared
  embedLabel: "网页",   // "Page" — call: embed markup; call: embed
  embedUrl: "https://…",   // "https://…" — call: embed markup; call: embed
  embedShare: "共享",   // "Share" — call: embed markup; call: embed
  open: "打开",   // "Open" — call: embed markup; call: embed; fediverse cards; header, shared
  closeEmbed: "关闭网页",   // "Close page" — call: embed markup; call: embed
  wantsToEmbed: "{who} 想展示来自 {origin} 的网页",   // "{who} wants to show a page from {origin}" — call: embed
  embedWarn: "外部网页：未加密，且该网站可看到你的 IP 地址。",   // "External page: not encrypted, and that site sees your IP address." — call: embed markup; call: embed
  noCamera: "无摄像头",   // "no camera" — call
  noMedia: "无摄像头和麦克风",   // "no camera or microphone" — call
  dismiss: "关闭",   // "Dismiss" — call: poll markup; call: poll
  raiseHand: "举手",   // "Raise hand" — call: hand; call: hand markup
  lowerHand: "放下手",   // "Lower hand" — call: hand
  poll: "投票",   // "Polls" — call: poll; call: poll markup; call extensions
  pollLabel: "投票",   // "Poll" — call: poll markup; call: poll
  pollQuestion: "问题",   // "Question" — call: poll markup; call: poll
  pollOptions: "选项，每行一个",   // "Options, one per line" — call: poll markup; call: poll
  pollStart: "开始",   // "Start" — call: poll markup; call: poll
  cancel: "取消",   // "Cancel" — call: embed markup; call: embed; call: poll markup; call: poll; pad markup: <button #commentcancel>
  closePoll: "结束投票",   // "Close poll" — call: poll markup; call: poll
  votes: "{n} 票",   // "{n} votes" — call: poll
  agenda: "议程与计时器",   // "Agenda and timer" — call: agenda; call: agenda markup; call extensions
  agendaItem: "新议程项",   // "New agenda item" — call: agenda markup; call: agenda
  add: "添加",   // "Add" — call: agenda markup
  timerMinutes: "分钟",   // "Minutes" — call: agenda markup; call: agenda
  start: "开始",   // "Start" — pad; plan; call: agenda markup; call: agenda
  stop: "停止",   // "Stop" — shared helpers; call: agenda markup; call: agenda
  remove: "移除",   // "Remove" — form; call: agenda
  record: "本地录制",   // "Record locally" — call: record; call: record markup; call extensions
  stopRecording: "停止录制",   // "Stop recording" — call: record
  recLabel: "录制",   // "Rec" — call: record markup; call: record
  recordingBy: "⏺ {who} 正在录制",   // "⏺ {who} is recording" — call: record
  pip: "在浮动窗口中显示所有视频",   // "Show all videos in a floating window" — call: pip markup
  pipLabel: "画中画",   // "PiP" — call: pip markup; call: pip
  openPdf: "打开 PDF（第 {page} 页）",   // "Open the PDF (page {page})" — call: pdf
  call: "通话",   // "Call" — call; call markup: <section #call>
  controls: "通话控制",   // "Call controls" — call markup: <div #bar>
  subtitle: "基于链接的端到端加密通话。",   // "Link-based end-to-end encrypted call." — call markup: <small #subtitle>
  yourName: "你的名字",   // "Your name" — call markup: <input #pname>; plan markup: <span>; header markup: <button #namebox>; header markup: <span>
  mediaPath: "媒体路径",   // "Media path" — call markup: <legend>
  p2p: "P2P",   // "P2P" — call markup: <span>
  relay: "服务器",   // "Server" — core/config; call; call markup: <span>
  advanced: "高级",   // "Advanced" — call; call markup: <summary>
  relayServer: "中继服务器",   // "Relay server" — call markup: <span>
  iceServers: "ICE 服务器",   // "ICE servers" — core/config; call markup: <span>
  advancedError: "高级设置",   // "Advanced settings" — call
  notHostPort: "不是 主机:端口",   // "not a host:port" — call
  join: "加入通话",   // "Join call" — call; call markup: <button #join>
  copied: "✅ 已复制",   // "✅ Copied" — shared helpers
  theme: "切换深色或浅色主题",   // "Toggle dark or light theme" — core/config; header, shared; call markup: <button>; header markup: <button>
  language: "语言",   // "Language" — header markup: <select>
  relayNote: "已配置 TURN 中继：在网址后加 ?turnonly 可让媒体经过服务器，向其他参与者隐藏你的 IP。",   // "A TURN relay is configured: add ?turnonly to the URL to route media through the server and hide your IP from other participants." — call markup: <small #relaynote>
  invalidKey: "网址中的房间密钥无效。",   // "Invalid room key in URL." — header, shared
  mic: "麦克风",   // "Mic" — call markup: <span>
  cam: "摄像头",   // "Cam" — call markup: <span>
  share: "共享",   // "Share" — core/config; form; call; files page; call markup: <span>
  chat: "聊天",   // "Chat" — call; pad; call markup: <span>; call markup: <aside #chat>
  copyLink: "复制链接",   // "Copy link" — call markup: <span>; header markup: <button #copy>
  leave: "离开",   // "Leave" — call; call markup: <span>
  mute: "静音",   // "Mute microphone" — call; call markup: <button #mic>
  unmute: "取消静音",   // "Unmute microphone" — call
  camOff: "关闭摄像头",   // "Turn camera off" — call; call markup: <button #camb>
  camOn: "打开摄像头",   // "Turn camera on" — call
  shareScreen: "共享屏幕",   // "Share screen" — call; call markup: <button #share>
  stopSharing: "停止共享",   // "Stop sharing" — call
  toggleChat: "显示/隐藏聊天",   // "Toggle chat" — call markup: <button #chatb>
  hideChat: "隐藏聊天",   // "Hide chat" — call
  showChat: "显示聊天",   // "Show chat" — call
  leaveCall: "离开通话",   // "Leave call" — call markup: <button #leave>
  inCall: "🔒 E2EE · {n} 人在通话中",   // "🔒 E2EE · {n} in call" — call
  disconnected: "⚠️ 已断开",   // "⚠️ Disconnected" — call
  you: "你",   // "You" — call; pad
  yourScreen: "你的屏幕",   // "Your screen" — call
  screen: "（屏幕）",   // "(screen)" — core/relaymedia; core/roster; call
  message: "消息（已加密）",   // "Message (encrypted)" — shared helpers; call markup: <input #msg>
  send: "发送",   // "Send" — call markup: <button>; plan markup: <button>; form markup: <button>
  pdf: "PDF",   // "PDF" — pad; call: pdf markup
  sharePdf: "共享 PDF",   // "Share a PDF" — call: pdf markup; call: pdf
  accept: "接受",   // "Accept" — call: pdf markup; call: pdf
  decline: "拒绝",   // "Decline" — call: embed markup; call: embed; call: pdf markup; call: pdf
  wantsToShare: "{who} 想共享“{name}”（{size} MB）",   // "{who} wants to share \"{name}\" ({size} MB)" — call: pdf
  receiving: "正在接收“{name}”… {pct}%",   // "Receiving \"{name}\"… {pct}%" — call: pdf
  pdfTooLarge: "PDF 过大（最大 50 MB）",   // "PDF too large (50 MB max)" — call: pdf
  prevPage: "上一页",   // "Previous page" — call: pdf markup; call: pdf
  nextPage: "下一页",   // "Next page" — call: pdf markup; call: pdf
  fullScreen: "全屏",   // "Full screen" — call: pdf markup; call: pdf
  closePdf: "关闭 PDF",   // "Close PDF" — call: pdf markup; call: pdf
  sharedPdf: "共享的 PDF",   // "Shared PDF" — call: pdf markup; call: pdf
  draw: "标注",   // "Draw" — call: ink markup; call: ink
  drawAria: "绘制标注",   // "Draw annotations" — call: ink markup; call: ink
  clearInk: "清除我的标注",   // "Clear my annotations" — call: ink markup; call: ink
  annotations: "标注",   // "Annotations" — call: ink
  pin: "固定此画面",   // "Pin this tile" — call
  removeFile: "移除",   // "Remove" — pad; files page
  removeFileAsk: "为所有人移除 {name}？其数据将从服务器删除。",   // "Remove {name} for everyone? Its bytes are deleted from the server." — pad; files page
  removeFailed: "无法移除（{status}）",   // "Could not remove ({status})" — pad; files page
  siteLinks: "链接",   // "Links" — landing page markup: <nav #homelinks>
  keyTaken: "此房间的签名密钥已被他人占用，其只读链接不可信。请新建一个。",   // "Someone else holds this room’s signing key; its read-only link cannot be trusted. Start a new one." — header, shared
  comments: "评论",   // "Comments" — pad; pad markup: <aside #padcomments>
  commentOn: "评论所选文字",   // "Comment on the selection" — pad markup: <button #commenton>
  commentPh: "写评论…",   // "Write a comment…" — pad markup: <textarea #commenttext>
  post: "发布",   // "Post" — core/fedi; pad comments; fediverse cards; pad markup: <button>
  reply: "回复",   // "Reply" — pad comments
  resolve: "解决",   // "Resolve" — pad comments
  reopen: "重新打开",   // "Reopen" — pad comments
  resolvedN: "已解决（{n}）",   // "Resolved ({n})" — pad comments
  noComments: "还没有评论。选中一段文字即可评论。",   // "No comments yet. Select some text to comment on it." — pad markup: <p #threadsempty>
  textChanged: "所引用的文字已更改",   // "the text this referred to has changed" — pad comments
  toTex: "转换为 LaTeX",   // "Convert to LaTeX" — pad
  toTexConfirm: "把这个文档转换为 LaTeX 吗？Markdown 将被替换为 LaTeX 源码，预览变为编译后的 PDF。此操作不可逆。",   // "Turn this pad into a LaTeX document? The markdown is replaced by its LaTeX source and the preview becomes the compiled PDF. There is no way back." — pad
  filesPanel: "文件",   // "Files" — pad; pad markup: <aside #padfiles>
  insert: "插入",   // "Insert" — pad
  compiling: "正在编译…",   // "Compiling…" — pad
  texError: "LaTeX：{err}",   // "LaTeX: {err}" — pad
  typesetting: "正在排版 PDF…（已获取 {n} 个文件）",   // "Typesetting the PDF… ({n} files fetched)" — pad
  pdfFallback: "排版失败，改为打印",   // "Typesetting failed, printing instead" — pad
  fediProfile: "个人资料",   // "Profile" — fediverse cards
  queued: "排队中",   // "Queued" — upload queue, widgets
  uploadingShort: "上传中…",   // "Uploading…" — upload queue, widgets
  uploads: "上传",   // "Uploads" — pad; files page; pad markup: <div #uploads>; files page markup: <div #uploads>
  toolLinkNote: "此链接只打开这个工具。会议链接在首页。",   // "This link opens only this tool. The meeting link is on the landing page." — header markup: <small>
  contents: "目录",   // "Contents" — pad markup: <nav #toc>
  fWords: "词云",   // "Word cloud" — form: question type, builder and presenting
  fScale: "1 到 5 评分",   // "Scale 1 to 5" — form: question type, builder and presenting
  reveal: "显示结果",   // "Show results" — form
  hideResults: "隐藏结果",   // "Hide results" — form
  resultsHidden: "结果已隐藏，直到你显示",   // "Results hidden until you show them" — form
  waiting: "等待主持人显示结果。",   // "Waiting for the presenter to show the results." — form; form markup: <p #waiting>
  scan: "扫码作答",   // "Scan to answer" — form markup: <small>
  questionOf: "第 {n} 题，共 {total} 题",   // "Question {n} of {total}" — form
  average: "平均 {n}",   // "Average {n}" — form
  prevQuestion: "上一题",   // "Previous question" — form markup: <button #fpprev>
  nextQuestion: "下一题",   // "Next question" — form markup: <button #fpnext>
  presentResults: "全屏展示结果",   // "Present the results full screen" — form markup: <div #fpresent>
  qr: "以二维码显示链接",   // "Show the link as a QR code" — header markup: <button #qr>; header markup: <div #qrpop>
  qrImage: "此链接的二维码",   // "QR code of this link" — form markup: <canvas #fpqr>; header markup: <canvas #qrcanvas>
  whenSubtitle: "找到大家都方便的时间。端到端加密，凭链接访问。",   // "Find a time that works for everyone. End-to-end encrypted, by link." — plan markup: <small>
  eventName: "活动名称",   // "Event name" — plan markup: <span>
  from: "从",   // "From" — core/doc; core/signaling; pad; plan markup: <span>
  to: "到",   // "To" — plan markup: <span>
  create: "创建活动",   // "Create event" — plan; plan markup: <button #go>
  prevMonth: "上个月",   // "Previous month" — plan markup: <button #prev>
  nextMonth: "下个月",   // "Next month" — plan markup: <button #next>
  noDates: "请至少选择一个日期。",   // "Pick at least one date." — plan
  sameTimes: "开始与结束时间必须不同。",   // "Start and end must differ." — plan
  untitledEvent: "未命名活动",   // "Untitled event" — plan
  yourAvailability: "你的空闲时间",   // "Your availability" — plan markup: <span>
  sentAs: "已以 {name} 的名义发送。",   // "Sent as {name}." — plan
  group: "群组空闲时间",   // "Group availability" — plan
  groupTab: "群组（{n}）",   // "Group ({n})" — plan
  noAnswersShare: "还没有回答。分享链接吧。",   // "No answers yet. Share the link." — plan
  available: "{n}/{total} 人有空",   // "{n}/{total} available" — plan
  hoverHint: "悬停在时段上查看谁有空。",   // "Hover a slot to see who is free." — plan
  calHint: "选择日期：点击、拖动，或按住 Shift 点击选择范围。",   // "Pick the days: click, drag, or shift-click for a range." — plan markup: <small #calhint>
  view: "视图",   // "View" — pad; header, shared; plan markup: <div>
  answers: "回答",   // "Answers" — plan markup: <ul #people>
  gridLabel: "空闲时间表：每刻钟一个按钮",   // "Availability grid: one button per quarter hour" — plan markup: <div #editor>
  heatLabel: "群组空闲热力图；最佳时间列在下方",   // "Group availability heatmap; the best times are listed below" — plan markup: <div #heat>
  best: "最佳时间",   // "Best times" — plan; plan markup: <b>
  addToCalendar: "将 {len} 加入日历 (.ics)",   // "Add {len} to calendar (.ics)" — plan
  length: "会议时长",   // "Meeting length" — plan markup: <span>
  untitledPad: "未命名文档",   // "Untitled pad" — pad
  edit: "编辑",   // "Edit" — pad
  both: "两者",   // "Both" — pad
  slides: "幻灯片",   // "Slides" — pad
  viewMode: "视图模式",   // "View mode" — pad
  present: "演示",   // "Present" — form; pad; form markup: <span>
  presentLabel: "全屏演示幻灯片",   // "Present the slides full screen" — pad
  downloadMd: "下载 .md",   // "Download .md" — pad
  pdfLabel: "用 LaTeX 排版的 PDF：按页，或在幻灯片视图中每张一页",   // "PDF, typeset with LaTeX: pages, or one slide per page in the slides view" — pad
  attach: "附加文件",   // "Attach a file" — pad
  history: "历史",   // "History" — pad
  historyLabel: "早期版本",   // "Earlier versions" — pad
  restore: "恢复此版本",   // "Restore this version" — pad markup: <button #histrestore>
  back: "返回当前文档",   // "Back to the live pad" — pad markup: <button #histback>
  viewing: "查看保存于 {when} 的版本",   // "Viewing the version saved {when}" — pad; files page; header, shared
  online: "{n} 人在线：{names}",   // "{n} online: {names}" — pad
  syncing: "连接中…",   // "Connecting…" — pad
  saved: "已保存",   // "Saved" — core/doc; pad
  saving: "保存中…",   // "Saving…" — core/doc; pad
  saveFailed: "未保存：太大或被服务器拒绝",   // "Not saved: too large or the store refused" — pad
  placeholder: "# 标题\n\n在这里写 Markdown。持有链接的人编辑同一文本，端到端加密。\n\n---\n\n以 --- 开头的一行开始新的幻灯片。",   // "# Title\n\nWrite markdown here. Everyone with the link edits the same text, encrypted end to end.\n\n---\n\nA line with --- starts a new slide." — pad
  slideOf: "第 {n} 张，共 {total} 张",   // "Slide {n} of {total}" — pad
  exit: "退出 (Esc)",   // "Exit (Esc)" — pad; form markup: <button #fpexit>; pad markup: <button #exit>
  padLabel: "文档文本",   // "Pad text" — pad markup: <textarea #editor>
  previewLabel: "预览",   // "Preview" — pad; pad markup: <div #preview>
  colors: "作者颜色",   // "Author colours" — pad
  wroteBy: "由 {names} 编写",   // "Written by {names}" — pad
  viewLink: "只读链接",   // "View link" — header, shared
  viewCopied: "✅ 已复制只读链接",   // "✅ View link copied" — header, shared
  readOnly: "只读视图",   // "Read-only view" — pad; files page
  noHead: "此文档还没有编辑密钥；请先打开编辑链接。",   // "This pad has no editor key yet; open the edit link first." — pad
  shareSubtitle: "在浏览器中加密。持有链接的人都可以添加和下载。",   // "Encrypted in your browser. Anyone with the link can add and download." — files page markup: <small>
  dropLabel: "添加文件",   // "Add files" — files page markup: <div #drop>
  dropHint: "把文件拖到这里，或",   // "Drop files here or" — files page markup: <span>
  choose: "选择文件",   // "choose files" — files page markup: <span>
  filesLabel: "文件",   // "Files" — files page markup: <ul #files>
  noFiles: "还没有文件。",   // "No files yet." — pad markup: <p #padfilesempty>; files page markup: <p #empty>
  downloading: "正在下载 {name}",   // "Downloading {name}" — files page
  downloadFile: "下载",   // "Download" — pad; files page
  preview: "预览",   // "Preview" — pad; files page
  by: "由 {who}",   // "by {who}" — files page
  failed: "失败：{err}",   // "Failed: {err}" — core/doc; pad; upload queue, widgets
  nFiles: "{n} 个文件，{size}",   // "{n} files, {size}" — files page
  formSubtitle: "创建表单。回答经过加密；除非你向所有人公开结果，否则只有你能读。",   // "Build a form. Answers are encrypted; only you read them unless you open the results to everyone." — form markup: <small>
  formTitle: "标题",   // "Title" — form markup: <span>
  addField: "添加问题",   // "Add a question" — form markup: <span>
  question: "问题",   // "Question" — form
  type: "类型",   // "Type" — core/fedi; form
  options: "选项，每行一个",   // "Options, one per line" — form
  required: "必填",   // "Required" — form
  up: "上移",   // "Move up" — form
  down: "下移",   // "Move down" — form
  fText: "短文本",   // "Short text" — form: question type, builder and presenting
  fLong: "段落",   // "Paragraph" — form: question type, builder and presenting
  fNumber: "数字",   // "Number" — form: question type, builder and presenting
  fDate: "日期",   // "Date" — form: question type, builder and presenting
  fOne: "单选",   // "One choice" — form: question type, builder and presenting
  fMany: "多选",   // "Several choices" — form: question type, builder and presenting
  openResults: "持有链接的人都能看到结果",   // "Results visible to everyone with the link" — form markup: <span>
  createForm: "创建表单",   // "Create form" — form markup: <button #go>
  needFields: "请填写标题和至少一个问题。",   // "Give a title and at least one question." — form
  thanks: "谢谢，你的回答已发送。",   // "Thank you, your answer was sent." — form
  results: "结果",   // "Results" — form; form markup: <h2 #rtitle>
  nAnswers: "{n} 条回答",   // "{n} answers" — form
  csv: "下载 CSV",   // "Download CSV" — form markup: <button #csv>
  answered: "已回答",   // "Answered" — form
  noAnswers: "还没有回答。",   // "No answers yet." — form markup: <p #empty>
  lockedResults: "只有所有者能看到回答。",   // "Only the owner sees the answers." — form markup: <small #locked>
  shareTitle: "分享",   // "Share" — form markup: <h2 #sharetitle>
  copy: "复制",   // "Copy" — shared helpers; header, shared; form markup: <button #copypublic>; form markup: <button #copyowner>
  publicHint: "把这个链接发给需要回答的人。",   // "Send this link to the people who should answer." — form markup: <small>
  ownerHint: "你的所有者链接：包含打开回答的密钥。请妥善保密。",   // "Your owner link: it holds the key that opens the answers. Keep it private." — form markup: <small>
};
export default dict;
