import { describe, it, expect, beforeEach, vi } from 'vitest';
import Hydra, { service, pagePart } from '../src/Hydra';
import type PageEntry from '../src/PageEntry';
import type PagePart from '../src/PagePart';
import { AbstractPagePart } from '../src/AbstractPagePart';
import { firstValueFrom, take, toArray } from 'rxjs';

/**
 * PagePart Tests
 *
 * PageParts are event-capable components that facilitate communication
 * between different parts of your application. They extend Loadable
 * and provide a typed event system with RxJS Observable support.
 *
 * Key features:
 * - Type-safe event emission and listening
 * - RxJS Observable integration for reactive patterns
 * - Subscription management via subscriptionBag
 * - Lifecycle management (load/unload)
 */
describe('PageParts', () => {

  beforeEach(() => {
    if ((window as any).hydra) {
      delete (window as any).hydra;
    }
    document.body.innerHTML = '';
  });

  /**
   * Example 1: Basic PagePart with Events
   *
   * This example demonstrates creating a PagePart that emits events
   * when user actions occur. Other parts of the application can
   * listen to these events to respond accordingly.
   */
  it('should emit and listen to typed events', async () => {
    // Define the event types for this PagePart
    interface CartEvents {
      itemAdded: { productId: string; quantity: number };
      itemRemoved: { productId: string };
      cartCleared: void;
    }

    // Create a PagePart that manages shopping cart state
    class ShoppingCartPart extends AbstractPagePart<CartEvents> {
      private items: Map<string, number> = new Map();

      load() {
        // Initialize cart state
      }

      addItem(productId: string, quantity: number) {
        const current = this.items.get(productId) || 0;
        this.items.set(productId, current + quantity);
        this.emit('itemAdded', { productId, quantity });
      }

      removeItem(productId: string) {
        this.items.delete(productId);
        this.emit('itemRemoved', { productId });
      }

      clearCart() {
        this.items.clear();
        this.emit('cartCleared', undefined as void);
      }

      getItemCount(): number {
        return Array.from(this.items.values()).reduce((sum, qty) => sum + qty, 0);
      }
    }

    // Create the PagePart
    const cart = new ShoppingCartPart();

    // Track events received
    const addedItems: Array<{ productId: string; quantity: number }> = [];
    const removedItems: string[] = [];
    let cartWasCleared = false;

    // Add listeners
    cart.addListener('itemAdded', (payload) => {
      addedItems.push(payload);
    });

    cart.addListener('itemRemoved', (payload) => {
      removedItems.push(payload.productId);
    });

    cart.addListener('cartCleared', () => {
      cartWasCleared = true;
    });

    // Perform actions
    cart.addItem('product-1', 2);
    cart.addItem('product-2', 1);
    cart.removeItem('product-1');
    cart.clearCart();

    // Verify events were received
    expect(addedItems).toEqual([
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 }
    ]);
    expect(removedItems).toEqual(['product-1']);
    expect(cartWasCleared).toBe(true);
  });

  /**
   * Example 2: Removing Event Listeners
   *
   * Listeners can be removed when they're no longer needed.
   * This is important for preventing memory leaks and ensuring
   * components don't receive events after they're destroyed.
   */
  it('should remove event listeners', async () => {
    interface NotificationEvents {
      notify: string;
    }

    class NotificationPart extends AbstractPagePart<NotificationEvents> {
      load() {}

      sendNotification(message: string) {
        this.emit('notify', message);
      }
    }

    const notifications = new NotificationPart();
    const receivedMessages: string[] = [];

    // Create a listener function (must keep reference for removal)
    const listener = (message: string) => {
      receivedMessages.push(message);
    };

    // Add the listener
    notifications.addListener('notify', listener);

    // First notification should be received
    notifications.sendNotification('Hello');
    expect(receivedMessages).toEqual(['Hello']);

    // Remove the listener
    notifications.removeListener('notify', listener);

    // Second notification should NOT be received
    notifications.sendNotification('World');
    expect(receivedMessages).toEqual(['Hello']); // Still only one message
  });

  /**
   * Example 3: Multiple Listeners for Same Event
   *
   * Multiple parts of your application can listen to the same event.
   * Each listener will receive the event independently.
   */
  it('should support multiple listeners for the same event', async () => {
    interface UserEvents {
      login: { userId: string; timestamp: Date };
    }

    class AuthPart extends AbstractPagePart<UserEvents> {
      load() {}

      login(userId: string) {
        this.emit('login', { userId, timestamp: new Date() });
      }
    }

    const auth = new AuthPart();

    // Multiple systems want to know about login
    const analyticsEvents: string[] = [];
    const uiUpdates: string[] = [];
    const auditLog: string[] = [];

    auth.addListener('login', (payload) => {
      analyticsEvents.push(`Analytics: User ${payload.userId} logged in`);
    });

    auth.addListener('login', (payload) => {
      uiUpdates.push(`UI: Welcome ${payload.userId}`);
    });

    auth.addListener('login', (payload) => {
      auditLog.push(`Audit: Login by ${payload.userId}`);
    });

    // Trigger login
    auth.login('user-123');

    // All listeners received the event
    expect(analyticsEvents).toHaveLength(1);
    expect(uiUpdates).toHaveLength(1);
    expect(auditLog).toHaveLength(1);
  });

  /**
   * Example 4: RxJS Observable Integration
   *
   * PageParts provide RxJS Observable streams via fromPagePartEvent().
   * This enables reactive patterns like filtering, mapping, debouncing,
   * and combining event streams.
   */
  it('should provide RxJS Observable streams for events', async () => {
    interface SearchEvents {
      search: string;
      resultCount: number;
    }

    class SearchPart extends AbstractPagePart<SearchEvents> {
      load() {}

      performSearch(query: string) {
        this.emit('search', query);
        // Simulate search results
        const resultCount = query.length * 10;
        this.emit('resultCount', resultCount);
      }
    }

    const search = new SearchPart();

    // Create observables for events
    const search$ = search.fromPagePartEvent('search');
    const results$ = search.fromPagePartEvent('resultCount');

    // Collect emitted values
    const searchQueries: string[] = [];
    const resultCounts: number[] = [];

    // Subscribe to observables
    const searchSub = search$.subscribe(query => searchQueries.push(query));
    const resultSub = results$.subscribe(count => resultCounts.push(count));

    // Perform searches
    search.performSearch('test');
    search.performSearch('hello world');

    // Verify observable emissions
    expect(searchQueries).toEqual(['test', 'hello world']);
    expect(resultCounts).toEqual([40, 110]);

    // Clean up subscriptions
    searchSub.unsubscribe();
    resultSub.unsubscribe();
  });

  /**
   * Example 5: Using RxJS Operators
   *
   * The Observable streams can be transformed using RxJS operators.
   * This example shows filtering and collecting events.
   */
  it('should work with RxJS operators', async () => {
    interface StockEvents {
      priceUpdate: { symbol: string; price: number };
    }

    class StockTickerPart extends AbstractPagePart<StockEvents> {
      load() {}

      updatePrice(symbol: string, price: number) {
        this.emit('priceUpdate', { symbol, price });
      }
    }

    const ticker = new StockTickerPart();

    // Get observable and collect first 3 updates
    const priceUpdates$ = ticker.fromPagePartEvent('priceUpdate').pipe(
      take(3),
      toArray()
    );

    // Start collecting (returns a promise with take+toArray)
    const collectPromise = firstValueFrom(priceUpdates$);

    // Emit price updates
    ticker.updatePrice('AAPL', 150.00);
    ticker.updatePrice('GOOGL', 2800.00);
    ticker.updatePrice('MSFT', 300.00);
    ticker.updatePrice('AMZN', 3400.00); // This one won't be collected

    // Verify only first 3 were collected
    const collected = await collectPromise;
    expect(collected).toEqual([
      { symbol: 'AAPL', price: 150.00 },
      { symbol: 'GOOGL', price: 2800.00 },
      { symbol: 'MSFT', price: 300.00 }
    ]);
  });

  /**
   * Example 6: Observable Cleanup on Unsubscribe
   *
   * When you unsubscribe from a PagePart observable, the underlying
   * listener is automatically removed. This prevents memory leaks.
   */
  it('should clean up listeners when observable is unsubscribed', async () => {
    interface PingEvents {
      ping: number;
    }

    class PingPart extends AbstractPagePart<PingEvents> {
      load() {}

      ping(value: number) {
        this.emit('ping', value);
      }
    }

    const pingPart = new PingPart();
    const received: number[] = [];

    // Subscribe to observable
    const subscription = pingPart.fromPagePartEvent('ping').subscribe(
      value => received.push(value)
    );

    // Emit while subscribed
    pingPart.ping(1);
    pingPart.ping(2);
    expect(received).toEqual([1, 2]);

    // Unsubscribe
    subscription.unsubscribe();

    // Emit after unsubscribe - should not be received
    pingPart.ping(3);
    expect(received).toEqual([1, 2]); // Still only 1, 2
  });

  /**
   * Example 7: PagePart with Dependency Injection
   *
   * PageParts can be registered with Hydra and injected into
   * PageEntries or other PageParts using the pagePart() dependency.
   */
  it('should inject PageParts into PageEntries', async () => {
    interface MessageEvents {
      newMessage: { from: string; text: string };
    }

    class MessageBusPart extends AbstractPagePart<MessageEvents> {
      load() {}

      broadcast(from: string, text: string) {
        this.emit('newMessage', { from, text });
      }
    }

    // PageEntry that uses the MessageBus
    class ChatPage implements PageEntry {
      public messages: Array<{ from: string; text: string }> = [];

      constructor(private messageBus: MessageBusPart) {
        this.messageBus.addListener('newMessage', (msg) => {
          this.messages.push(msg);
        });
      }

      async load() {
        // Simulate receiving messages
        this.messageBus.broadcast('Alice', 'Hello!');
        this.messageBus.broadcast('Bob', 'Hi there!');
      }
    }

    // Bootstrap with Hydra
    const hydra = Hydra.getInstance();

    hydra.registerPagePart(MessageBusPart, []);
    hydra.registerPageEntry(ChatPage, [pagePart(MessageBusPart)]);

    await (hydra as any).boot();

    // Verify messages were received
    const chatPage = hydra['pageEntries']['ChatPage'] as ChatPage;
    expect(chatPage.messages).toEqual([
      { from: 'Alice', text: 'Hello!' },
      { from: 'Bob', text: 'Hi there!' }
    ]);
  });

  /**
   * Example 8: Qualified PageParts
   *
   * When you need multiple instances of the same PagePart type,
   * use qualifiers to distinguish between them.
   */
  it('should support qualified PagePart instances', async () => {
    interface CounterEvents {
      incremented: number;
    }

    class CounterPart extends AbstractPagePart<CounterEvents> {
      private count = 0;

      load() {}

      increment() {
        this.count++;
        this.emit('incremented', this.count);
      }

      getCount() {
        return this.count;
      }
    }

    // PageEntry using two separate counters
    class DualCounterPage implements PageEntry {
      constructor(
        private leftCounter: CounterPart,
        private rightCounter: CounterPart
      ) {}

      async load() {
        this.leftCounter.increment();
        this.leftCounter.increment();
        this.rightCounter.increment();
      }

      getCounts() {
        return {
          left: this.leftCounter.getCount(),
          right: this.rightCounter.getCount()
        };
      }
    }

    const hydra = Hydra.getInstance();

    // Register the same PagePart type twice (it will create separate instances with qualifiers)
    hydra.registerPagePart(CounterPart, []);

    hydra.registerPageEntry(DualCounterPage, [
      pagePart(CounterPart, { qualifier: 'left' }),
      pagePart(CounterPart, { qualifier: 'right' })
    ]);

    await (hydra as any).boot();

    const page = hydra['pageEntries']['DualCounterPage'] as DualCounterPage;
    expect(page.getCounts()).toEqual({ left: 2, right: 1 });
  });

  /**
   * Example 9: Communication Between PageParts
   *
   * PageParts can communicate with each other through events.
   * This enables loose coupling between different parts of your application.
   */
  it('should enable communication between PageParts', async () => {
    // Events for the form
    interface FormEvents {
      submitted: { email: string };
    }

    // Events for notifications
    interface ToastEvents {
      show: { message: string; type: 'success' | 'error' };
    }

    class FormPart extends AbstractPagePart<FormEvents> {
      load() {}

      submit(email: string) {
        this.emit('submitted', { email });
      }
    }

    class ToastPart extends AbstractPagePart<ToastEvents> {
      public displayedToasts: Array<{ message: string; type: string }> = [];

      load() {}

      show(message: string, type: 'success' | 'error') {
        this.displayedToasts.push({ message, type });
        this.emit('show', { message, type });
      }
    }

    // Coordinator that wires them together
    class SubscriptionPage implements PageEntry {
      constructor(
        private form: FormPart,
        private toast: ToastPart
      ) {
        // Wire up: when form is submitted, show a toast
        this.form.addListener('submitted', (data) => {
          this.toast.show(`Subscribed: ${data.email}`, 'success');
        });
      }

      async load() {}

      submitEmail(email: string) {
        this.form.submit(email);
      }
    }

    const hydra = Hydra.getInstance();

    hydra.registerPagePart(FormPart, []);
    hydra.registerPagePart(ToastPart, []);
    hydra.registerPageEntry(SubscriptionPage, [
      pagePart(FormPart),
      pagePart(ToastPart)
    ]);

    await (hydra as any).boot();

    const page = hydra['pageEntries']['SubscriptionPage'] as SubscriptionPage;
    page.submitEmail('user@example.com');

    // Verify the toast was shown
    const toast = hydra['pageParts']['ToastPart'] as ToastPart;
    expect(toast.displayedToasts).toEqual([
      { message: 'Subscribed: user@example.com', type: 'success' }
    ]);
  });

  /**
   * Example 10: Real-World Pattern - State Management
   *
   * PageParts can serve as a lightweight state management solution.
   * Components subscribe to state changes and react accordingly.
   */
  it('should demonstrate state management pattern', async () => {
    interface User {
      id: string;
      name: string;
      role: 'admin' | 'user';
    }

    interface AuthStateEvents {
      userChanged: User | null;
      permissionsChanged: string[];
    }

    class AuthStatePart extends AbstractPagePart<AuthStateEvents> {
      private currentUser: User | null = null;
      private permissions: string[] = [];

      load() {}

      login(user: User) {
        this.currentUser = user;
        this.permissions = user.role === 'admin'
          ? ['read', 'write', 'delete', 'admin']
          : ['read'];

        this.emit('userChanged', this.currentUser);
        this.emit('permissionsChanged', this.permissions);
      }

      logout() {
        this.currentUser = null;
        this.permissions = [];

        this.emit('userChanged', null);
        this.emit('permissionsChanged', []);
      }

      getCurrentUser() {
        return this.currentUser;
      }

      hasPermission(permission: string) {
        return this.permissions.includes(permission);
      }
    }

    const authState = new AuthStatePart();

    // Track state changes
    const userChanges: Array<User | null> = [];
    const permissionChanges: string[][] = [];

    authState.addListener('userChanged', user => userChanges.push(user));
    authState.addListener('permissionsChanged', perms => permissionChanges.push([...perms]));

    // Login as admin
    authState.login({ id: '1', name: 'Admin', role: 'admin' });

    expect(authState.getCurrentUser()?.name).toBe('Admin');
    expect(authState.hasPermission('admin')).toBe(true);
    expect(authState.hasPermission('delete')).toBe(true);

    // Logout
    authState.logout();

    expect(authState.getCurrentUser()).toBeNull();
    expect(authState.hasPermission('read')).toBe(false);

    // Verify all state changes were emitted
    expect(userChanges).toHaveLength(2);
    expect(permissionChanges).toEqual([
      ['read', 'write', 'delete', 'admin'],
      []
    ]);
  });
});
