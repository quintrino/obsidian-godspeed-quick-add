import { Modal } from 'obsidian';
import type { App } from 'obsidian';

/** How long after an IME composition ends that Enter still counts as part of it. */
const COMPOSITION_GRACE_MS = 50;

/** A one-line box for the extra text: Enter saves, Esc cancels, Enter on an empty box does nothing. */
export class QuickAddModal extends Modal {
  private readonly onSubmit: (text: string) => void;

  constructor(app: App, onSubmit: (text: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    this.titleEl.setText('Add to Godspeed');

    const input = this.contentEl.createEl('input', {
      type: 'text',
      cls: 'godspeed-quick-add-input',
      attr: { placeholder: 'Extra text. Enter to save, Esc to cancel', autocomplete: 'off' },
    });

    // Enter that confirms an IME composition (Japanese, Chinese...) is not a submit. WebKit, which Obsidian
    // mobile on iOS uses, sends that keydown just after compositionend with isComposing already false,
    // so a short grace period after the composition ends is treated as still composing.
    let composing = false;
    let compositionEndedAt = 0;
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('compositionend', () => {
      composing = false;
      compositionEndedAt = Date.now();
    });

    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.isComposing || composing || Date.now() - compositionEndedAt < COMPOSITION_GRACE_MS) return;
      if (event.key !== 'Enter') return;

      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      // Close first so the box never lingers while the request is on its way
      this.close();
      this.onSubmit(text);
    });

    window.setTimeout(() => input.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
