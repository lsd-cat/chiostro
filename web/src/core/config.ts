// Per-deployment configuration, fetched as data from /config.json so the signed app bundle is
// identical across realms (WEBCAT). Everything here is untrusted input: validated, never
// interpreted as markup or stylesheet text. Theme values are CSS custom-property values set
// through the CSSOM, which the strict CSP allows.
export type Theme = Record<string, string>;
export type Link = {label: string; url: string};
export type Config = {name: string; tagline: string; logo: string; intro: string; links: Link[]; texmf: string; server: string; apps: string[]; media: 'relay' | 'p2p'; iceServers: RTCIceServer[]; theme: {light: Theme; dark: Theme}; extensions: Record<string, boolean>};

export const THEME_VARS = ['bg', 'panel', 'panel-2', 'fg', 'muted', 'border', 'accent', 'accent-fg', 'accent-hover', 'tint', 'tint-2', 'danger', 'tile', 'radius', 'radius-panel', 'font', 'primary-bg', 'primary-bg-hover', 'h1-weight'];
// colors, lengths, gradients, font lists; nothing that can fetch or escape (url(), @, backslash, braces, semicolons)
const SAFE_VALUE = /^[\w\s#%.,()/"'-]{1,200}$/;
const UNSAFE = /url\s*\(|expression|@|\\|;|\{|\}/i;
const SAFE_URL = /^(\/[\w./-]*|https:\/\/[\w.-]+(:\d+)?(\/[\w./%?=&#-]*)?)$/;   // a path on this origin, or an https URL

export const DEFAULTS: Config = {name: 'Chiostro', tagline: '', logo: '', intro: '', links: [], texmf: '/texmf/', server: '', apps: ['meet', 'when', 'pad', 'share', 'form'], media: 'relay', iceServers: [{urls: 'stun:stun.l.google.com:19302'}], theme: {light: {}, dark: {}}, extensions: {}};

/** Theme variables from untrusted input: known names, safe values only. */
export function theme(set: unknown): Theme {
  const out: Theme = {};
  if (set && typeof set === 'object') for (const [k, v] of Object.entries(set as Record<string, unknown>))
    if (THEME_VARS.includes(k) && typeof v === 'string' && SAFE_VALUE.test(v) && !UNSAFE.test(v)) out[k] = v;
  return out;
}

export function validate(raw: unknown): Config {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ice = Array.isArray(r['iceServers']) ? (r['iceServers'] as unknown[]).filter((s): s is RTCIceServer => !!s && typeof s === 'object' && 'urls' in s) : DEFAULTS.iceServers;
  const t = (r['theme'] ?? {}) as Record<string, unknown>;
  return {
    name: typeof r['name'] === 'string' && r['name'].trim() ? r['name'].trim().slice(0, 60) : DEFAULTS.name,
    tagline: typeof r['tagline'] === 'string' ? r['tagline'].trim().slice(0, 200) : '',   // the landing page's line under the name; the translated default otherwise
    logo: typeof r['logo'] === 'string' && SAFE_URL.test(r['logo']) ? r['logo'] : '',   // an image on this origin or over https, shown on the landing page and in the header
    intro: typeof r['intro'] === 'string' ? r['intro'].trim().slice(0, 1000) : '',   // a paragraph of plain text on the landing page, under the tools
    links: Array.isArray(r['links']) ? (r['links'] as unknown[]).flatMap(l => { const x = l as Record<string, unknown>; return x && typeof x['label'] === 'string' && x['label'].trim() && typeof x['url'] === 'string' && SAFE_URL.test(x['url']) ? [{label: x['label'].trim().slice(0, 60), url: x['url']}] : []; }).slice(0, 8) : [],   // the landing page's footer: the organisation, a privacy notice
    texmf: typeof r['texmf'] === 'string' && /^(\/[\w./-]*\/|https:\/\/[\w.:/-]+\/)$/.test(r['texmf']) ? r['texmf'] : DEFAULTS.texmf,   // the TeX Live bundle tstex reads: this origin, or a CORS-enabled https prefix
    server: typeof r['server'] === 'string' && /^wss?:\/\/[\w.-]+(:\d+)?$/.test(r['server']) ? r['server'] : '',
    // Which apps this deployment serves (paths of the shell); the others are not linked to.
    apps: Array.isArray(r['apps']) ? (r['apps'] as unknown[]).filter((a): a is string => typeof a === 'string' && /^[a-z]{2,8}$/.test(a)) : DEFAULTS.apps,
    media: r['media'] === 'p2p' ? 'p2p' : 'relay',
    iceServers: ice,
    theme: {light: theme(t['light']), dark: theme(t['dark'])},
    // per-deployment on/off switches by extension name; unknown names are ignored by the loader
    extensions: Object.fromEntries(Object.entries((r['extensions'] && typeof r['extensions'] === 'object' ? r['extensions'] : {}) as Record<string, unknown>).filter(([k, v]) => /^[a-z]+$/.test(k) && typeof v === 'boolean') as [string, boolean][]),
  };
}

export async function loadConfig(): Promise<Config> {
  try {
    const res = await fetch('/config.json');
    return res.ok ? validate(await res.json()) : DEFAULTS;
  } catch { return DEFAULTS; }
}

