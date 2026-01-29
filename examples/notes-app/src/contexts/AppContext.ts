import { Hydra, HydraContext, service, mediator, htmlElementDescriptor, dataAttributes } from '@mikeseghers/hydra';
import { NoteService } from '../services/NoteService';
import { NotificationMediator } from '../mediators/NotificationMediator';
import { AppStateMediator } from '../mediators/AppStateMediator';
import { StatusMediator } from '../mediators/StatusMediator';
import { NotesPage } from '../pages/NotesPage';

/**
 * AppContext - Application-wide Hydra context.
 *
 * This context demonstrates BOTH approaches for element binding:
 *
 * 1. TRADITIONAL APPROACH (htmlElementDescriptor):
 *    - Define element descriptors with CSS selectors
 *    - More explicit, works with any DOM structure
 *    - Example: NotificationMediator below
 *
 * 2. DATA ATTRIBUTES APPROACH (dataAttributes):
 *    - Elements discovered via data-hydra-element attributes in DOM
 *    - Self-documenting HTML, less boilerplate in context
 *    - Example: StatusMediator below
 */

// ============================================================
// TRADITIONAL APPROACH: Element descriptors with CSS selectors
// ============================================================
const notificationMediatorElements = {
  container: htmlElementDescriptor('#notifications', HTMLDivElement)
};

export const AppContext: HydraContext = {
  register(hydra: Hydra): void {
    // Register services
    hydra.registerService(NoteService);

    // --------------------------------------------------------
    // TRADITIONAL: Using htmlElementDescriptor with CSS selectors
    // The context defines WHERE to find elements (#notifications)
    // --------------------------------------------------------
    hydra.registerMediator(NotificationMediator, [notificationMediatorElements]);

    // --------------------------------------------------------
    // DATA ATTRIBUTES: Using dataAttributes() marker
    // Elements are discovered from DOM via data-hydra-element
    // HTML must have: data-hydra-mediator="StatusMediator"
    // --------------------------------------------------------
    hydra.registerMediator(StatusMediator, [dataAttributes()]);

    // AppStateMediator has no DOM elements
    hydra.registerMediator(AppStateMediator, [{}]);

    // Register page controllers
    hydra.registerPageController(NotesPage, [
      service(NoteService),
      mediator(NotificationMediator),
      mediator(StatusMediator),
      mediator(AppStateMediator)
    ]);
  }
};
