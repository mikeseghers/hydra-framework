import {
  AbstractComponent,
  htmlElementDescriptor,
  pageElements,
  PageElementFromContainerType
} from '@mikeseghers/hydra';
import { Note } from '../model/Note';

/**
 * Element descriptors for the note editor component.
 */
const editorDescriptors = {
  placeholder: htmlElementDescriptor('#editor-placeholder', HTMLDivElement),
  content: htmlElementDescriptor('#editor-content', HTMLDivElement),
  status: htmlElementDescriptor('#editor-status', HTMLSpanElement),
  saveBtn: htmlElementDescriptor('#save-btn', HTMLButtonElement),
  deleteBtn: htmlElementDescriptor('#delete-btn', HTMLButtonElement),
  titleInput: htmlElementDescriptor('#editor-title', HTMLInputElement),
  bodyInput: htmlElementDescriptor('#editor-body', HTMLTextAreaElement)
};

export type EditorElements = PageElementFromContainerType<typeof editorDescriptors>;

/**
 * Callbacks for editor actions.
 */
export interface EditorCallbacks {
  onSave: (noteId: string, title: string, content: string) => void;
  onDelete: (noteId: string) => void;
}

/**
 * NoteEditorComponent - Editor panel for creating and editing notes.
 *
 * This component demonstrates:
 * - Form input handling
 * - Dirty state tracking
 * - Callback-based parent communication
 * - Show/hide state management
 */
export class NoteEditorComponent extends AbstractComponent<HTMLElement, typeof editorDescriptors> {
  private currentNote: Note | null = null;
  private isDirty: boolean = false;
  private callbacks: EditorCallbacks;

  constructor(
    rootElement: HTMLElement,
    elements: EditorElements,
    callbacks: EditorCallbacks
  ) {
    super(rootElement, elements);
    this.callbacks = callbacks;
    this.bindEvents();
  }

  private bindEvents(): void {
    // Save button
    this.elements.saveBtn.addEventListener('click', () => {
      this.save();
    });

    // Delete button
    this.elements.deleteBtn.addEventListener('click', () => {
      if (this.currentNote && confirm('Are you sure you want to delete this note?')) {
        this.callbacks.onDelete(this.currentNote.id);
      }
    });

    // Track dirty state on input changes
    this.elements.titleInput.addEventListener('input', () => {
      this.setDirty(true);
    });

    this.elements.bodyInput.addEventListener('input', () => {
      this.setDirty(true);
    });

    // Keyboard shortcut: Ctrl/Cmd + S to save
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (this.currentNote) {
          this.save();
        }
      }
    });
  }

  /**
   * Open a note for editing.
   */
  editNote(note: Note): void {
    this.currentNote = note;
    this.elements.titleInput.value = note.title;
    this.elements.bodyInput.value = note.content;
    this.setDirty(false);
    this.showEditor();
    this.elements.titleInput.focus();
  }

  /**
   * Open editor for a new note.
   */
  newNote(note: Note): void {
    this.editNote(note);
    this.elements.titleInput.select();
  }

  /**
   * Clear the editor and show placeholder.
   */
  clear(): void {
    this.currentNote = null;
    this.elements.titleInput.value = '';
    this.elements.bodyInput.value = '';
    this.setDirty(false);
    this.hideEditor();
  }

  /**
   * Get the current note being edited.
   */
  getCurrentNote(): Note | null {
    return this.currentNote;
  }

  /**
   * Check if editor has unsaved changes.
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  private save(): void {
    if (!this.currentNote) return;

    const title = this.elements.titleInput.value.trim() || 'Untitled';
    const content = this.elements.bodyInput.value;

    this.callbacks.onSave(this.currentNote.id, title, content);
    this.setDirty(false);
  }

  private setDirty(dirty: boolean): void {
    this.isDirty = dirty;
    this.elements.status.textContent = dirty ? 'Unsaved changes' : 'Saved';
    this.elements.status.style.color = dirty ? '#e67e22' : '#27ae60';
  }

  private showEditor(): void {
    this.elements.placeholder.style.display = 'none';
    this.elements.content.style.display = 'flex';
  }

  private hideEditor(): void {
    this.elements.placeholder.style.display = 'flex';
    this.elements.content.style.display = 'none';
  }

  destroy(): void {
    // Cleanup if needed
  }
}

/**
 * Factory function to create a NoteEditorComponent.
 * Resolves elements from the document.
 */
export function createNoteEditorComponent(callbacks: EditorCallbacks): NoteEditorComponent {
  const rootElement = document.getElementById('editor-panel') as HTMLElement;
  const elements = pageElements(editorDescriptors, document);
  return new NoteEditorComponent(rootElement, elements, callbacks);
}
