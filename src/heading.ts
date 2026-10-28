// Finding the heading the cursor is under. Pure: nothing here imports Obsidian.

export interface HeadingInfo {
  /** The heading's text, as Obsidian's metadata cache reports it. */
  heading: string;
  /** Zero-based line the heading is on. */
  line: number;
}

/**
 * Cleans heading text the way Obsidian does when it builds a link to a heading: the characters
 * `#`, `|`, `^`, `:` and `%%` and the brackets of `[[ ]]` are dropped, and whitespace is collapsed.
 */
export function cleanHeading(text: string): string {
  return text
    .replace(/%%/g, '')
    .replace(/\[\[|\]\]/g, '')
    .replace(/[#|^:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The text of the nearest heading at or above [line], or null when the line is above the first
 * heading (or the note has none). Only that one heading is returned, not its parents.
 */
export function headingAtLine(headings: HeadingInfo[], line: number): string | null {
  let found: HeadingInfo | null = null;
  for (const heading of headings) {
    if (heading.line <= line && (found === null || heading.line >= found.line)) {
      found = heading;
    }
  }
  if (found === null) return null;
  const cleaned = cleanHeading(found.heading);
  return cleaned === '' ? null : cleaned;
}
