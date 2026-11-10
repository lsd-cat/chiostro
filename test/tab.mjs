// Headless Chrome driver shared by the end-to-end tests: tabs over the DevTools protocol, CSP
// violations, exceptions and console errors collected per tab. No npm deps.
import {spawn} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const ROOT = process.env.E2E_URL ?? 'http://127.0.0.1:8080/';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** `init`: a script run in every new document before the page's own (the call suite hooks RTCPeerConnection). */
export async function launch(port, flags = [], init = '') {
  const base = `http://127.0.0.1:${port}`;
  const profile = mkdtempSync(join(tmpdir(), 'e2e-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,800', ...flags, 'about:blank'], {stdio: 'ignore'});
  process.on('exit', () => { chrome.kill('SIGKILL'); try { rmSync(profile, {recursive: true, force: true}); } catch {} });
  for (let i = 0; i < 40; i++) { try { await fetch(`${base}/json/version`); break; } catch { await sleep(250); } }
  class Tab {
    static all = [];
    static async open(url) {
      const t = await (await fetch(`${base}/json/new?about:blank`, {method: 'PUT'})).json();
      const tab = new Tab(); tab.ws = new WebSocket(t.webSocketDebuggerUrl); tab.n = 0; tab.pending = new Map(); tab.violations = [];
      tab.ws.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id) tab.pending.get(m.id)?.(m);
        else if (m.method === 'Log.entryAdded' && /Content Security Policy|CSP/.test(m.params.entry.text)) tab.violations.push(m.params.entry.text);
        else if (m.method === 'Runtime.exceptionThrown') tab.violations.push('EXC ' + m.params.exceptionDetails.exception?.description);
        else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') tab.violations.push('console.error ' + m.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
      };
      Tab.all.push(tab); await new Promise(r => tab.ws.onopen = r); await tab.call('Page.enable'); await tab.call('Log.enable'); await tab.call('Runtime.enable'); await tab.call('DOM.enable');
      if (init) await tab.call('Page.addScriptToEvaluateOnNewDocument', {source: init});
      await tab.call('Page.navigate', {url}); return tab;
    }
    call(method, params = {}) { const id = ++this.n; this.ws.send(JSON.stringify({id, method, params})); return new Promise(r => this.pending.set(id, r)); }
    async eval(expression) {
      const r = await this.call('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
      if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
      return r.result.result.value;
    }
    async until(expr, timeout = 15000) {
      for (let t = 0; t < timeout; t += 250) { const v = await this.eval(expr).catch(() => null); if (v) return v; await sleep(250); }
      throw new Error('timeout: ' + expr);
    }
    async setFiles(selector, files) {
      const {root: {nodeId}} = (await this.call('DOM.getDocument')).result;
      const {nodeId: input} = (await this.call('DOM.querySelector', {nodeId, selector})).result;
      await this.call('DOM.setFileInputFiles', {nodeId: input, files});
    }
    async goto(url) { await this.call('Page.navigate', {url}); }
    async close() { await this.call('Page.close'); }
  }
  return {Tab, profile, fail: msg => { console.log('FAIL:', msg); process.exit(1); }};
}

// Keys as the shell derives them: a tool's secret from the meeting secret, and a view key from a tool secret (all base64url).
const hkdf = async (ikm, label) => Buffer.from(await crypto.subtle.deriveBits({name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(label)}, await crypto.subtle.importKey('raw', Buffer.from(ikm, 'base64url'), 'HKDF', false, ['deriveBits']), 128)).toString('base64url');
export const toolKey = (fragment, app) => fragment.startsWith('~') ? fragment.slice(1).split('.')[0] : hkdf(fragment.split('.')[0], 'tool/' + app);   // a tool link already is the key
export const viewKey = (tool, app) => hkdf(tool, app + '/view');
