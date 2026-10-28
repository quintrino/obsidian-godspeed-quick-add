import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanHeading, headingAtLine } from '../src/heading.ts';

const headings = [
  { heading: 'Constitution', line: 2 },
  { heading: 'Part 1', line: 6 },
  { heading: 'Section 3', line: 12 },
  { heading: 'Part 2', line: 30 },
];

test('the nearest heading at or above the line is used, and only that one', () => {
  assert.equal(headingAtLine(headings, 14), 'Section 3');
  assert.equal(headingAtLine(headings, 7), 'Part 1');
  assert.equal(headingAtLine(headings, 500), 'Part 2');
});

test('the heading on the cursor line counts', () => {
  assert.equal(headingAtLine(headings, 12), 'Section 3');
  assert.equal(headingAtLine(headings, 2), 'Constitution');
});

test('above the first heading, or with no headings, there is none', () => {
  assert.equal(headingAtLine(headings, 0), null);
  assert.equal(headingAtLine(headings, 1), null);
  assert.equal(headingAtLine([], 10), null);
});

test('headings do not need to arrive in order', () => {
  assert.equal(headingAtLine([...headings].reverse(), 14), 'Section 3');
});

test('a heading that cleans down to nothing is treated as no heading', () => {
  assert.equal(headingAtLine([{ heading: '##', line: 1 }], 5), null);
});

test('heading text is cleaned the way Obsidian cleans link headings', () => {
  assert.equal(cleanHeading('Section 3'), 'Section 3');
  assert.equal(cleanHeading('A #tag | pipe ^caret: colon'), 'A tag pipe caret colon');
  assert.equal(cleanHeading('See [[Other note]] %%hidden%%'), 'See Other note hidden');
  assert.equal(cleanHeading('  lots   of \t space  '), 'lots of space');
});
