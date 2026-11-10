// Extension contract, core side. An extension's logic is a class constructed with Core: it
// registers its own message types on core.sig and talks to other extensions through core.bus.
// Its UI is a separate class in ui/ that only observes the logic object and renders.
import type {Signaling} from './signaling.js';
import type {Roster} from './roster.js';
import type {Sync} from './sync.js';
import type {Store} from './store.js';

export class Bus {
  private h = new Map<string, ((data?: unknown) => void)[]>();
  on(name: string, fn: (data?: unknown) => void) { this.h.set(name, [...(this.h.get(name) ?? []), fn]); }
  emit(name: string, data?: unknown) { for (const fn of this.h.get(name) ?? []) fn(data); }
}

export type Core = {sig: Signaling; roster: Roster; bus: Bus; sync: Sync; store: Store};
