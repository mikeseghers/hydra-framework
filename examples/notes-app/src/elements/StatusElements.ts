import { elements } from '@mikeseghers/hydra';

/**
 * Element schema for StatusMediator.
 * Defines the elements expected in the DOM with data-hydra-element attributes.
 *
 * HTML setup:
 * ```html
 * <div data-hydra-mediator="StatusMediator">
 *   <span data-hydra-element="indicator"></span>
 *   <span data-hydra-element="statusText"></span>
 * </div>
 * ```
 */
export const StatusElements = elements({
  statusText: HTMLSpanElement,
  indicator: HTMLElement
});
