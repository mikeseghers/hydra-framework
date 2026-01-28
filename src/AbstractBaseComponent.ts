import { Observable, Observer, Subject, Subscription, takeUntil } from 'rxjs';
import { BaseComponent } from './BaseComponent';

export abstract class AbstractBaseComponent implements BaseComponent {
  #destroy$: Subject<void>;

  protected subscribeUntilDestroyed<T>(
    observable: Observable<T>,
    next?: Partial<Observer<T>> | ((value: T) => void),
    error?: (e: Error) => void
  ): Subscription {
    const untilDestroyed = observable.pipe(takeUntil(this.#destroy$));
    if (typeof next === 'function') {
      return untilDestroyed.subscribe({ next, error });
    } else {
      return untilDestroyed.subscribe(next);
    }
  }

  constructor() {
    this.#destroy$ = new Subject();
  }

  get destroy$(): Observable<void> {
    return this.#destroy$.asObservable();
  }

  destroy() {
    this.#destroy$.next();
  }
}
