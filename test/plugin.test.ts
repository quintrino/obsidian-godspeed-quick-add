// Runs the real plugin (src/main.ts) against a stub of Obsidian's API.

import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { build } from 'esbuild';

const result = await build({
  entryPoints: [new URL('./support/entry.ts', import.meta.url).pathname],
  bundle: true,
  format: 'esm',
  write: false,
  alias: { obsidian: new URL('./support/obsidian-stub.ts', import.meta.url).pathname },
  logLevel: 'silent',
});
const code = result.outputFiles[0].text;
const mod: any = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { default: Plugin, TFile, TFolder, MarkdownView, notices, requests, modals, state, reset } = mod;

const NOTE = 'Law/Constitution.md';
const HEADINGS = [
  { heading: 'Constitution', position: { start: { line: 2 } } },
  { heading: 'Section 3', position: { start: { line: 12 } } },
];

interface Setup {
  active?: string | null;
  view?: any;
  secret?: string | null;
  settings?: unknown;
}

async function load({ active = NOTE, view, secret = 'sk-test', settings }: Setup = {}) {
  const activeFile = active ? new TFile(active) : null;
  const workspace: any = {
    handlers: {},
    getActiveFile: () => activeFile,
    getActiveViewOfType: () => view?.(activeFile) ?? null,
  };
  const app = {
    workspace,
    vault: { getName: () => 'My Vault' },
    metadataCache: { getFileCache: () => ({ headings: HEADINGS }) },
    secretStorage: { getSecret: (id: string) => (id === 'godspeed-api-key' ? secret : null) },
  };
  const plugin = new Plugin(app);
  plugin.stored = settings ?? null;
  await plugin.onload();
  const command = (id: string) => plugin.commands.find((c: any) => c.id === id);
  return { plugin, app, workspace, command };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const body = (i = 0) => JSON.parse(requests[i].body);

beforeEach(() => reset());

test('registers both commands, the ribbon icon and the right-click menus', async () => {
  const { plugin, workspace } = await load();
  assert.deepEqual(plugin.commands.map((c: any) => c.name), [
    'Send note to Godspeed',
    'Send note to Godspeed with extra text',
  ]);
  assert.equal(plugin.ribbons.length, 1);
  assert.equal(workspace.handlers['file-menu'].length, 1);
  assert.equal(workspace.handlers['files-menu'].length, 1);
  assert.equal(plugin.commands.every((c: any) => c.hotkeys === undefined), true, 'no default hotkeys');
});

test('the commands are only available while a note is open', async () => {
  const none = await load({ active: null });
  assert.equal(none.command('send-note').checkCallback(true), false);
  assert.equal(none.command('send-note-with-text').checkCallback(true), false);

  const open = await load();
  assert.equal(open.command('send-note').checkCallback(true), true);
  assert.equal(requests.length, 0, 'checking does not send');
});

test('sends the note with the heading under the cursor, to the Godspeed API', async () => {
  const view = (file: any) => new MarkdownView(file, 'source', 14);
  const { command } = await load({ view });
  command('send-note').checkCallback(false);
  await settle();

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.godspeedapp.com/tasks');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers.Authorization, 'Bearer sk-test');
  assert.equal(requests[0].throw, false);
  assert.deepEqual(body(), {
    title: 'title: Constitution > Section 3 link: obsidian://open?vault=My%20Vault&file=Law%2FConstitution%23Section%203',
  });
  assert.deepEqual(notices, [{ message: 'Sent successfully', duration: 3000 }]);
});

test('above the first heading, or with no editor, only the file name is used', async () => {
  const above = await load({ view: (file: any) => new MarkdownView(file, 'source', 0) });
  above.command('send-note').checkCallback(false);
  await settle();
  assert.equal(body().title, 'title: Constitution link: obsidian://open?vault=My%20Vault&file=Law%2FConstitution');

  reset();
  const noView = await load();
  noView.command('send-note').checkCallback(false);
  await settle();
  assert.equal(body().title, 'title: Constitution link: obsidian://open?vault=My%20Vault&file=Law%2FConstitution');
});

test('in reading view the heading near the top of the screen is used', async () => {
  const { command } = await load({ view: (file: any) => new MarkdownView(file, 'preview', 99, 13) });
  command('send-note').checkCallback(false);
  await settle();
  assert.match(body().title, /^title: Constitution > Section 3 link: /);
});

test('a heading is taken from the cursor of the note that is open, not another view', async () => {
  const other = (_file: any) => new MarkdownView(new TFile('Other.md'), 'source', 14);
  const { command } = await load({ view: other });
  command('send-note').checkCallback(false);
  await settle();
  assert.doesNotMatch(body().title, /Section 3/);
});

test('without an API key nothing is sent and the user is told', async () => {
  const { command } = await load({ secret: null });
  command('send-note').checkCallback(false);
  await settle();
  assert.equal(requests.length, 0);
  assert.deepEqual(notices, [{ message: 'Please add your Godspeed API key in the plugin settings', duration: 5000 }]);
});

test('the list id from the settings is sent', async () => {
  const { command } = await load({ settings: { listId: ' list-9 ' } });
  command('send-note').checkCallback(false);
  await settle();
  assert.equal(body().list_id, 'list-9');
});

test('a refusal from the API is shown for 10 seconds', async () => {
  state.response = { status: 401, text: '{"message":"Bad token"}' };
  const { command } = await load();
  command('send-note').checkCallback(false);
  await settle();
  assert.deepEqual(notices, [{ message: 'Failed to send "Constitution": Bad token', duration: 10000 }]);
});

test('a network failure is reported, not thrown', async () => {
  state.fail = new Error('offline');
  const { command } = await load();
  command('send-note').checkCallback(false);
  await settle();
  assert.deepEqual(notices, [{ message: 'Failed to send "Constitution": offline', duration: 10000 }]);
});

test('with extra text: the box opens first and nothing is sent until it is submitted', async () => {
  const { command } = await load({ view: (file: any) => new MarkdownView(file, 'source', 14) });
  command('send-note-with-text').checkCallback(false);
  await settle();
  assert.equal(modals.length, 1);
  assert.equal(modals[0].opened, true);
  assert.equal(requests.length, 0);
});

test('extra text goes at the front of the title by default', async () => {
  const { command } = await load({ view: (file: any) => new MarkdownView(file, 'source', 14) });
  command('send-note-with-text').checkCallback(false);
  // The user types, then submits; the heading was worked out before the box opened
  modals[0].onSubmit('Call about this');
  await settle();
  assert.match(body().title, /^Call about this title: Constitution > Section 3 link: /);
  assert.equal(body().notes, undefined);
});

test('extra text can go into the notes instead', async () => {
  const { command } = await load({ settings: { quickAddTarget: 'notes' } });
  command('send-note-with-text').checkCallback(false);
  modals[0].onSubmit('Call about this');
  await settle();
  assert.match(body().title, /^title: Constitution link: /);
  assert.equal(body().notes, 'Call about this');
});

test('right-clicking one note sends it, with no heading', async () => {
  const { workspace } = await load();
  const items: any[] = [];
  const item: any = {
    setTitle: (t: string) => ((item.title = t), item),
    setIcon: () => item,
    onClick: (cb: () => void) => ((item.click = cb), item),
  };
  const menu = { addItem: (cb: (i: any) => void) => (cb(item), items.push(item)) };

  workspace.handlers['file-menu'][0](menu, new TFolder());
  assert.equal(items.length, 0, 'folders get no item');

  workspace.handlers['file-menu'][0](menu, new TFile('Notes/Idea.md'));
  assert.equal(item.title, 'Send to Godspeed');
  item.click();
  await settle();
  assert.equal(body().title, 'title: Idea link: obsidian://open?vault=My%20Vault&file=Notes%2FIdea');
});

test('several selected files become several tasks, and folders are skipped', async () => {
  const { workspace } = await load();
  const item: any = {
    setTitle: (t: string) => ((item.title = t), item),
    setIcon: () => item,
    onClick: (cb: () => void) => ((item.click = cb), item),
  };
  let added = 0;
  const menu = { addItem: (cb: (i: any) => void) => (cb(item), added++) };

  workspace.handlers['files-menu'][0](menu, [new TFolder()]);
  assert.equal(added, 0);

  workspace.handlers['files-menu'][0](menu, [new TFile('A.md'), new TFolder(), new TFile('B/C.md')]);
  assert.equal(item.title, 'Send 2 files to Godspeed');
  item.click();
  await settle();
  assert.equal(requests.length, 2);
  assert.match(body(0).title, /^title: A link: /);
  assert.match(body(1).title, /^title: C link: .*file=B%2FC$/);
  assert.deepEqual(notices, [{ message: '2 notes sent successfully', duration: 3000 }]);
});

test('when one of several fails the others still go and each failure is reported', async () => {
  const { workspace } = await load();
  let calls = 0;
  const original = state.response;
  Object.defineProperty(state, 'response', {
    configurable: true,
    get: () => (++calls === 2 ? { status: 500, text: 'boom' } : original),
    set: () => {},
  });
  const item: any = { setTitle: () => item, setIcon: () => item, onClick: (cb: () => void) => ((item.click = cb), item) };
  workspace.handlers['files-menu'][0]({ addItem: (cb: (i: any) => void) => cb(item) }, [
    new TFile('A.md'),
    new TFile('B.md'),
    new TFile('C.md'),
  ]);
  item.click();
  await settle();

  assert.equal(requests.length, 3);
  assert.deepEqual(notices, [
    { message: '2 of 3 notes sent successfully', duration: 3000 },
    { message: 'Failed to send "B": HTTP 500: boom', duration: 10000 },
  ]);
});

test('loading the plugin, idling, and opening menus makes no network request at all', async () => {
  const { workspace, command } = await load({ view: (file: any) => new MarkdownView(file, 'source', 14) });
  const item: any = { setTitle: () => item, setIcon: () => item, onClick: () => item };
  workspace.handlers['file-menu'][0]({ addItem: (cb: (i: any) => void) => cb(item) }, new TFile('A.md'));
  workspace.handlers['files-menu'][0]({ addItem: (cb: (i: any) => void) => cb(item) }, [new TFile('A.md'), new TFile('B.md')]);
  command('send-note').checkCallback(true);
  command('send-note-with-text').checkCallback(true);
  command('send-note-with-text').checkCallback(false); // box opens, nothing typed
  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(requests.length, 0);
  assert.equal(notices.length, 0);
});

test('one run of a command makes exactly one request', async () => {
  const { command } = await load();
  command('send-note').checkCallback(false);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(requests.length, 1);
});

test('a held-down hotkey (key repeat) sends once, not once per repeat', async () => {
  const { command } = await load();
  for (let i = 0; i < 8; i++) command('send-note').checkCallback(false);
  await settle();
  assert.equal(requests.length, 1);
  assert.deepEqual(notices, [{ message: 'Sent successfully', duration: 3000 }]);
});

test('sending a different note straight after is not blocked by the repeat guard', async () => {
  const { workspace } = await load();
  const handlers: (() => void)[] = [];
  const item: any = { setTitle: () => item, setIcon: () => item, onClick: (cb: () => void) => (handlers.push(cb), item) };
  const add = (file: string) => workspace.handlers['file-menu'][0]({ addItem: (cb: (i: any) => void) => cb(item) }, new TFile(file));
  add('A.md');
  add('B.md');
  handlers[0]();
  handlers[1]();
  await settle();
  assert.equal(requests.length, 2);
});
