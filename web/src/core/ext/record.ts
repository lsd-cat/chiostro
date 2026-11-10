// Recording, logic: only the "who is recording" indicator is shared; the recording itself is
// local to the recorder (the only kind an end-to-end encrypted call can have).
import type {Core} from '../ext.js';

export class Recording {
  readonly recording = new Set<number | 'me'>();
  onChange?: () => void;

  constructor(private core: Core) {
    const {sig} = core;
    sig.on('rec', (id, m) => { m.on ? this.recording.add(id) : this.recording.delete(id); this.onChange?.(); });
    core.sync.register('rec', {
      get: () => [...this.recording].map(id => core.sync.idOf(id)),
      set: v => { for (const id of v as number[]) this.recording.add(id); this.onChange?.(); },
    });
  }

  set(on: boolean) {
    on ? this.recording.add('me') : this.recording.delete('me');
    this.core.sig.send('*', {t: 'rec', on});
    this.onChange?.();
  }
}
