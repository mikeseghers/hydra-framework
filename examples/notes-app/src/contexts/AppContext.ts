import { Hydra, HydraContext, service, mediator } from '@mikeseghers/hydra';
import { NoteService } from '../services/NoteService';
import { NotificationMediator } from '../mediators/NotificationMediator';
import { AppStateMediator } from '../mediators/AppStateMediator';
import { StatusMediator } from '../mediators/StatusMediator';
import { NotesPage } from '../pages/NotesPage';
import { StatusElements } from '../elements/StatusElements';
import { NotificationElements } from '../elements/NotificationElements';

/**
 * AppContext - Application-wide Hydra context.
 *
 * This context demonstrates the unified element schema approach:
 *
 * - NotificationMediator: uses selector() for CSS-based element discovery
 * - StatusMediator: uses data attributes for element discovery
 *
 * Both use the same elements() API, just different schema entries.
 * Mediators receive validated, typed elements regardless of discovery method.
 */
export const AppContext: HydraContext = {
  register(hydra: Hydra): void {
    // Register services
    hydra.registerService(NoteService);

    // Register mediators with their element schemas
    hydra.registerMediator(NotificationMediator, [NotificationElements]);
    hydra.registerMediator(StatusMediator, [StatusElements]);
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
