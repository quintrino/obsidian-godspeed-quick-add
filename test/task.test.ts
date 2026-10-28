import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTask, buildTitle } from '../src/task.ts';

const note = { vaultName: 'My Vault', path: 'Law/Constitution.md' };
const url = 'obsidian://open?vault=My%20Vault&file=Law%2FConstitution';

test('title is "title: <file name> link: <url>"', () => {
  assert.equal(buildTitle(note), `title: Constitution link: ${url}`);
  assert.deepEqual(buildTask(note), { title: `title: Constitution link: ${url}` });
});

test('a heading goes after the file name and into the link', () => {
  assert.equal(
    buildTitle({ ...note, heading: 'Section 3' }),
    'title: Constitution > Section 3 link: obsidian://open?vault=My%20Vault&file=Law%2FConstitution%23Section%203'
  );
});

test('the heading is cleaned in both the title and the link', () => {
  const title = buildTitle({ ...note, heading: 'See [[Part]] #1' });
  assert.ok(title.startsWith('title: Constitution > See Part 1 link: '), title);
  assert.ok(title.endsWith('%23See%20Part%201'), title);
});

test('an empty or blank heading is the same as none', () => {
  assert.equal(buildTitle({ ...note, heading: '' }), buildTitle(note));
  assert.equal(buildTitle({ ...note, heading: '##' }), buildTitle(note));
  assert.equal(buildTitle({ ...note, heading: null }), buildTitle(note));
});

test('extra text goes at the front of the title by default', () => {
  assert.ok(buildTask({ ...note, heading: 'Section 3' }, { prefix: '  Call about this ' }).title.startsWith('Call about this title: Constitution > Section 3 link: '));
  assert.equal(buildTask(note, { prefix: 'Call', target: 'title' }).title, `Call title: Constitution link: ${url}`);
  assert.equal(buildTask(note, { prefix: 'Call', target: 'title' }).notes, undefined);
});

test('extra text can go into the notes, leaving the title alone', () => {
  assert.deepEqual(buildTask(note, { prefix: ' Call about this ', target: 'notes' }), {
    title: `title: Constitution link: ${url}`,
    notes: 'Call about this',
  });
});

test('blank extra text is ignored', () => {
  assert.deepEqual(buildTask(note, { prefix: '   ' }), buildTask(note));
  assert.deepEqual(buildTask(note, { prefix: '', target: 'notes' }), buildTask(note));
});

test('list_id is only sent when it is not blank, and is trimmed', () => {
  assert.equal('list_id' in buildTask(note, { listId: '' }), false);
  assert.equal('list_id' in buildTask(note, { listId: '   ' }), false);
  assert.equal(buildTask(note, { listId: ' abc-123 ' }).list_id, 'abc-123');
});

test('a non-markdown file keeps its extension in the title', () => {
  const title = buildTitle({ vaultName: 'V', path: 'Boards/Plan.canvas' });
  assert.equal(title, 'title: Plan.canvas link: obsidian://open?vault=V&file=Boards%2FPlan.canvas');
});
