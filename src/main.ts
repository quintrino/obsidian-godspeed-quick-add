import { MarkdownView, Notice, Plugin, TFile, requestUrl } from 'obsidian';
import type { TAbstractFile } from 'obsidian';
import { createTask, summarizeResults } from './godspeed.ts';
import type { HttpRequest, HttpResponse, SendResult } from './godspeed.ts';
import { headingAtLine } from './heading.ts';
import type { HeadingInfo } from './heading.ts';
import { displayName } from './link.ts';
import { QuickAddModal } from './quickAddModal.ts';
import { DEFAULT_SETTINGS, normalizeSettings, readApiKey } from './settings.ts';
import type { GodspeedSettings } from './settings.ts';
import { GodspeedSettingTab } from './settingsTab.ts';
import { buildTask } from './task.ts';

/** The same send arriving again within this long is treated as key repeat and ignored. */
const REPEAT_GUARD_MS = 2000;

/** A note to send, and the heading the cursor was under when the command ran (if any). */
interface Target {
  file: TFile;
  heading?: string | null;
}

export default class GodspeedQuickAddPlugin extends Plugin {
  settings: GodspeedSettings = { ...DEFAULT_SETTINGS };

  /** When each send started, so a held-down hotkey (key auto-repeat) cannot send the same thing again and again. */
  private readonly recentSends = new Map<string, number>();

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());

    // checkCallback (not an editor-only callback) so a hotkey also works from reading view,
    // and the commands are only offered while a note is open
    this.addCommand({
      id: 'send-note',
      name: 'Send note to Godspeed',
      checkCallback: (checking) => this.runForCurrentNote(checking, false),
    });
    this.addCommand({
      id: 'send-note-with-text',
      name: 'Send note to Godspeed with extra text',
      checkCallback: (checking) => this.runForCurrentNote(checking, true),
    });

    this.addRibbonIcon('send', 'Send note to Godspeed', () => {
      this.runForCurrentNote(false, false);
    });

    // Right-click a note in the file explorer, or several selected notes
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFile)) return;
        menu.addItem((item) =>
          item
            .setTitle('Send to Godspeed')
            .setIcon('send')
            .onClick(() => void this.send([{ file }]))
        );
      })
    );
    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files: TAbstractFile[]) => {
        const notes = files.filter((file): file is TFile => file instanceof TFile);
        if (notes.length === 0) return;
        menu.addItem((item) =>
          item
            .setTitle(notes.length === 1 ? 'Send to Godspeed' : `Send ${notes.length} files to Godspeed`)
            .setIcon('send')
            .onClick(() => void this.send(notes.map((file) => ({ file }))))
        );
      })
    );

    this.addSettingTab(new GodspeedSettingTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Command body. With `checking` true it only reports whether the command can run now. */
  private runForCurrentNote(checking: boolean, askForText: boolean): boolean {
    const file = this.app.workspace.getActiveFile();
    if (!file) return false;
    if (checking) return true;

    // Worked out now, before the extra-text box opens and takes the focus
    const target: Target = { file, heading: this.headingUnderCursor(file) };

    if (askForText) {
      new QuickAddModal(this.app, (text) => void this.send([target], text)).open();
    } else {
      void this.send([target]);
    }
    return true;
  }

  /** The nearest heading at or above the cursor (editing) or the top of the screen (reading). */
  private headingUnderCursor(file: TFile): string | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) return null;

    const cached = this.app.metadataCache.getFileCache(file)?.headings ?? [];
    const headings: HeadingInfo[] = cached.map((entry) => ({
      heading: entry.heading,
      line: entry.position.start.line,
    }));

    const line =
      view.getMode() === 'preview' ? Math.floor(view.previewMode.getScroll()) : view.editor.getCursor().line;
    return headingAtLine(headings, line);
  }

  private async send(targets: Target[], prefix?: string): Promise<void> {
    const sendKey = JSON.stringify([targets.map((target) => target.file.path), prefix ?? '']);
    const now = Date.now();
    const last = this.recentSends.get(sendKey);
    if (last !== undefined && now - last < REPEAT_GUARD_MS) return;
    this.recentSends.set(sendKey, now);

    const apiKey = readApiKey(this.settings, this.app.secretStorage);
    if (!apiKey) {
      new Notice('Please add your Godspeed API key in the plugin settings', 5000);
      return;
    }

    const vaultName = this.app.vault.getName();
    const results: SendResult[] = [];

    for (const { file, heading } of targets) {
      const name = displayName(file.path);
      try {
        const body = buildTask(
          { vaultName, path: file.path, heading },
          { prefix, target: this.settings.quickAddTarget, listId: this.settings.listId }
        );
        await createTask(requestGodspeed, apiKey, body);
        results.push({ name });
      } catch (error) {
        results.push({ name, error: error instanceof Error ? error : new Error(String(error)) });
      }
    }

    for (const report of summarizeResults(results)) {
      new Notice(report.message, report.duration);
    }
  }
}

/** Obsidian's own HTTP call: no CORS, works on mobile. Errors come back as a status, not a throw. */
async function requestGodspeed(request: HttpRequest): Promise<HttpResponse> {
  // One line per request, so it is easy to see in the developer console exactly when this plugin connects.
  // The body is not logged (it has the note's link) and neither is the key.
  console.debug(`[godspeed-quick-add] POST ${request.url}`);
  const response = await requestUrl({
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: request.body,
    contentType: 'application/json',
    throw: false,
  });
  return { status: response.status, text: response.text };
}
