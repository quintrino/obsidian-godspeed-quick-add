import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildObsidianUrl, displayName } from '../src/link.ts';

test('the requested example: a folder path becomes File%2FName', () => {
  assert.equal(
    buildObsidianUrl('VaultName', 'File/Name.md'),
    'obsidian://open?vault=VaultName&file=File%2FName'
  );
});

test('spaces become %20, as in Obsidian\'s own copied links', () => {
  assert.equal(
    buildObsidianUrl('My Vault', 'Work/Meeting notes.md'),
    'obsidian://open?vault=My%20Vault&file=Work%2FMeeting%20notes'
  );
});

test('characters that would break a URL are encoded', () => {
  const url = buildObsidianUrl('A&B #1', 'Q&A/100% + more #draft.md');
  assert.equal(url, 'obsidian://open?vault=A%26B%20%231&file=Q%26A%2F100%25%20%2B%20more%20%23draft');
  const params = new URL(url).searchParams;
  assert.equal(params.get('vault'), 'A&B #1');
  assert.equal(params.get('file'), 'Q&A/100% + more #draft');
});

test('non-ASCII names are encoded and survive a round trip', () => {
  const url = buildObsidianUrl('Cafe', 'Notes/日本語 ノート.md');
  assert.equal(new URL(url).searchParams.get('file'), 'Notes/日本語 ノート');
});

test('a heading makes the link open at that section', () => {
  const url = buildObsidianUrl('My Vault', 'Law/Constitution.md', 'Section 3');
  assert.equal(url, 'obsidian://open?vault=My%20Vault&file=Law%2FConstitution%23Section%203');
  assert.equal(new URL(url).searchParams.get('file'), 'Law/Constitution#Section 3');
});

test('only a trailing .md is dropped; other file types keep their extension', () => {
  assert.equal(buildObsidianUrl('V', 'a.md.md'), 'obsidian://open?vault=V&file=a.md');
  assert.equal(buildObsidianUrl('V', 'Board.canvas'), 'obsidian://open?vault=V&file=Board.canvas');
  assert.equal(buildObsidianUrl('V', 'scan.PDF'), 'obsidian://open?vault=V&file=scan.PDF');
  assert.equal(buildObsidianUrl('V', 'Upper.MD'), 'obsidian://open?vault=V&file=Upper');
});

test('display names are the last path part without .md', () => {
  assert.equal(displayName('Law/Constitution.md'), 'Constitution');
  assert.equal(displayName('Top.md'), 'Top');
  assert.equal(displayName('Board.canvas'), 'Board.canvas');
});
