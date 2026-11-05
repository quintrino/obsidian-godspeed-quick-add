// Turning a note into the body of a Godspeed task. Pure: nothing here imports Obsidian.

import { cleanHeading } from './heading.ts';
import { buildObsidianUrl, displayName } from './link.ts';

export type QuickAddTarget = 'title' | 'notes';
export type LinkTarget = 'title' | 'notes';

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
  /** Where the Obsidian link goes: in the title (default) or alone in the notes. */
  linkTarget?: LinkTarget;
  listId?: string;
}

/** The note's name, with ` > <heading>` when the cursor was under one. */
function buildName(note: NoteRef): string {
  const heading = note.heading ? cleanHeading(note.heading) : '';
  return `${displayName(note.path)}${heading ? ` > ${heading}` : ''}`;
}

/** The note's `obsidian://` link, to the heading when there is one. */
function buildLink(note: NoteRef): string {
  const heading = note.heading ? cleanHeading(note.heading) : '';
  return buildObsidianUrl(note.vaultName, note.path, heading || null);
}

/** `title: <file name>[ > <heading>] link: <obsidian url>` */
export function buildTitle(note: NoteRef): string {
  return `title: ${buildName(note)} link: ${buildLink(note)}`;
}

/**
 * The task for a note. Extra text goes at the front of the title, or into the notes when the
 * user chose that. The link goes in the title, or when the user chose that, in the notes under
 * any extra text, leaving the title as just the name. `list_id` is only sent when it is not blank.
 */
export function buildTask(note: NoteRef, options: TaskOptions = {}): TaskBody {
  const prefix = (options.prefix ?? '').trim();
  const prefixToNotes = options.target === 'notes';
  const linkToNotes = options.linkTarget === 'notes';
  const front = prefix && !prefixToNotes ? `${prefix} ` : '';
  const body: TaskBody = {
    title: `${front}${linkToNotes ? buildName(note) : buildTitle(note)}`,
  };

  const notes = [prefix && prefixToNotes ? prefix : '', linkToNotes ? buildLink(note) : ''].filter(Boolean);
  if (notes.length > 0) {
    body.notes = notes.join('\n\n');
  }

  const listId = (options.listId ?? '').trim();
  if (listId) {
    body.list_id = listId;
  }
  return body;
}
