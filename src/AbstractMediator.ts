import { Observable, Subscription } from 'rxjs';
import Mediator, { MediatorListener } from './Mediator';

/**
 * AbstractMediator - Base class for Mediator implementations.
 *
 * Provides the event system implementation so you only need to implement load().
 *
 * @example
 * ```typescript
 * interface NotificationEvents {
 *   shown: { message: string };
 *   hidden: { message: string };
 * }
 *
 * class NotificationMediator extends AbstractMediator<NotificationEvents> {
 *   load(): void {
 *     // Initialization
 *   }
 *
 *   show(message: string): void {
 *     this.emit('shown', { message });
 *   }
 * }
 * ```
 */
export abstract class AbstractMediator<EventType> implements Mediator<EventType> {
  #listeners: { [key in keyof EventType]?: MediatorListener<any>[] } = {};
  #subscriptionBag: Subscription = new Subscription();

  addListener<K extends keyof EventType>(event: K, listener: MediatorListener<EventType[K]>): void {
    const listenersForEvent: MediatorListener<any>[] = this.#listeners[event] ?? [];
    listenersForEvent.push(listener);
    this.#listeners[event] = listenersForEvent;
  }

  removeListener<K extends keyof EventType>(event: K, listener: MediatorListener<EventType[K]>): void {
    const listenersForEvent = this.#listeners[event] ?? ([] as MediatorListener<any>[]);
    const index = listenersForEvent.indexOf(listener);
    if (index !== -1) {
      listenersForEvent.splice(index, 1);
    }
  }

  emit<K extends keyof EventType>(event: K, payload: EventType[K]) {
    this.#listeners[event]?.forEach((listener) => {
      listener(payload);
    });
  }

  fromEvent<K extends keyof EventType>(event: K) {
    return new Observable<EventType[K]>((subscriber) => {
      const handler = (payload: EventType[K]) => subscriber.next(payload);
      this.addListener(event, handler);
      return () => this.removeListener(event, handler);
    });
  }

  abstract load(): void;

  protected get subscriptionBag() {
    return this.#subscriptionBag;
  }
}
