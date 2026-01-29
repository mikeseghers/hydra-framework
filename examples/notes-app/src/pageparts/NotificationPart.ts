import { AbstractPagePart, htmlElementDescriptor } from '@mikeseghers/hydra';
import { cloneTemplateContent } from '@mikeseghers/hydra';

/**
 * Notification types for styling purposes.
 */
export type NotificationType = 'success' | 'error' | 'info';

/**
 * Events emitted by the NotificationPart.
 */
export interface NotificationEvents {
  shown: { message: string; type: NotificationType };
  hidden: { message: string };
}

/**
 * Element descriptors for notification items (used when cloning template).
 */
const notificationDescriptors = {
  message: htmlElementDescriptor('.notification-message', HTMLSpanElement)
};

/**
 * Elements required by the NotificationPart.
 */
interface Elements {
  container: HTMLElement;
}

/**
 * NotificationPart - Manages toast notifications.
 *
 * This PagePart demonstrates:
 * - Event emission for notification lifecycle
 * - Template-based DOM creation
 * - Auto-dismissal with timeouts
 *
 * Other parts of the application can listen to notification events
 * for analytics or logging purposes.
 */
export class NotificationPart extends AbstractPagePart<NotificationEvents> {
  #elements: Elements;
  readonly #defaultDuration = 3000;

  constructor(pageElements: Elements) {
    super();
    this.#elements = pageElements;
  }

  load(): void {
    // NotificationPart is ready to show notifications
  }

  /**
   * Show a notification toast.
   *
   * @param message - The message to display
   * @param type - The notification type (success, error, info)
   * @param duration - How long to show the notification (ms)
   */
  show(message: string, type: NotificationType = 'info', duration: number = this.#defaultDuration): void {
    const { rootElement, templateElements } = cloneTemplateContent(
      'notification-template',
      HTMLDivElement,
      notificationDescriptors
    );

    rootElement.classList.add(type);
    templateElements.message.textContent = message;

    this.#elements.container.appendChild(rootElement);
    this.emit('shown', { message, type });

    // Auto-dismiss after duration
    setTimeout(() => {
      rootElement.style.opacity = '0';
      rootElement.style.transform = 'translateX(100%)';
      rootElement.style.transition = 'all 0.3s ease';

      setTimeout(() => {
        rootElement.remove();
        this.emit('hidden', { message });
      }, 300);
    }, duration);
  }

  /**
   * Convenience method for success notifications.
   */
  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  /**
   * Convenience method for error notifications.
   */
  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  /**
   * Convenience method for info notifications.
   */
  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }
}
