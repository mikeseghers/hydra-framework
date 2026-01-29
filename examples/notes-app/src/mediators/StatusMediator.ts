import { AbstractMediator, assertElementType } from '@mikeseghers/hydra';

/**
 * Events emitted by the StatusMediator.
 */
export interface StatusEvents {
  statusChanged: { status: string };
}

/**
 * Elements interface - defines what this Mediator expects.
 * When using dataAttributes(), these are discovered from the DOM
 * via data-hydra-element attributes.
 */
interface Elements {
  statusText: HTMLSpanElement;
  indicator: HTMLElement;
}

/**
 * StatusMediator - Displays application status using DATA ATTRIBUTES approach.
 *
 * This Mediator demonstrates the data-attribute bootstrapping pattern:
 * - No htmlElementDescriptor() calls needed in the context
 * - Elements are discovered from DOM via data-hydra-element attributes
 * - Type safety via assertElementType() at construction time
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
 * hydra.registerMediator(StatusMediator, [dataAttributes()]);
 * ```
 */
export class StatusMediator extends AbstractMediator<StatusEvents> {
  #elements: Elements;

  constructor(discoveredElements: Record<string, HTMLElement | HTMLElement[]>) {
    super();
    // Validate and type the discovered elements
    this.#elements = {
      statusText: assertElementType(discoveredElements.statusText, HTMLSpanElement, 'statusText'),
      indicator: assertElementType(discoveredElements.indicator, HTMLElement, 'indicator')
    };
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
