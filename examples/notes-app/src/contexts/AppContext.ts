import { Hydra, HydraContext, service, pagePart, htmlElementDescriptor } from '@mikeseghers/hydra';
import { NoteService } from '../services/NoteService';
import { NotificationPart } from '../pageparts/NotificationPart';
import { AppStatePart } from '../pageparts/AppStatePart';
import { NotesPage } from '../pages/NotesPage';

/**
 * Element descriptors for NotificationPart.
 * Hydra resolves these to actual elements and passes them to the constructor.
 */
const notificationPartElements = {
  container: htmlElementDescriptor('#notifications', HTMLDivElement)
};

/**
 * Element descriptors for AppStatePart (empty - no DOM elements needed).
 */
const appStatePartElements = {};

/**
 * AppContext - Application-wide Hydra context.
 *
 * This context demonstrates the recommended pattern for organizing
 * Hydra registrations. All services, page parts, and page entries
 * are registered here, with their dependencies declared.
 *
 * The context is registered during application bootstrap, and Hydra
 * handles instantiation and dependency injection automatically.
 */
export const AppContext: HydraContext = {
  register(hydra: Hydra): void {
    // Register services
    // Services are singletons that provide shared functionality
    hydra.registerService(NoteService);

    // Register page parts
    // PageParts are event-capable components for cross-cutting concerns
    hydra.registerPagePart(NotificationPart, [notificationPartElements]);
    hydra.registerPagePart(AppStatePart, [appStatePartElements]);

    // Register page entries
    // PageEntries are top-level page controllers
    hydra.registerPageEntry(NotesPage, [
      service(NoteService),
      pagePart(NotificationPart),
      pagePart(AppStatePart)
    ]);
  }
};
