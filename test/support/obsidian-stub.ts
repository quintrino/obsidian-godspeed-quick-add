// A small stand-in for the `obsidian` module, just enough to run the plugin in Node.
// The plugin is bundled against this (see plugin.test.ts), so main.ts runs unchanged.

export const notices: { message: string; duration?: number }[] = [];
export const requests: any[] = [];
export const modals: any[] = [];
export const state: {
  response: { status: number; text: string };
  fail: Error | null;
} = { response: { status: 200, text: '{"id":"t1"}' }, fail: null };

export function reset(): void {
  notices.length = 0;
  requests.length = 0;
  modals.length = 0;
  state.response = { status: 200, text: '{"id":"t1"}' };
  state.fail = null;
}

export class Notice {
  constructor(message: string, duration?: number) {
    notices.push({ message, duration });
  }
}

export class TAbstractFile {
  path = '';
}

export class TFile extends TAbstractFile {
  constructor(path: string) {
    super();
    this.path = path;
  }
}

export class TFolder extends TAbstractFile {}

export class MarkdownView {
  file: TFile;
  mode: 'source' | 'preview';
  cursorLine: number;
  scroll: number;
  editor = { getCursor: () => ({ line: this.cursorLine, ch: 0 }) };
  previewMode = { getScroll: () => this.scroll };
  constructor(file: TFile, mode: 'source' | 'preview' = 'source', cursorLine = 0, scroll = 0) {
    this.file = file;
    this.mode = mode;
    this.cursorLine = cursorLine;
    this.scroll = scroll;
  }
  getMode() {
    return this.mode;
  }
}

export class Modal {
  app: any;
  opened = false;
  constructor(app: any) {
    this.app = app;
    modals.push(this);
  }
  open() {
    this.opened = true;
  }
  close() {
    this.opened = false;
  }
}

export class PluginSettingTab {
  constructor(public app: any, public plugin: any) {}
}
export class Setting {}
export class SecretComponent {}

export async function requestUrl(request: any) {
  requests.push(request);
  if (state.fail) throw state.fail;
  return state.response;
}

export class Plugin {
  app: any;
  commands: any[] = [];
  ribbons: any[] = [];
  handlers: Record<string, ((...args: any[]) => void)[]> = {};
  stored: unknown = null;

  constructor(app: any) {
    this.app = app;
    const on = (name: string, cb: (...args: any[]) => void) => {
      (app.workspace.handlers[name] ??= []).push(cb);
      return { name };
    };
    app.workspace.on = on;
  }
  addCommand(command: any) {
    this.commands.push(command);
  }
  addRibbonIcon(icon: string, title: string, callback: () => void) {
    this.ribbons.push({ icon, title, callback });
  }
  registerEvent() {}
  addSettingTab() {}
  async loadData() {
    return this.stored;
  }
  async saveData(data: unknown) {
    this.stored = data;
  }
}
