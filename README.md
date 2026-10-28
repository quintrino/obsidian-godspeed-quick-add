# Godspeed Quick Add for Obsidian

Send the note you are looking at to [Godspeed](https://godspeedapp.com) as a task that links back
to it. It is the Obsidian version of the Godspeed browser extension and works the same way: one
command sends the note as it is, another lets you type some extra text first.

## What it creates

```
title: Constitution > Section 3 link: obsidian://open?vault=My%20Vault&file=Law%2FConstitution%23Section%203
```

- `Constitution` is the note's file name.
- `> Section 3` is the heading your cursor is under (the nearest heading above it, only that one). With
  the cursor above the first heading, or in a note with no headings, it is just the file name.
- The link opens the note in the right vault, at that heading when there is one.

In **reading view** the heading nearest the top of the screen is used. Sending from the file explorer
(right-click) uses the file name only.

## What you need

A Godspeed account and its API key. The plugin does nothing without one. It makes no payments and
shows no ads.

## Install

Needs **Obsidian 1.11.4 or newer** (the API key is kept in Obsidian's secret storage).

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Put them in `<your vault>/.obsidian/plugins/godspeed-quick-add/`.
3. In Obsidian, open Settings > Community plugins, reload the list and enable **Godspeed Quick Add**.

## Set up

Open Settings > Godspeed Quick Add.

1. **Godspeed API key**: choose or create a secret that holds your key. In Godspeed, run the
   command-palette command "Copy API access token". The key is stored in Obsidian's secret
   storage, not in your vault, so it does not travel with a synced or git-tracked vault.
2. **List ID** (optional): leave blank for your Inbox. In Godspeed, run "Copy list ID" on a list.
3. **Extra text goes in**: the task title (at the front, the default) or the task notes.

## Use

| Command | What it does |
| --- | --- |
| **Send note to Godspeed** | Creates the task straight away |
| **Send note to Godspeed with extra text** | Opens a box. Type, press Enter to save, Esc to cancel. Enter on an empty box does nothing |

Both also work from reading view, and are only offered while a note is open. There is a ribbon icon
for the first one too.

**Right-click** a note in the file explorer, or select several and right-click, and choose
*Send to Godspeed*. Each file becomes its own task.

### Keyboard shortcuts

The plugin does not claim any keys itself, so it cannot clash with another plugin. Bind them once in
Settings > Hotkeys: search for "Godspeed". To match the browser extension use `Cmd/Ctrl+Shift+Y` for
*Send note to Godspeed* and `Cmd/Ctrl+Shift+U` for *Send note to Godspeed with extra text*. They act
on the current note.

With extra text going to the title:

```
Call about this title: Constitution > Section 3 link: obsidian://...
```

With extra text going to the notes, the title keeps the usual format and the notes hold
`Call about this`.

## Notices

- Success: shown for 3 seconds.
- Failure: shown for 10 seconds with the reason, taken from the Godspeed API's own message when it gives one.
- Several files: a count of what was sent, plus one message for each that failed.

## Privacy and network use

The plugin talks to one place only: `https://api.godspeedapp.com/tasks`. It does so only when you run
one of its commands, and it sends the task title (the note's file name, the heading, the link and any
extra text you typed), the optional notes and list ID, and your API key as the authorisation header. It
reads no other notes' contents. Nothing is sent in the background, and there is no analytics or
telemetry.

## Good to know

- The link uses the vault's name. Renaming the vault or moving a note breaks links in tasks you already sent.
- Sending the same note twice makes two tasks.
- Holding a hotkey down does not send repeatedly: the same send arriving again within 2 seconds is ignored.
- The plugin makes no network request unless you run one of its commands or use the right-click menu.
- The link is `obsidian://open?vault=...&file=...`, with every part URL-encoded and `.md` left off.

## Troubleshooting

**Checking when the plugin connects**: it only contacts `api.godspeedapp.com` when you run one of its
commands. Each request writes one line, `[godspeed-quick-add] POST https://api.godspeedapp.com/tasks`, to
Obsidian's developer console (`Cmd+Option+I`, or `Ctrl+Shift+I`; set the log level to include Verbose).
To see which plugin is behind traffic to Godspeed, search the plugin folders for the host name:
`grep -l godspeedapp "<your vault>/.obsidian/plugins"/*/main.js`.

**"Please add your Godspeed API key in the plugin settings"**: no secret is chosen, or the chosen
secret is empty. Open the plugin's settings and pick or create one that holds the key.

**"Failed to send ...: HTTP 401" or a message from Godspeed**: the key is wrong or has been reset.
Copy a fresh one from Godspeed and update the secret.

**The commands are missing from the command palette**: they only appear while a note is open.

## Development

```
npm install
npm test          # unit tests plus the plugin run against a stub of Obsidian's API
npm run build     # type-check and produce main.js
npm run lint      # the same checks the Obsidian directory review runs
npm run dev       # rebuild on change
```

To try a build, copy `main.js`, `manifest.json` and `styles.css` into
`<vault>/.obsidian/plugins/godspeed-quick-add/`, or symlink the folder.

`src/heading.ts`, `link.ts`, `task.ts`, `godspeed.ts` and `settings.ts` do not import Obsidian, so they
are tested directly. `main.ts` wires them to Obsidian; `test/plugin.test.ts` runs it against a stub.

**Releasing:** every push to `master` that passes the checks publishes a GitHub release. The GitHub workflow bumps
the patch version, commits it back and tags it. For a `minor` or `major` release, run `npm version minor` (or `major`)
and commit before pushing.
