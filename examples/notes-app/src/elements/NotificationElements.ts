import { elements, selector } from '@mikeseghers/hydra';

/**
 * Element schema for NotificationMediator.
 * Uses CSS selector approach - demonstrates the unified schema API
 * with selector-based element resolution.
 */
export const NotificationElements = elements({
  container: selector('#notifications', HTMLDivElement)
});
