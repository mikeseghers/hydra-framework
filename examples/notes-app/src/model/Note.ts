/**
 * Note model representing a single note in the application.
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a new note with default values.
 */
export function createNote(title: string = 'Untitled', content: string = ''): Note {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: now,
    updatedAt: now
  };
}
