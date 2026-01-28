import { Observable } from 'rxjs';
import Loadable from './Loadable';

export type PagePartListener<T> = (payload: T) => void;
export type PagePartEventTypeKey<EventType> = Extract<keyof EventType, string>;

export default interface PagePart<EventType> extends Loadable {
  addListener<K extends PagePartEventTypeKey<EventType>>(event: K, listener: PagePartListener<EventType[K]>): void;
  removeListener<K extends PagePartEventTypeKey<EventType>>(event: K, listener: PagePartListener<EventType[K]>): void;
  emit<K extends PagePartEventTypeKey<EventType>>(event: K, payload: EventType[K]): void;
  fromPagePartEvent<K extends PagePartEventTypeKey<EventType>>(event: K): Observable<EventType[K]>;
}
