import { Hydra } from '@mikeseghers/hydra';
import { AppContext } from './contexts/AppContext';

/**
 * Notes App - Hydra Framework Example
 *
 * This example demonstrates how to build a complete application using Hydra:
 *
 * 1. Services (NoteService)
 *    - Singleton services for business logic and data management
 *    - Injected into Mediators and PageControllers
 *
 * 2. Mediators (NotificationMediator, AppStateMediator)
 *    - Event-capable components for cross-cutting concerns
 *    - Enable loose coupling through event-based communication
 *
 * 3. Components (NoteListComponent, NoteEditorComponent, NoteItemComponent)
 *    - UI components with DOM bindings
 *    - Support subcomponent hierarchies
 *
 * 4. PageController (NotesPage)
 *    - Top-level page controller
 *    - Coordinates components and handles user actions
 *
 * 5. Context (AppContext)
 *    - Organizes all registrations in one place
 *    - Declares dependencies for each registered type
 *
 * Bootstrap Flow:
 * 1. Register the AppContext with Hydra
 * 2. Hydra hooks into window.onload
 * 3. On page load, Hydra:
 *    a. Instantiates all services
 *    b. Instantiates all Mediators
 *    c. Instantiates all PageControllers (with injected dependencies)
 *    d. Calls load() on each in order
 */

// Register the application context
// This tells Hydra about all our services, mediators, and page controllers
Hydra.registerContext(AppContext);

// Hydra.getInstance() sets up the window.onload handler
// When the page loads, Hydra will bootstrap the application
Hydra.getInstance();

console.log('Notes App: Hydra context registered, waiting for page load...');
