// The call: prejoin card, tiles, chat, controls, extensions. Media is its own world (mesh.ts,
// relaymedia.ts); the room, roster, sync and store come from the shell like for every app.
import {Mesh} from '../../core/mesh.js';
import {RelayMedia} from '../../core/relaymedia.js';
import type {Media, FrameSource} from '../../core/media.js';
import type {Roster} from '../../core/roster.js';
import {t} from '../../core/i18n.js';
import {config, start, join, nameOf, memo, shareLink, params} from '../shell.js';
import {$, translate, copyLink, icon} from '../dom.js';
import {startExtensions} from '../extensions.js';

start();
$<HTMLInputElement>('pname').value = nameOf();
// Link key is only ever a root: signaling gets its own derived key, media keys are random per
// sender and travel over ECDH pairwise channels, so a later link leak does not expose recorded media.
const worker = new Worker(new URL('../../worker.js', import.meta.url), {type: 'module'});

// Media mode is part of the room: a link carries it, and a different mode is a different room,
// so the URL (and therefore the copied invite) always reflects the current choice.
const linkedMode = params.get('media');
const mode = () => ($<HTMLInputElement>('mode-p2p').checked ? 'p2p' : 'relay');
$<HTMLInputElement>((linkedMode ?? config.media) === 'p2p' ? 'mode-p2p' : 'mode-relay').checked = true;

// Advanced: which relay to talk to and which ICE servers to use. Both may come from the invite
// link (?server=, ?ice=) so a whole room shares them; the form shows and can edit them.
// ICE servers are one per line: "[stun:|turn:|turns:]host:port [username password]"; stun is the default.
const iceToLines = (list: RTCIceServer[]) => list.flatMap(s => [s.urls].flat().map(u => [u, s.username, s.credential].filter(Boolean).join(' '))).join('\n');
const linesToIce = (text: string): RTCIceServer[] => text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const [url = '', username, credential] = l.split(/\s+/);
  const urls = /^(stun|turns?):/.test(url) ? url : `stun:${url}`;
  if (!/^(stun|turns?):[\w.-]+(:\d+)?(\?\w+=\w+)?$/.test(urls)) throw new Error(`${t('notHostPort')}: "${l}"`);
  return username ? {urls, username, credential} : {urls};
});
const defaultIce = config.iceServers;
const thisSite = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
$<HTMLInputElement>('server').value = params.get('server') ?? (config.server || thisSite);
$<HTMLTextAreaElement>('ice').value = params.get('ice') ?? iceToLines(defaultIce);
if (params.has('server') || params.has('ice')) $<HTMLDetailsElement>('advanced').open = true;
function advanced(): {server: string; ice: RTCIceServer[]} | null {
  try {
    const raw = $<HTMLInputElement>('server').value.trim();
    const origin = raw ? new URL(/^\w+:\/\//.test(raw) ? raw : `wss://${raw}`).origin.replace(/^http/, 'ws') : thisSite;
    const server = origin === thisSite ? '' : origin;   // empty = this site, keeps links short
    const ice = linesToIce($<HTMLTextAreaElement>('ice').value);
    $('adverr').textContent = '';
    return {server, ice};
  } catch (e) { $('adverr').textContent = `${t('advancedError')}: ${(e as Error).message}`; $<HTMLDetailsElement>('advanced').open = true; return null; }
}
/** The invite link carries the mode and the advanced settings, also when copied before joining. */
function syncUrl() {
  const q = new URLSearchParams({media: mode()}), adv = advanced();
  if (adv?.server) q.set('server', adv.server);
  if (adv && JSON.stringify(adv.ice) !== JSON.stringify(defaultIce)) q.set('ice', iceToLines(adv.ice));
  if (params.has('turnonly')) q.set('turnonly', '');
  history.replaceState(null, '', `?${q}${location.hash}`);
  return adv;
}
syncUrl();
$('mode-p2p').onchange = $('mode-relay').onchange = $('server').onchange = $('ice').onchange = syncUrl;
const rtcConfig: RTCConfiguration = {};
if (params.has('turnonly')) rtcConfig.iceTransportPolicy = 'relay';   // force media through the TURN server
$('relaynote').hidden = !defaultIce.some(s => /^turns?:/.test(String(s.urls)));

let cam: MediaStream | null = null, screen: MediaStream | null = null, screenTrack: MediaStreamTrack | null = null;
let mediaNote = '';   // shown in the status line when joining without camera or microphone
let roster: Roster, media: Media;
const tiles = new Map<string, HTMLElement>();   // "peer:stream" -> element

// --- tiles / chat / status ---
/** Placeholder for someone without video: a big initial on a colour derived from the name, the same on every screen. */
function avatar(name: string) {
  const d = document.createElement('div');
  d.className = 'avatar';
  d.textContent = (name.trim()[0] ?? '?').toUpperCase();
  let h = 0; for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  d.style.setProperty('--hue', String(h % 360));
  return d;
}
/** Camera switched off: cover the tile with an avatar instead of showing black, and badge it. */
function setCamOff(peerId: number | 'me', off: boolean, name: string) {
  for (const [tid, el] of tiles) {
    if (!tid.startsWith(`${peerId}:`) || el.classList.contains('screen')) continue;
    el.querySelector<HTMLElement>('.badge-cam')!.hidden = !off;
    if (tid.endsWith(':avatar')) continue;
    el.classList.toggle('camoff', off);
    if (off && !el.querySelector('.avatar')) el.append(avatar(name));
  }
}
/** Microphone muted: a badge on the person's tiles, so everyone can see why they are silent. */
function setMicOff(peerId: number | 'me', off: boolean) {
  for (const [tid, el] of tiles) if (tid.startsWith(`${peerId}:`) && !el.classList.contains('screen')) el.querySelector<HTMLElement>('.badge-mic')!.hidden = !off;
}
/** The state badges every person tile carries (hidden until the state applies). */
function badges() {
  const box = document.createElement('div'); box.className = 'state';
  for (const [cls, ic, text] of [['badge-mic', 'mic', t('micMuted')], ['badge-cam', 'cam', t('camIsOff')]] as const) {
    const b = document.createElement('span'); b.className = 'badge-off ' + cls; b.hidden = true;
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
    b.append(icon(ic), sr); box.append(b);
  }
  return box;
}
function localVideo(stream: MediaStream) { const v = document.createElement('video'); v.autoplay = v.playsInline = v.muted = true; v.srcObject = stream; return v; }
function remoteView(source: MediaStream | FrameSource): HTMLVideoElement | HTMLCanvasElement {
  if (source instanceof MediaStream) { const v = document.createElement('video'); v.autoplay = v.playsInline = true; v.srcObject = source; return v; }
  const canvas = document.createElement('canvas');
  source.subscribe(frame => {   // decoded frames from relay mode: paint and count
    if (canvas.width !== frame.displayWidth) { canvas.width = frame.displayWidth; canvas.height = frame.displayHeight; }
    canvas.getContext('2d')!.drawImage(frame, 0, 0);
    frame.close();
    canvas.dataset['frames'] = String(+(canvas.dataset['frames'] ?? 0) + 1);
  });
  return canvas;
}
function addTile(peerId: number | 'me', sid: string, v: HTMLElement, label: string, opts: {mirror?: boolean; screen?: boolean} = {}) {
  const tid = `${peerId}:${sid}`;
  if (tiles.has(tid)) return;
  if (sid !== 'avatar' && !opts.screen) removeTile(peerId, 'avatar');   // video arrived: drop the placeholder
  const el = document.createElement('div');
  el.className = 'tile' + (opts.screen ? ' screen' : '');
  el.dataset['peer'] = String(peerId);
  if (opts.mirror) v.classList.add('mirror');
  const l = document.createElement('div');
  l.className = 'label';
  const pin = document.createElement('button'); pin.className = 'pin'; pin.append(icon('pin')); pin.ariaLabel = t('pin'); pin.ariaPressed = 'false';
  pin.onclick = () => { const on = !el.classList.contains('pinned'); for (const o of tiles.values()) { o.classList.remove('pinned'); o.querySelector<HTMLElement>('.pin')!.ariaPressed = 'false'; } el.classList.toggle('pinned', on); pin.ariaPressed = String(on); };
  el.append(pin);
  l.textContent = label;
  el.append(v, l, badges());
  $('tiles').append(el);
  tiles.set(tid, el);
  if (!opts.screen) {   // a tile may arrive after the state did (relay mode draws the first frame late): apply what we know
    el.querySelector<HTMLElement>('.badge-mic')!.hidden = !(peerId === 'me' ? micOff : micsOff.has(peerId));
    if (peerId === 'me' ? camOff : camsOff.has(peerId)) setCamOff(peerId, true, label);
  }
}
function removeTile(peerId: number | 'me', sid: string) { tiles.get(`${peerId}:${sid}`)?.remove(); tiles.delete(`${peerId}:${sid}`); }
function removePeerTiles(id: number) { for (const [tid, el] of tiles) if (tid.startsWith(`${id}:`)) { el.remove(); tiles.delete(tid); } }
let unread = 0, toastTimer = 0, camOff = false, micOff = false, sendCam: (on: boolean) => void = () => {}, sendMic: (on: boolean) => void = () => {};
const chatLog: {who: string; text: string}[] = [];   // for late joiners, capped
const camsOff = new Set<number>(), micsOff = new Set<number>();
/** A short message above the bar; clicking it opens the chat. */
function notice(...content: (string | Node)[]) {
  const toast = $('toast');
  toast.replaceChildren(...content);
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4000);
}
function addChat(who: string, text: string, incoming = false) {
  const p = document.createElement('p'), b = document.createElement('b');
  b.textContent = who + ' ';
  p.append(b, text);
  $('messages').append(p);
  p.scrollIntoView();
  chatLog.push({who, text}); if (chatLog.length > 200) chatLog.shift();
  if (!incoming || !$('chat').hidden) return;
  // Chat is closed: count it on the Settings button and show a short toast that opens the chat.
  $('unread').textContent = String(++unread);
  $('unread').hidden = false;
  notice(Object.assign(document.createElement('b'), {textContent: who + ' '}), text);
}
function showChat(on: boolean) {
  $('chat').hidden = !on;
  toggle($('chatb'), on, 'hideChat', 'showChat');
  if (on) { unread = 0; $('unread').hidden = true; $('toast').hidden = true; $('msg').focus(); }
}
$('toast').onclick = () => showChat(true);
function updateStatus() { $('status').textContent = t('inCall', {n: roster.peers.size + 1}) + (mediaNote ? ' · ' + mediaNote : ''); }
function toggle(btn: HTMLElement, on: boolean, labelOn: string, labelOff: string) { btn.ariaPressed = String(on); btn.ariaLabel = t(on ? labelOn : labelOff); }

// Relay mode needs frames from a local track; a hidden <video> is the portable way to get them.
function grabFrames(track: MediaStreamTrack) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([track]);
  v.play().catch(() => {});
  return {frame: () => (v.readyState >= 2 ? new VideoFrame(v, {timestamp: performance.now() * 1000}) : null), stop: () => { v.srcObject = null; }};
}

// --- join ---
copyLink($('copy2'), shareLink);
$('status').textContent = t('inCall', {n: 1});
$('join').onclick = async () => {
  const myName = $<HTMLInputElement>('pname').value.trim() || t('guest');
  memo('name', myName);
  if (!advanced()) return;
  // Degrade instead of refusing: camera+mic, else mic only, else receive-only.
  try { cam = await navigator.mediaDevices.getUserMedia({video: {width: 1280, height: 720}, audio: true}); }
  catch (e) {
    const why = (e as Error).name;   // NotAllowedError, NotFoundError, NotReadableError (in use), …
    try { cam = await navigator.mediaDevices.getUserMedia({audio: true}); mediaNote = `${t('noCamera')} (${why})`; }
    catch (e2) { cam = null; mediaNote = `${t('noMedia')} (${(e2 as Error).name})`; }
    console.warn('camera:', e);
  }
  if (cam?.getVideoTracks().length) addTile('me', cam.id, localVideo(cam), t('you'), {mirror: true});
  else addTile('me', 'avatar', avatar(myName), t('you'));
  // Missing devices: show the button in its off state; a click explains instead of doing nothing.
  if (!cam?.getAudioTracks().length) { toggle($('mic'), true, 'unmute', 'mute'); micOff = true; setMicOff('me', true); }
  if (!cam?.getVideoTracks().length) camOff = true;
  // Background blur: only where the browser can do it natively (Safari on Apple devices, Chrome on
  // Windows Studio Effects, some ChromeOS). Applied as a track constraint, so both media paths get it.
  const vt = cam?.getVideoTracks()[0];
  const caps = vt?.getCapabilities?.() as (MediaTrackCapabilities & {backgroundBlur?: boolean[]}) | undefined;
  if (caps?.backgroundBlur?.includes(true)) {
    $('blurb').hidden = false;
    $('blurb').onclick = async () => {
      const on = $('blurb').ariaPressed !== 'true';
      try { await vt!.applyConstraints({advanced: [{backgroundBlur: on} as MediaTrackConstraintSet]}); $('blurb').ariaPressed = String(on); } catch {}
    };
  }
  if (!cam?.getVideoTracks().length) toggle($('camb'), true, 'camOn', 'camOff');
  $('prejoin').hidden = true;
  $('hdr').hidden = true;   // in a call the bar below has the controls; the stage gets the room
  $('calltitle').textContent = document.title;   // the page keeps one heading for screen readers
  $('call').hidden = false;
  $('mic').focus();
  const adv = syncUrl()!;
  rtcConfig.iceServers = adv.ice;

  // Media mode is part of the room: a different mode is a different room on the relay.
  const core = await join(myName, mode() === 'p2p' ? 'p2p' : 'meet', adv.server);
  const {sig} = core;
  roster = core.roster;
  const local = () => [cam, screen].filter((s): s is MediaStream => !!s);
  media = mode() === 'relay' ? new RelayMedia(sig, roster, local, grabFrames) : new Mesh(sig, roster, worker, rtcConfig, local);
  media.onTrack = (id, sid, isScreen, source) => addTile(id, sid, remoteView(source), roster.nameOf(id) + (isScreen ? ' ' + t('screen') : ''), {screen: isScreen});
  media.onTrackEnd = removeTile;
  roster.onName = (id, name) => { for (const el of $('tiles').querySelectorAll(`[data-peer="${id}"] .label`)) el.textContent = name; const av = tiles.get(`${id}:avatar`)?.querySelector('.avatar'); if (av) av.textContent = (name.trim()[0] ?? '?').toUpperCase(); };
  const prevJoin = roster.onJoin, prevLeave = roster.onLeave;   // media mode installed its own; chain the UI after it
  updateStatus();
  roster.onJoin = (id, i) => { prevJoin?.(id, i); addTile(id, 'avatar', avatar(roster.nameOf(id)), roster.nameOf(id)); updateStatus(); scaleCamera(); };
  roster.onLeave = id => { prevLeave?.(id); removePeerTiles(id); updateStatus(); scaleCamera(); };
  sig.on('chat', (id, m) => addChat(roster.nameOf(id), String(m.text).slice(0, 2000), true));
  sig.on('cam', (id, m) => { m.on ? camsOff.delete(id) : camsOff.add(id); setCamOff(id, !m.on, roster.nameOf(id)); });
  sig.on('mic', (id, m) => { m.on ? micsOff.delete(id) : micsOff.add(id); setMicOff(id, !m.on); });
  sendCam = on => sig.send('*', {t: 'cam', on});
  sendMic = on => sig.send('*', {t: 'mic', on});
  sig.onClose = () => { $('status').textContent = t('disconnected'); };

  // Extensions: logic in core/ext, rendering in ui/ext, listed in ui/extensions.ts.
  core.sync.register('chat', {
    get: () => chatLog.map(h => ({who: h.who === t('you') ? myName : h.who, text: h.text})),
    set: v => { if (Array.isArray(v)) for (const h of v.slice(0, 500) as {who: string; text: string}[]) addChat(String(h.who).slice(0, 80), String(h.text).slice(0, 2000)); },
  });
  core.sync.register('cams', {
    get: () => [...camsOff, ...(camOff ? [sig.myId] : [])],
    set: v => { for (const id of v as number[]) { camsOff.add(id); setCamOff(id, true, roster.nameOf(id)); } },
  });
  core.sync.register('mics', {
    get: () => [...micsOff, ...(micOff ? [sig.myId] : [])],
    set: v => { for (const id of v as number[]) { micsOff.add(id); setMicOff(id, true); } },
  });
  startExtensions(core, {stage: $('stage'), bar: $('extbar'), settings: $('extsettings'), main: $('mainext'), bus: core.bus, roster, remoteAudio: () => media.remoteAudio?.()}, config.extensions);
  translate($('bar'));

  sig.connect();
  if (micOff) sendMic(false);
  if (camOff) sendCam(false);
  $<HTMLFormElement>('chatform').onsubmit = e => {
    e.preventDefault();
    const input = $<HTMLInputElement>('msg'), text = input.value.trim();
    if (!text) return;
    sig.send('*', {t: 'chat', text});
    addChat(t('you'), text);
    input.value = '';
  };
    if (!navigator.mediaDevices.getDisplayMedia) $('share').hidden = true;   // no screen capture on mobile browsers
  $('share').onclick = async () => {
    if (screen) return stopScreen();
    try { screen = await navigator.mediaDevices.getDisplayMedia({video: true}); } catch { return; }
    screenTrack = screen.getVideoTracks()[0]!;
    screenTrack.contentHint = 'text';
    sig.send('*', {t: 'screen', sid: screen.id});   // sent before the track so receivers can label the tile
    media.addTrack(screenTrack, screen);
    addTile('me', screen.id, localVideo(screen), t('yourScreen'), {screen: true});
    screenTrack.onended = stopScreen;
    toggle($('share'), true, 'stopSharing', 'shareScreen');
  };
  function stopScreen() {
    if (!screen || !screenTrack) return;
    sig.send('*', {t: 'unscreen', sid: screen.id});
    removeTile('me', screen.id);
    screen.getTracks().forEach(tr => tr.stop());
    media.removeTrack(screenTrack);
    screen = screenTrack = null;
    toggle($('share'), false, 'stopSharing', 'shareScreen');
  }
};

// Quality: past four peers every encoder is better off at 360p than fighting for 720p.
let small = false;
function scaleCamera() {
  const want = roster.peers.size > 4;
  if (want === small) return;
  small = want;
  cam?.getVideoTracks()[0]?.applyConstraints(want ? {width: 640, height: 360} : {width: 1280, height: 720}).catch(() => {});
}

// --- controls ---
// Menus (Tools, Settings) are native popovers: the browser opens, closes on Escape and on a click elsewhere; a choice closes them too.
for (const menu of [$('toolsmenu'), $('settingsmenu')]) menu.addEventListener('click', e => { if ((e.target as HTMLElement).closest('button')) menu.hidePopover(); });
$('mic').onclick = () => {
  const tr = cam?.getAudioTracks()[0];
  if (!tr) return notice(`${t('noMicrophone')}: ${mediaNote}`);
  tr.enabled = !tr.enabled;
  micOff = !tr.enabled;
  toggle($('mic'), micOff, 'unmute', 'mute');
  setMicOff('me', micOff);
  sendMic(!micOff);
};
$('camb').onclick = () => {
  const tr = cam?.getVideoTracks()[0];
  if (!tr) return notice(`${t('noCamera')}: ${mediaNote}`);
  tr.enabled = !tr.enabled;
  camOff = !tr.enabled;
  toggle($('camb'), camOff, 'camOn', 'camOff');
  setCamOff('me', camOff, $<HTMLInputElement>('pname').value.trim() || t('guest'));
  sendCam(!camOff);
};
$('chatb').onclick = () => showChat($('chat').hidden);
$('leave').onclick = () => location.reload();
