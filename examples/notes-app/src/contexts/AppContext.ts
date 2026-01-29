import { Hydra, HydraContext, service, pagePart, htmlElementDescriptor, dataAttributes } from '@mikeseghers/hydra';
import { NoteService } from '../services/NoteService';
import { NotificationPart } from '../pageparts/NotificationPart';
import { AppStatePart } from '../pageparts/AppStatePart';
import { StatusPart } from '../pageparts/StatusPart';
import { NotesPage } from '../pages/NotesPage';

/**
 * AppContext - Application-wide Hydra context.
 *
 * This context demonstrates BOTH approaches for element binding:
 *
 * 1. TRADITIONAL APPROACH (htmlElementDescriptor):
 *    - Define element descriptors with CSS selectors
 *    - More explicit, works with any DOM structure
 *    - Example: NotificationPart below
 *
 * 2. DATA ATTRIBUTES APPROACH (dataAttributes):
 *    - Elements discovered via data-hydra-element attributes in DOM
 *    - Self-documenting HTML, less boilerplate in context
 *    - Example: StatusPart below
 */

// ============================================================
// TRADITIONAL APPROACH: Element descriptors with CSS selectors
// ============================================================
const notificationPartElements = {
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
    hydra.registerPagePart(NotificationPart, [notificationPartElements]);

    // --------------------------------------------------------
    // DATA ATTRIBUTES: Using dataAttributes() marker
    // Elements are discovered from DOM via data-hydra-element
    // HTML must have: data-hydra-pagepart="StatusPart"
    // --------------------------------------------------------
    hydra.registerPagePart(StatusPart, [dataAttributes()]);

    // AppStatePart has no DOM elements
    hydra.registerPagePart(AppStatePart, [{}]);

    // Register page entries
    hydra.registerPageEntry(NotesPage, [
      service(NoteService),
      pagePart(NotificationPart),
      pagePart(StatusPart),
      pagePart(AppStatePart)
    ]);
  }
};
