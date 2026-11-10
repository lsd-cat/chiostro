<p align="center"><img src="themes/chiostro.svg" width="220" alt="Chiostro"></p>

# Chiostro

Meeting tools with end-to-end encryption: a video call, a date poll, a collaborative document,
file sharing and forms. Deployed at [chiost.ro](https://chiost.ro).

- **Call** `/meet/`: video and audio through the relay or peer to peer, chat, screen and PDF
  sharing, annotations, polls, agenda, hand raise, local recording, embeds.
- **Plan** `/when/`: a "when can everyone meet" poll in the style of crab.fit, with a group
  heatmap, time zone conversion, best times and an `.ics` file.
- **Pad** `/pad/`: a markdown editor with live preview, slides, presenting, author colours, live
  cursors, comment threads, attachments, history, a read-only link, PDF export through a LaTeX
  engine running in the browser, and a one-way switch to a collaborative LaTeX document.
- **Files** `/share/`: chunked encrypted uploads with previews, a read-only link and a
  command-line key.
- **Form** `/form/`: forms and polls whose answers are readable by the owner only, or by
  everyone, with live results and a presenting mode in the style of Mentimeter.

Content is encrypted in the browser with keys derived from the link. The server forwards sealed
messages between the members of a room and stores sealed blobs. The tools are served from a single
origin as a static bundle with a `config.json` for per-deployment settings. The client has no
runtime dependencies and the Content Security Policy allows no inline script or style.

## Links and keys

A meeting link (`/#M`) opens every tool of a meeting. Each tool derives its own secret
`T = HKDF(M, "tool/<app>")`. A tool link (`/pad/#~T`) opens that tool alone, and `M` cannot be
computed from `T`. When a tool is opened from a meeting link, the address bar is rewritten to the
tool link and `M` is kept in session storage of that tab, so copying the address shares that tool
only. Pads and files also have a view link (`?view#~V`, `V = HKDF(T)`) that can read and verify
but cannot write as an editor.

## Security model

- **Server knowledge.** Room ids are hashes of secrets the server does not receive. The server
  sees room ids, message sizes, timing and client addresses.
- **Relay.** A WebSocket per room. Each message is sealed with AES-GCM; the authenticated data
  holds a per-sender counter and the sender's relay id, so the relay cannot replay a message or
  attribute it to another member. Media keys are per sender, exchanged over ECDH pairwise keys and
  rotated when a member joins or leaves. Receivers drop a frame unless it is newer than the last
  frame received from that sender under the same key.
- **Store.** Blobs are written once and sealed with the slot name as authenticated data; each room
  has an index. The write-once rule holds under concurrent puts. The exception is attachments:
  a file's manifest is stored with the hash of a removal token that only editors can derive from
  their secret, and a DELETE with that token removes the manifest and its chunks from the server;
  readers of a view link cannot derive it. Nothing else can be removed before the room expires. Blobs are served as
  `application/octet-stream` with `Content-Disposition: attachment`, regardless of the type sent by
  the uploader. Limits: a quota per room, a rate limit per client address, 8 MB per put.
- **Read-only links.** Checkpoints and file manifests are verified against the editors' public
  key, stored in a write-once slot of the room. An editor publishes this key before the view link
  is offered and stops if the slot already holds a different key. A reader who finds no key renders
  nothing.
- **Trust between members.** Whoever holds a link is a full member of that room. Owner-only
  controls inside a call are a convenience, not a guarantee. Data that leaves the room by design: a
  planner's calendar file contains the call's link; an invite link may contain a relay origin or
  TURN credentials; an image hot-linked in a pad is fetched by each reader's browser.
- **Expiry.** A room is deleted after the configured number of days without a write. Reads do not
  extend a room's life. There are no accounts and no administrative interface.

## Run locally

```sh
npm install && npm run build
mkdir -p openresty/data/{tmp,meet,p2p,when,pad,share,form}
openresty -p openresty -c nginx.conf        # http://127.0.0.1:8080
```

A `config.json` in the repository root takes precedence over `config.example.json`. PDF export
requires a TeX bundle: symlink `openresty/texmf` to the `bundles/minimal` directory of
[tstex](https://github.com/lsd-cat/tstex).

```sh
npm test       # unit tests, relay protocol in both store modes, a 40-peer load test
npm run e2e    # each tool in headless Chrome, hostile peers, time zones, chaos, stress, accessibility
```

A browser run fails on a CSP violation, an uncaught exception or a console error.

## Configuration

The bundle is the same for all deployments, which allows it to be signed for WEBCAT. Deployment
settings are data:

- **`config.json`**, public, validated as untrusted input: `name`, `tagline`, `logo` (an image
  on this origin or over https, shown on the landing page and in the header), `intro` (a paragraph
  on the landing page), `links` (label and URL pairs in the landing page's footer), `apps`, a default
  relay `server`, `iceServers`, `media` (`relay` or `p2p`), `extensions` enabled by name, `texmf`,
  and `theme` with CSS variable values for the light and dark schemes. Logos and other assets ship
  under `themes/` in the bundle (`themes/chiostro.svg` is the project's), or come from any https URL. Setting `accent` is
  sufficient; the other colours are derived in OKLCH. Values that could load a resource or break
  out of a declaration are rejected. TURN credentials placed in this file are visible to all
  visitors.
- **`openresty/store.conf`**, server side, private: where blobs are stored. An empty `$data`
  selects `openresty/data`; `store.s3.conf.example` shows the bucket variant. The client does not
  observe which backend is in use.
- **Query parameters**: `?server=`, `?ice=` and `?media=` apply to a call; `?view` opens the
  read-only page.

## Storage

Blobs are stored on the server's disk or in an S3-compatible bucket. In bucket mode the relay
signs each request with Signature V4 (`openresty/s3.lua`) and proxies it through an internal nginx
location; the browser does not contact the bucket and the provider does not see client addresses.
Object keys match the file names used on disk, the bucket listing serves as the index, and the host
holds only the upload spool, so a restore consists of a new host and a run of the role. Expiry and
checkpoint pruning in bucket mode are done by `openresty/expire.lua`, called daily from cron on
the loopback. `test/relay-s3.test.mjs` starts a second relay against an in-process S3 server that
verifies each signature.

## Deploying

`deploy/roles/chiostro` is an Ansible role for a Debian host with nginx and
`libnginx-mod-http-lua`. It installs the vhost with the Content Security Policy, a Let's Encrypt
certificate through acme.sh, the bundle, `config.json` from `chiostro_config`, the relay and store
Lua files, the store snippet from `chiostro_store` and `chiostro_s3` (the key pair should be in
Ansible Vault), and the daily cron jobs. Rooms are held in the memory of a single nginx worker, so
the role requires `worker_processes 1`.

## Browsers

Current Chrome, Firefox and Safari. In Tor Browser at the Safer level, the plan, pad, files and
forms work; calls provide chat and the shared tools but no media, because Tor Browser disables
WebRTC, camera and microphone. PDF export is plain JavaScript and works there as well, more slowly
without the JIT.

## Layout

```
web/index.html            the shell: header, navigation, a <template> per tool
web/style.css, web/css/   tokens and components; a stylesheet per tool
web/src/core/             logic without DOM access: crypto, session, signaling, store, files, OT, doc, markdown, tex, i18n
web/src/ui/               the shell, helpers, a module per tool, call extensions
openresty/                relay.lua, s3.lua, expire.lua, nginx.conf, store.conf, vendored resty modules
deploy/roles/chiostro     the Ansible role
test/                     unit tests and headless-Chrome suites
```

## Languages

English, Italian, French, Spanish, Chinese and Arabic (right to left). One file per language under
`web/src/core/lang/`, one key per line, each with a comment saying where the string appears and,
outside English, the English source. `node tools/i18n-split.mjs` refreshes the comments after a
build. A test fails when a key is missing from any language.

## Limits

Mesh calls support about eight participants with video. The holder of a tool link is a full member
of that room: they can read everything in it and write under any name. History makes vandalism
recoverable but does not prevent it. The planner's grid logic is ported from crab.fit (GPL-3.0).
