// The extension list. Each entry pairs optional logic (core/ext, built with Core) with optional UI
// (ui/ext, built with the logic object and UiCtx). ui/apps/meet.ts constructs them in order and knows
// nothing else about them; extensions talk to each other only through the bus.
import type {Core} from '../core/ext.js';
import type {UiCtx} from './dom.js';
import {PdfShare} from '../core/ext/pdf.js';
import {Ink} from '../core/ext/ink.js';
import {PdfUi} from './ext/pdf.js';
import {InkUi} from './ext/ink.js';
import {PipUi} from './ext/pip.js';
import {Hand} from '../core/ext/hand.js';
import {HandUi} from './ext/hand.js';
import {Polls} from '../core/ext/poll.js';
import {PollUi} from './ext/poll.js';
import {Agenda} from '../core/ext/agenda.js';
import {AgendaUi} from './ext/agenda.js';
import {Recording} from '../core/ext/record.js';
import {RecordUi} from './ext/record.js';
import {Embeds} from '../core/ext/embed.js';
import {EmbedUi} from './ext/embed.js';

export type Extension = {
  name: string;
  enabled: boolean;                                  // default; config.json "extensions": {name: bool} overrides
  core?: new (core: Core) => unknown;
  ui?: new (logic: never, ui: UiCtx) => unknown;   // `logic` is this entry's core instance (undefined if none)
};

const EXTENSIONS: Extension[] = [
  {name: 'pdf', enabled: true, core: PdfShare, ui: PdfUi},
  {name: 'ink', enabled: true, core: Ink, ui: InkUi},
  {name: 'pip', enabled: true, ui: PipUi},
  {name: 'hand', enabled: true, core: Hand, ui: HandUi},
  {name: 'poll', enabled: true, core: Polls, ui: PollUi},
  {name: 'agenda', enabled: false, core: Agenda, ui: AgendaUi},
  {name: 'record', enabled: true, core: Recording, ui: RecordUi},
  {name: 'embed', enabled: true, core: Embeds, ui: EmbedUi},    // the server's frame-src must allow https: (default)
];

export function startExtensions(core: Core, ui: UiCtx, switches: Record<string, boolean>) {
  for (const ext of EXTENSIONS) {
    if (!(switches[ext.name] ?? ext.enabled)) continue;
    const logic = ext.core ? new ext.core(core) : undefined;
    if (ext.ui) new ext.ui(logic as never, ui);
  }
}
