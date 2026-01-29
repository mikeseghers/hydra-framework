import { Observable } from 'rxjs';
import Loadable from './Loadable';

export type MediatorListener<T> = (payload: T) => void;
export type MediatorEventTypeKey<EventType> = Extract<keyof EventType, string>;

/**
 * Mediator - An event-capable component for cross-cutting concerns.
 *
 * Mediators coordinate communication between different parts of your application
 * through a typed event system. Use them for:
 * - Notifications and alerts
 * - Application state management
 * - Modal dialogs
 * - Any cross-cutting concern that needs to emit events
 */
export default interface Mediator<EventType> extends Loadable {
  addListener<K extends MediatorEventTypeKey<EventType>>(event: K, listener: MediatorListener<EventType[K]>): void;
  removeListener<K extends MediatorEventTypeKey<EventType>>(event: K, listener: MediatorListener<EventType[K]>): void;
  emit<K extends MediatorEventTypeKey<EventType>>(event: K, payload: EventType[K]): void;
  fromEvent<K extends MediatorEventTypeKey<EventType>>(event: K): Observable<EventType[K]>;
}
