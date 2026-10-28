import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SETTINGS, normalizeSettings, readApiKey } from '../src/settings.ts';

function secrets(values: Record<string, string>) {
  return { getSecret: (id: string) => (id in values ? values[id] : null) };
}

test('missing or garbage saved data gives the defaults', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings('nonsense'), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ listId: 5, quickAddTarget: 7, apiKeySecretId: false }), DEFAULT_SETTINGS);
});

test('any extra-text target other than "notes" means the title', () => {
  assert.equal(normalizeSettings({ quickAddTarget: 'notes' }).quickAddTarget, 'notes');
  assert.equal(normalizeSettings({ quickAddTarget: 'title' }).quickAddTarget, 'title');
  assert.equal(normalizeSettings({ quickAddTarget: 'elsewhere' }).quickAddTarget, 'title');
});

test('saved values are kept', () => {
  assert.deepEqual(normalizeSettings({ apiKeySecretId: 'my-key', listId: 'l9', quickAddTarget: 'notes' }), {
    apiKeySecretId: 'my-key',
    listId: 'l9',
    quickAddTarget: 'notes',
  });
});

test('settings never carry the key itself', () => {
  const settings = normalizeSettings({ apiKeySecretId: 'k', apiKey: 'sk-live-123' });
  assert.equal(JSON.stringify(settings).includes('sk-live-123'), false);
  assert.deepEqual(Object.keys(settings).sort(), ['apiKeySecretId', 'listId', 'quickAddTarget']);
});

test('the key is read from secret storage by name', () => {
  const settings = { ...DEFAULT_SETTINGS, apiKeySecretId: 'godspeed-key' };
  assert.equal(readApiKey(settings, secrets({ 'godspeed-key': '  abc123 ' })), 'abc123');
});

test('no secret chosen, a missing secret, or an empty one all mean no key', () => {
  assert.equal(readApiKey({ ...DEFAULT_SETTINGS, apiKeySecretId: '' }, secrets({ '': 'x' })), null);
  assert.equal(readApiKey(DEFAULT_SETTINGS, secrets({})), null);
  assert.equal(readApiKey(DEFAULT_SETTINGS, secrets({ 'godspeed-api-key': '   ' })), null);
});
