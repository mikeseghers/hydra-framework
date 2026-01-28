import { Observable, Subscription } from 'rxjs';
import PagePart, { PagePartListener } from './PagePart';

export abstract class AbstractPagePart<EventType> implements PagePart<EventType> {
  #listeners: { [key in keyof EventType]?: PagePartListener<any>[] } = {};
  #subscriptionBag: Subscription = new Subscription();

  addListener<K extends keyof EventType>(event: K, listener: PagePartListener<EventType[K]>): void {
    const listenersForEvent: PagePartListener<any>[] = this.#listeners[event] ?? [];
    listenersForEvent.push(listener);
    this.#listeners[event] = listenersForEvent;
  }

  removeListener<K extends keyof EventType>(event: K, listener: PagePartListener<EventType[K]>): void {
    const listenersForEvent = this.#listeners[event] ?? ([] as PagePartListener<any>[]);
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

  fromPagePartEvent<K extends keyof EventType>(event: K) {
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
