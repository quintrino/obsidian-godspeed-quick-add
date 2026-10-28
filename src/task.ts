// Turning a note into the body of a Godspeed task. Pure: nothing here imports Obsidian.

import { cleanHeading } from './heading.ts';
import { buildObsidianUrl, displayName } from './link.ts';

export type QuickAddTarget = 'title' | 'notes';

export interface NoteRef {
  vaultName: string;
  /** Vault-relative path, for example `Law/Constitution.md`. */
  path: string;
  /** The heading the cursor was under, when there is one. */
  heading?: string | null;
}

export interface TaskBody {
  title: string;
  notes?: string;
  list_id?: string;
}

export interface TaskOptions {
  /** Extra text the user typed first (the quick-add command). */
  prefix?: string;
  /** Where the extra text goes. */
  target?: QuickAddTarget;
  listId?: string;
}

/** `title: <file name>[ > <heading>] link: <obsidian url>` */
export function buildTitle(note: NoteRef): string {
  const heading = note.heading ? cleanHeading(note.heading) : '';
  const name = displayName(note.path);
  const url = buildObsidianUrl(note.vaultName, note.path, heading || null);
  return `title: ${name}${heading ? ` > ${heading}` : ''} link: ${url}`;
}

/**
 * The task for a note. Extra text goes at the front of the title, or into the notes when the
 * user chose that; `list_id` is only sent when it is not blank.
 */
export function buildTask(note: NoteRef, options: TaskOptions = {}): TaskBody {
  const prefix = (options.prefix ?? '').trim();
  const toNotes = options.target === 'notes';
  const body: TaskBody = {
    title: `${prefix && !toNotes ? `${prefix} ` : ''}${buildTitle(note)}`,
  };

  if (prefix && toNotes) {
    body.notes = prefix;
  }

  const listId = (options.listId ?? '').trim();
  if (listId) {
    body.list_id = listId;
  }
  return body;
}
