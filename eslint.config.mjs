// The same checks Obsidian's directory review runs (https://github.com/obsidianmd/eslint-plugin).
import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['main.js', 'node_modules/**', 'test/**', '*.mjs'] },
  ...obsidianmd.configs.recommended,
  {
    rules: {
      // "Godspeed" is a product name, and API, ID, Esc and Enter keep their capitals
      'obsidianmd/ui/sentence-case': [
        'warn',
        { brands: ['Godspeed'], acronyms: ['API', 'ID'], ignoreWords: ['Esc', 'Enter'] },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.*'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
