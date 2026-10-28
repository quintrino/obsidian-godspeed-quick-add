import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
const manifest = read('manifest.json');
const pkg = read('package.json');
const versions = read('versions.json');

const parts = (v: string) => v.split('.').map(Number);
const atLeast = (v: string, min: string) => {
  const [a, b] = [parts(v), parts(min)];
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};

test('manifest has what Obsidian requires', () => {
  for (const field of ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'isDesktopOnly']) {
    assert.ok(field in manifest, `missing ${field}`);
  }
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.isDesktopOnly, false);
});

test('the id and name do not mention obsidian (the community directory rejects that)', () => {
  assert.doesNotMatch(manifest.id, /obsidian/i);
  assert.doesNotMatch(manifest.name, /obsidian/i);
  assert.match(manifest.id, /^[a-z0-9-]+$/);
});

test('secret storage needs Obsidian 1.11.4', () => {
  assert.ok(atLeast(manifest.minAppVersion, '1.11.4'), manifest.minAppVersion);
});

test('manifest, package and versions.json agree', () => {
  assert.equal(pkg.version, manifest.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});
