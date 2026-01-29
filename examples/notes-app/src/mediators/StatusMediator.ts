import { AbstractMediator, ElementsOf } from '@mikeseghers/hydra';
import { StatusElements } from '../elements/StatusElements';

/**
 * Events emitted by the StatusMediator.
 */
export interface StatusEvents {
  statusChanged: { status: string };
}

/**
 * Elements type derived from the schema - no manual interface needed!
 */
type Elements = ElementsOf<typeof StatusElements>;

/**
 * StatusMediator - Displays application status using DATA ATTRIBUTES approach.
 *
 * This Mediator demonstrates the element schema pattern:
 * - Elements are defined once in StatusElements schema
 * - Type is derived from schema via ElementsOf<>
 * - Hydra validates elements automatically before construction
 * - Constructor receives typed, validated elements
 *
 * HTML setup:
 * ```html
 * <div data-hydra-mediator="StatusMediator">
 *   <span data-hydra-element="indicator"></span>
 *   <span data-hydra-element="statusText"></span>
 * </div>
 * ```
 *
 * Context registration:
 * ```typescript
 * hydra.registerMediator(StatusMediator, [StatusElements]);
 * ```
 */
export class StatusMediator extends AbstractMediator<StatusEvents> {
  #elements: Elements;

  constructor(elements: Elements) {
    super();
    this.#elements = elements;
  }

  load(): void {
    this.setStatus('ready', 'Ready');
  }

  /**
   * Update the status display.
   */
  setStatus(state: 'ready' | 'saving' | 'error', message: string): void {
    this.#elements.statusText.textContent = message;
    this.#elements.indicator.className = `status-indicator status-${state}`;
    this.emit('statusChanged', { status: message });
  }
}
