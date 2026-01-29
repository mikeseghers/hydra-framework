import type { PageEntry } from '@mikeseghers/hydra';
import { NoteService } from '../services/NoteService';
import { NotificationPart } from '../pageparts/NotificationPart';
import { StatusPart } from '../pageparts/StatusPart';
import { AppStatePart } from '../pageparts/AppStatePart';
import { NoteListComponent, createNoteListComponent } from '../components/NoteListComponent';
import { NoteEditorComponent, createNoteEditorComponent } from '../components/NoteEditorComponent';

/**
 * NotesPage - Main page controller for the notes application.
 *
 * This PageEntry demonstrates:
 * - Coordinating multiple components
 * - Handling user actions (new, save, delete)
 * - Wiring up event listeners between PageParts and components
 * - Managing application flow
 *
 * The page receives its dependencies through constructor injection:
 * - NoteService: for CRUD operations
 * - NotificationPart: for showing user feedback (TRADITIONAL approach)
 * - StatusPart: for showing app status (DATA ATTRIBUTES approach)
 * - AppStatePart: for managing selection state
 */
export class NotesPage implements PageEntry {
  private noteList!: NoteListComponent;
  private editor!: NoteEditorComponent;

  constructor(
    private noteService: NoteService,
    private notifications: NotificationPart,
    private status: StatusPart,
    private appState: AppStatePart
  ) {}

  async load(): Promise<void> {
    this.initializeComponents();
    this.bindAppStateEvents();
    this.bindHeaderActions();
    this.loadInitialData();
  }

  private initializeComponents(): void {
    // Create note list component with selection callback
    this.noteList = createNoteListComponent((note) => {
      this.appState.selectNote(note);
    });

    // Create editor component with save/delete callbacks
    this.editor = createNoteEditorComponent({
      onSave: (noteId, title, content) => this.handleSave(noteId, title, content),
      onDelete: (noteId) => this.handleDelete(noteId)
    });
  }

  private bindAppStateEvents(): void {
    // When a note is selected, open it in the editor
    this.appState.addListener('noteSelected', (note) => {
      if (note) {
        this.editor.editNote(note);
        this.noteList.setSelectedNote(note.id);
      } else {
        this.editor.clear();
        this.noteList.setSelectedNote(null);
      }
    });

    // When a note is created, add it to the list
    this.appState.addListener('noteCreated', (note) => {
      this.noteList.addNote(note);
    });

    // When a note is updated, refresh it in the list
    this.appState.addListener('noteUpdated', (note) => {
      this.noteList.updateNote(note);
    });

    // When a note is deleted, remove it from the list
    this.appState.addListener('noteDeleted', (noteId) => {
      this.noteList.removeNote(noteId);
    });
  }

  private bindHeaderActions(): void {
    // New note button
    const newNoteBtn = document.getElementById('new-note-btn');
    newNoteBtn?.addEventListener('click', () => {
      this.handleNewNote();
    });
  }

  private loadInitialData(): void {
    const notes = this.noteService.getAllNotes();
    this.appState.setNotes(notes);
    this.noteList.setNotes(notes);

    // Show welcome notification if no notes exist
    if (notes.length === 0) {
      this.notifications.info('Welcome! Create your first note to get started.');
    }
  }

  private handleNewNote(): void {
    // Create a new note
    const note = this.noteService.createNote();

    // Notify state and open in editor
    this.appState.notifyNoteCreated(note);
    this.appState.selectNote(note);
    this.editor.newNote(note);

    this.notifications.success('New note created');
  }

  private handleSave(noteId: string, title: string, content: string): void {
    this.status.setStatus('saving', 'Saving...');

    const updated = this.noteService.updateNote(noteId, { title, content });

    if (updated) {
      this.appState.notifyNoteUpdated(updated);
      this.notifications.success('Note saved');
      this.status.setStatus('ready', 'Saved');
    } else {
      this.notifications.error('Failed to save note');
      this.status.setStatus('error', 'Save failed');
    }
  }

  private handleDelete(noteId: string): void {
    const deleted = this.noteService.deleteNote(noteId);

    if (deleted) {
      this.appState.notifyNoteDeleted(noteId);
      this.notifications.success('Note deleted');
    } else {
      this.notifications.error('Failed to delete note');
    }
  }
}
