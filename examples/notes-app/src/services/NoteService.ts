import { Note, createNote } from '../model/Note';

const STORAGE_KEY = 'hydra-notes-app';

/**
 * NoteService - Manages note persistence and CRUD operations.
 *
 * This service demonstrates how to create a stateful service
 * that can be injected into Mediators and PageControllers.
 *
 * Notes are persisted to localStorage for simplicity.
 */
export class NoteService {
  private notes: Map<string, Note> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get all notes sorted by updated date (newest first).
   */
  getAllNotes(): Note[] {
    return Array.from(this.notes.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get a specific note by ID.
   */
  getNote(id: string): Note | undefined {
    return this.notes.get(id);
  }

  /**
   * Create a new note.
   */
  createNote(title?: string, content?: string): Note {
    const note = createNote(title, content);
    this.notes.set(note.id, note);
    this.saveToStorage();
    return note;
  }

  /**
   * Update an existing note.
   */
  updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): Note | undefined {
    const note = this.notes.get(id);
    if (!note) {
      return undefined;
    }

    const updatedNote: Note = {
      ...note,
      ...updates,
      updatedAt: new Date()
    };

    this.notes.set(id, updatedNote);
    this.saveToStorage();
    return updatedNote;
  }

  /**
   * Delete a note.
   */
  deleteNote(id: string): boolean {
    const deleted = this.notes.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Get the total count of notes.
   */
  getCount(): number {
    return this.notes.size;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Note & { createdAt: string; updatedAt: string }>;
        parsed.forEach(note => {
          this.notes.set(note.id, {
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt)
          });
        });
      }
    } catch (e) {
      console.error('Failed to load notes from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const notesArray = Array.from(this.notes.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notesArray));
    } catch (e) {
      console.error('Failed to save notes to storage:', e);
    }
  }
}
