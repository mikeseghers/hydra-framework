import { AbstractPagePart, assertElementType } from '@mikeseghers/hydra';

/**
 * Events emitted by the StatusPart.
 */
export interface StatusEvents {
  statusChanged: { status: string };
}

/**
 * Elements interface - defines what this PagePart expects.
 * When using dataAttributes(), these are discovered from the DOM
 * via data-hydra-element attributes.
 */
interface Elements {
  statusText: HTMLSpanElement;
  indicator: HTMLElement;
}

/**
 * StatusPart - Displays application status using DATA ATTRIBUTES approach.
 *
 * This PagePart demonstrates the data-attribute bootstrapping pattern:
 * - No htmlElementDescriptor() calls needed in the context
 * - Elements are discovered from DOM via data-hydra-element attributes
 * - Type safety via assertElementType() at construction time
 *
 * HTML setup:
 * ```html
 * <div data-hydra-pagepart="StatusPart">
 *   <span data-hydra-element="indicator"></span>
 *   <span data-hydra-element="statusText"></span>
 * </div>
 * ```
 *
 * Context registration:
 * ```typescript
 * hydra.registerPagePart(StatusPart, [dataAttributes()]);
 * ```
 */
export class StatusPart extends AbstractPagePart<StatusEvents> {
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
