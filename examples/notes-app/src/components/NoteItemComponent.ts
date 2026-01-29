import { AbstractComponent, htmlElementDescriptor, PageElementFromContainerType } from '@mikeseghers/hydra';
import { Note } from '../model/Note';

/**
 * Element descriptors for the note item component.
 * These map to elements within the note-item-template.
 */
export const noteItemDescriptors = {
  title: htmlElementDescriptor('.note-item-title', HTMLDivElement),
  preview: htmlElementDescriptor('.note-item-preview', HTMLDivElement),
  date: htmlElementDescriptor('.note-item-date', HTMLDivElement)
};

export type NoteItemElements = PageElementFromContainerType<typeof noteItemDescriptors>;

/**
 * NoteItemComponent - Represents a single note in the notes list.
 *
 * This component demonstrates:
 * - Template-based component creation
 * - Click handling with callback to parent
 * - Dynamic content updates
 * - Selected state management
 */
export class NoteItemComponent extends AbstractComponent<HTMLLIElement, typeof noteItemDescriptors> {
  private onClickCallback?: (note: Note) => void;

  constructor(
    rootElement: HTMLLIElement,
    elements: NoteItemElements,
    public note: Note,
    onClick?: (note: Note) => void
  ) {
    super(rootElement, elements);
    this.onClickCallback = onClick;

    this.render();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.rootElement.addEventListener('click', () => {
      this.onClickCallback?.(this.note);
    });
  }

  /**
   * Render the note data into the component elements.
   */
  private render(): void {
    this.elements.title.textContent = this.note.title || 'Untitled';
    this.elements.preview.textContent = this.getPreview();
    this.elements.date.textContent = this.formatDate(this.note.updatedAt);
  }

  /**
   * Update the note data and re-render.
   */
  updateNote(note: Note): void {
    this.note = note;
    this.render();
  }

  /**
   * Set the selected visual state.
   */
  setSelected(selected: boolean): void {
    this.rootElement.classList.toggle('selected', selected);
  }

  /**
   * Get a preview of the note content (first 50 chars).
   */
  private getPreview(): string {
    if (!this.note.content) {
      return 'No content';
    }
    const preview = this.note.content.substring(0, 50);
    return this.note.content.length > 50 ? preview + '...' : preview;
  }

  /**
   * Format a date for display.
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  destroy(): void {
    // Cleanup if needed
  }
}
