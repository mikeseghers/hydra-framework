import { AbstractMediator } from '@mikeseghers/hydra';
import { Note } from '../model/Note';

/**
 * Events emitted by the AppStateMediator.
 *
 * Components subscribe to these events to react to state changes,
 * enabling loose coupling between UI components.
 */
export interface AppStateEvents {
  noteSelected: Note | null;
  notesChanged: Note[];
  noteCreated: Note;
  noteUpdated: Note;
  noteDeleted: string;
}

/**
 * Elements interface for AppStateMediator (empty - no DOM elements needed).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Elements {}

/**
 * AppStateMediator - Central state management for the notes application.
 *
 * This PageMediator demonstrates:
 * - Centralized state management pattern
 * - Event-based state change notifications
 * - Decoupled component communication
 *
 * Components don't communicate directly with each other. Instead,
 * they emit events through AppStateMediator, and other components
 * react to those events.
 */
export class AppStateMediator extends AbstractMediator<AppStateEvents> {
  #selectedNote: Note | null = null;
  #notes: Note[] = [];

  constructor(_pageElements: Elements) {
    super();
  }

  load(): void {
    // AppStateMediator is ready
  }

  /**
   * Get the currently selected note.
   */
  getSelectedNote(): Note | null {
    return this.#selectedNote;
  }

  /**
   * Select a note for editing.
   * Pass null to deselect.
   */
  selectNote(note: Note | null): void {
    this.#selectedNote = note;
    this.emit('noteSelected', note);
  }

  /**
   * Update the notes list and notify listeners.
   */
  setNotes(notes: Note[]): void {
    this.#notes = notes;
    this.emit('notesChanged', notes);
  }

  /**
   * Get the current notes list.
   */
  getNotes(): Note[] {
    return this.#notes;
  }

  /**
   * Notify that a new note was created.
   */
  notifyNoteCreated(note: Note): void {
    this.emit('noteCreated', note);
  }

  /**
   * Notify that a note was updated.
   */
  notifyNoteUpdated(note: Note): void {
    this.emit('noteUpdated', note);
    // Update selected note if it's the one being edited
    if (this.#selectedNote?.id === note.id) {
      this.#selectedNote = note;
    }
  }

  /**
   * Notify that a note was deleted.
   */
  notifyNoteDeleted(noteId: string): void {
    this.emit('noteDeleted', noteId);
    // Clear selection if deleted note was selected
    if (this.#selectedNote?.id === noteId) {
      this.selectNote(null);
    }
  }
}
