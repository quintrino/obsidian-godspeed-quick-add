// Building obsidian:// links and note names. Pure: nothing here imports Obsidian.

/** A note's name for display: the last part of its path, without a trailing `.md`. */
export function displayName(path: string): string {
  const last = path.split('/').pop() ?? path;
  return last.replace(/\.md$/i, '');
}

/**
 * `obsidian://open?vault=<vault>&file=<path>[#heading]`, every part percent-encoded.
 * A trailing `.md` is dropped from the path, as Obsidian's own "Copy Obsidian URL" does; other
 * file types keep their extension. A heading makes the link open the note at that section.
 */
export function buildObsidianUrl(vaultName: string, path: string, heading?: string | null): string {
  const file = path.replace(/\.md$/i, '') + (heading ? `#${heading}` : '');
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`;
}
