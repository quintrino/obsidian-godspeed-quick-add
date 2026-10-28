// The shipped bundle: what Obsidian loads is main.js, a CommonJS file with the plugin class as its default export.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

test('the production bundle is a CommonJS plugin that leaves `obsidian` external', async () => {
  const result = await build({
    entryPoints: [new URL('../src/main.ts', import.meta.url).pathname],
    bundle: true,
    format: 'cjs',
    target: 'es2020',
    external: ['obsidian', 'electron'],
    write: false,
    minify: true,
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;

  class FakePlugin {}
  const stub = {
    Plugin: FakePlugin, Notice: class {}, Modal: class {}, PluginSettingTab: class {},
    Setting: class {}, SecretComponent: class {}, MarkdownView: class {}, TFile: class {}, requestUrl() {},
  };
  const module = { exports: {} as any };
  new Function('module', 'exports', 'require', code)(module, module.exports, (name: string) => {
    assert.equal(name, 'obsidian', `the bundle must not require anything but obsidian (asked for ${name})`);
    return stub;
  });

  assert.equal(typeof module.exports.default, 'function');
  assert.equal(Object.getPrototypeOf(module.exports.default), FakePlugin);
});
