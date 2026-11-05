import { PluginSettingTab, SecretComponent, Setting } from 'obsidian';
import type { App } from 'obsidian';
import type GodspeedQuickAddPlugin from './main.ts';

export class GodspeedSettingTab extends PluginSettingTab {
  private readonly plugin: GodspeedQuickAddPlugin;

  constructor(app: App, plugin: GodspeedQuickAddPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Godspeed API key')
      .setDesc(
        'Stored in Obsidian\'s secret storage, not in your vault. Choose an existing secret or create one. ' +
          'Copy the key from Godspeed\'s command palette: "Copy API access token".'
      )
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.apiKeySecretId)
          .onChange(async (secretId) => {
            this.plugin.settings.apiKeySecretId = secretId ?? '';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('List ID')
      .setDesc('Leave blank to send tasks to your inbox. To find a list\'s ID, use the copy list ID command on it in Godspeed.')
      .addText((text) =>
        text
          .setPlaceholder('Inbox')
          .setValue(this.plugin.settings.listId)
          .onChange(async (value) => {
            this.plugin.settings.listId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Obsidian link goes in')
      .setDesc('Where the link back to the note is saved. In the notes, the title is just the note\'s name.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('title', 'Task title')
          .addOption('notes', 'Task notes')
          .setValue(this.plugin.settings.linkTarget)
          .onChange(async (value) => {
            this.plugin.settings.linkTarget = value === 'notes' ? 'notes' : 'title';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Extra text goes in')
      .setDesc('Where the text you type in the extra text command is saved.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('title', 'Task title (at the front)')
          .addOption('notes', 'Task notes')
          .setValue(this.plugin.settings.quickAddTarget)
          .onChange(async (value) => {
            this.plugin.settings.quickAddTarget = value === 'notes' ? 'notes' : 'title';
            await this.plugin.saveSettings();
          })
      );
  }
}
