// The plugin's settings. Pure: nothing here imports Obsidian.
//
// The API key itself is never part of the settings. They hold only the *name* of a secret in
// Obsidian's secret storage, and the key is read from there when a task is sent.

import type { LinkTarget, QuickAddTarget } from './task.ts';

export interface GodspeedSettings {
  /** Name of the secret that holds the Godspeed API key; empty until the user picks one. */
  apiKeySecretId: string;
  /** Optional Godspeed list to send tasks to; blank means the Inbox. */
  listId: string;
  /** Where text typed in the quick-add box goes. */
  quickAddTarget: QuickAddTarget;
  /** Where the note's Obsidian link goes. */
  linkTarget: LinkTarget;
}

export const DEFAULT_SETTINGS: GodspeedSettings = {
  apiKeySecretId: 'godspeed-api-key',
  listId: '',
  quickAddTarget: 'title',
  linkTarget: 'title',
};

/** Saved data of any shape in, valid settings out. Anything other than `notes` means `title`, for both targets. */
export function normalizeSettings(raw: unknown): GodspeedSettings {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    apiKeySecretId: typeof data.apiKeySecretId === 'string' ? data.apiKeySecretId : DEFAULT_SETTINGS.apiKeySecretId,
    listId: typeof data.listId === 'string' ? data.listId : DEFAULT_SETTINGS.listId,
    quickAddTarget: data.quickAddTarget === 'notes' ? 'notes' : 'title',
    linkTarget: data.linkTarget === 'notes' ? 'notes' : 'title',
  };
}

/** The part of Obsidian's SecretStorage the plugin needs. */
export interface SecretReader {
  getSecret(id: string): string | null;
}

/** The saved API key, or null when no secret is chosen or it is empty. */
export function readApiKey(settings: GodspeedSettings, storage: SecretReader): string | null {
  if (!settings.apiKeySecretId) return null;
  const key = storage.getSecret(settings.apiKeySecretId)?.trim();
  return key ? key : null;
}
