import {
  AbstractComponent,
  htmlElementDescriptor,
  pageElements,
  PageElementFromContainerType
} from '@mikeseghers/hydra';
import { cloneTemplateContent } from '@mikeseghers/hydra';
import { Note } from '../model/Note';
import { NoteItemComponent, noteItemDescriptors } from './NoteItemComponent';

/**
 * Element descriptors for the notes list component.
 */
const noteListDescriptors = {
  list: htmlElementDescriptor('#notes-list', HTMLUListElement),
  count: htmlElementDescriptor('#note-count', HTMLSpanElement),
  emptyState: htmlElementDescriptor('#empty-state', HTMLDivElement)
};

export type NoteListElements = PageElementFromContainerType<typeof noteListDescriptors>;

/**
 * NoteListComponent - Manages the list of notes in the sidebar.
 *
 * This component demonstrates:
 * - SubComponent management (NoteItemComponents)
 * - Template-based child creation
 * - Selection state management
 * - Dynamic list updates
 */
export class NoteListComponent extends AbstractComponent<HTMLElement, typeof noteListDescriptors> {
  private noteItems: Map<string, NoteItemComponent> = new Map();
  private selectedNoteId: string | null = null;
  private onNoteSelect?: (note: Note) => void;

  constructor(
    rootElement: HTMLElement,
    elements: NoteListElements,
    onNoteSelect?: (note: Note) => void
  ) {
    super(rootElement, elements);
    this.onNoteSelect = onNoteSelect;
  }

  /**
   * Set the notes to display in the list.
   */
  setNotes(notes: Note[]): void {
    // Clear existing items
    this.clearList();

    // Create new items
    notes.forEach(note => {
      this.addNoteItem(note);
    });

    this.updateCount(notes.length);
    this.updateEmptyState(notes.length === 0);
  }

  /**
   * Add a single note to the list.
   */
  addNote(note: Note): void {
    this.addNoteItem(note, true);
    this.updateCount(this.noteItems.size);
    this.updateEmptyState(false);
  }

  /**
   * Update a note in the list.
   */
  updateNote(note: Note): void {
    const item = this.noteItems.get(note.id);
    if (item) {
      item.updateNote(note);
    }
  }

  /**
   * Remove a note from the list.
   */
  removeNote(noteId: string): void {
    const item = this.noteItems.get(noteId);
    if (item) {
      this.removeSubComponent(item);
      this.noteItems.delete(noteId);
      this.updateCount(this.noteItems.size);
      this.updateEmptyState(this.noteItems.size === 0);
    }
  }

  /**
   * Set the selected note (updates visual state).
   */
  setSelectedNote(noteId: string | null): void {
    // Deselect previous
    if (this.selectedNoteId) {
      const prevItem = this.noteItems.get(this.selectedNoteId);
      prevItem?.setSelected(false);
    }

    // Select new
    this.selectedNoteId = noteId;
    if (noteId) {
      const newItem = this.noteItems.get(noteId);
      newItem?.setSelected(true);
    }
  }

  private addNoteItem(note: Note, prepend: boolean = false): void {
    // Clone from template
    const { rootElement, templateElements } = cloneTemplateContent(
      'note-item-template',
      HTMLLIElement,
      noteItemDescriptors
    );

    // Create component
    const noteItem = new NoteItemComponent(
      rootElement,
      templateElements,
      note,
      (clickedNote) => this.onNoteSelect?.(clickedNote)
    );

    // Store reference
    this.noteItems.set(note.id, noteItem);

    // Add to DOM
    if (prepend && this.elements.list.firstChild) {
      this.elements.list.insertBefore(rootElement, this.elements.list.firstChild);
    } else {
      this.elements.list.appendChild(rootElement);
    }

    // Update selection state if this note is selected
    if (note.id === this.selectedNoteId) {
      noteItem.setSelected(true);
    }
  }

  private clearList(): void {
    this.noteItems.forEach((item) => {
      this.removeSubComponent(item);
    });
    this.noteItems.clear();
  }

  private updateCount(count: number): void {
    this.elements.count.textContent = `${count} note${count !== 1 ? 's' : ''}`;
  }

  private updateEmptyState(isEmpty: boolean): void {
    this.elements.emptyState.style.display = isEmpty ? 'block' : 'none';
    this.elements.list.style.display = isEmpty ? 'none' : 'block';
  }

  destroy(): void {
    this.clearList();
  }
}

/**
 * Factory function to create a NoteListComponent.
 * Resolves elements from the document.
 */
export function createNoteListComponent(onNoteSelect?: (note: Note) => void): NoteListComponent {
  const rootElement = document.querySelector('.notes-panel') as HTMLElement;
  const elements = pageElements(noteListDescriptors, document);
  return new NoteListComponent(rootElement, elements, onNoteSelect);
}
