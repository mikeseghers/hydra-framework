# Hydra

A lightweight dependency injection and component management framework for TypeScript web applications.

## What is Hydra?

Hydra helps you build structured, maintainable client-side applications without heavy frameworks. It provides:

- **Dependency Injection** - Wire up services and components declaratively
- **Component Lifecycle** - Async initialization with the `Loadable` interface
- **Event System** - Type-safe events with RxJS integration
- **DOM Binding** - Two approaches: CSS selectors or data attributes
- **Zero Build Required** - Works with vanilla HTML + TypeScript/JavaScript

Hydra is ideal for static websites, server-rendered pages, or any project where you want structure without a full SPA framework.

## Installation

```bash
npm install @mikeseghers/hydra rxjs
```

## Quick Start

### 1. Create your HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Hydra App</title>
</head>
<body>
  <div id="app">
    <h1 id="greeting">Hello</h1>
    <button id="change-btn">Change Greeting</button>
  </div>

  <script type="module" src="./main.ts"></script>
</body>
</html>
```

### 2. Define a Service

Services are singletons that provide shared functionality.

```typescript
// services/GreetingService.ts
export class GreetingService {
  private greetings = ['Hello', 'Bonjour', 'Hola', 'Ciao'];
  private index = 0;

  getNextGreeting(): string {
    this.index = (this.index + 1) % this.greetings.length;
    return this.greetings[this.index];
  }
}
```

### 3. Define a PageController

PageControllers are top-level controllers that coordinate your page.

```typescript
// pages/HomePage.ts
import type { PageController } from '@mikeseghers/hydra';
import { GreetingService } from '../services/GreetingService';

interface Elements {
  greeting: HTMLHeadingElement;
  changeButton: HTMLButtonElement;
}

export class HomePage implements PageController {
  constructor(
    private greetingService: GreetingService,
    private elements: Elements
  ) {}

  load(): void {
    this.elements.changeButton.addEventListener('click', () => {
      this.elements.greeting.textContent = this.greetingService.getNextGreeting();
    });
  }
}
```

### 4. Create a Context

Contexts organize your registrations and declare dependencies.

```typescript
// contexts/AppContext.ts
import { Hydra, HydraContext, service, htmlElementDescriptor } from '@mikeseghers/hydra';
import { GreetingService } from '../services/GreetingService';
import { HomePage } from '../pages/HomePage';

const homePageElements = {
  greeting: htmlElementDescriptor('#greeting', HTMLHeadingElement),
  changeButton: htmlElementDescriptor('#change-btn', HTMLButtonElement)
};

export const AppContext: HydraContext = {
  register(hydra: Hydra): void {
    hydra.registerService(GreetingService);
    hydra.registerPageController(HomePage, [
      service(GreetingService),
      homePageElements
    ]);
  }
};
```

### 5. Bootstrap

```typescript
// main.ts
import { Hydra } from '@mikeseghers/hydra';
import { AppContext } from './contexts/AppContext';

Hydra.registerContext(AppContext);
Hydra.getInstance(); // Hooks into window.onload and boots automatically
```

That's it! When the page loads, Hydra will:
1. Instantiate all services
2. Resolve DOM elements
3. Construct PageControllers with their dependencies
4. Call `load()` on everything

---

## Core Concepts

### Services

Services are singletons for shared logic (API clients, state management, utilities).

```typescript
class ApiService {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }
}

class UserService {
  constructor(private api: ApiService) {}

  getUser(id: string) {
    return this.api.get(`/users/${id}`);
  }
}

// Registration with dependencies
hydra.registerService(ApiService);
hydra.registerService(UserService, [service(ApiService)]);
```

### Mediators

Mediators are event-capable components for cross-cutting concerns (notifications, modals, state).

```typescript
import { AbstractMediator } from '@mikeseghers/hydra';

interface NotificationEvents {
  shown: { message: string };
  hidden: { message: string };
}

interface Elements {
  container: HTMLDivElement;
}

class NotificationMediator extends AbstractMediator<NotificationEvents> {
  constructor(private elements: Elements) {
    super();
  }

  load(): void {
    // Ready to show notifications
  }

  show(message: string): void {
    const el = document.createElement('div');
    el.textContent = message;
    this.elements.container.appendChild(el);
    this.emit('shown', { message });

    setTimeout(() => {
      el.remove();
      this.emit('hidden', { message });
    }, 3000);
  }
}
```

**Listening to events:**

```typescript
// With callbacks
notifications.addListener('shown', (payload) => {
  console.log('Notification shown:', payload.message);
});

// With RxJS
notifications.fromMediatorEvent('shown').subscribe((payload) => {
  console.log('Notification shown:', payload.message);
});
```

### PageControllers

PageControllers are top-level page controllers. They receive dependencies and coordinate the page.

```typescript
class DashboardPage implements PageController {
  constructor(
    private userService: UserService,
    private notifications: NotificationMediator,
    private elements: DashboardElements
  ) {}

  async load(): Promise<void> {
    const user = await this.userService.getCurrentUser();
    this.elements.userName.textContent = user.name;
    this.notifications.show(`Welcome back, ${user.name}!`);
  }
}

hydra.registerPageController(DashboardPage, [
  service(UserService),
  mediator(NotificationMediator),
  dashboardElements
]);
```

### Components

Components are reusable UI elements with their own DOM structure.

```typescript
import { AbstractComponent, htmlElementDescriptor, constructComponent } from '@mikeseghers/hydra';

const cardElements = {
  title: htmlElementDescriptor('.card-title', HTMLHeadingElement),
  content: htmlElementDescriptor('.card-content', HTMLDivElement)
};

class Card extends AbstractComponent<HTMLDivElement, typeof cardElements> {
  setTitle(title: string): void {
    this.elements.title.textContent = title;
  }

  setContent(content: string): void {
    this.elements.content.textContent = content;
  }

  destroy(): void {
    this.rootElement.remove();
  }
}

// Create from existing DOM element
const card = constructComponent(Card, '.card', HTMLDivElement, cardElements);

// Or from a template
const card = constructComponent(Card, '#card-template', HTMLDivElement, cardElements);
```

---

## Element Binding

Hydra uses **element schemas** to define what DOM elements a Mediator needs. The schema is defined once in a separate file and provides both runtime validation and TypeScript types.

### Element Schema Basics

```typescript
// elements/MyElements.ts
import { elements, selector, collection, selectorAll } from '@mikeseghers/hydra';

export const MyElements = elements({
  // Data attribute discovery (matches data-hydra-element="propertyName")
  indicator: HTMLSpanElement,
  statusText: HTMLSpanElement,

  // CSS selector discovery
  submitBtn: selector('#submit-btn', HTMLButtonElement),
  emailInput: selector('input[type="email"]', HTMLInputElement),

  // Collections
  items: collection(HTMLLIElement),           // via data attributes
  checkboxes: selectorAll('.checkbox', HTMLInputElement)  // via CSS selector
});
```

### Data Attribute Discovery

Use the HTMLElement type directly. Hydra matches property names to `data-hydra-element` values:

```typescript
// elements/StatusElements.ts
import { elements } from '@mikeseghers/hydra';

export const StatusElements = elements({
  indicator: HTMLSpanElement,   // ← matches data-hydra-element="indicator"
  statusText: HTMLSpanElement   // ← matches data-hydra-element="statusText"
});
```

**HTML:**
```html
<div data-hydra-mediator="StatusMediator">
  <span data-hydra-element="indicator"></span>
  <span data-hydra-element="statusText">Ready</span>
</div>
```

### CSS Selector Discovery

Use `selector()` or `selectorAll()` to find elements via CSS selectors:

```typescript
// elements/NotificationElements.ts
import { elements, selector } from '@mikeseghers/hydra';

export const NotificationElements = elements({
  container: selector('#notifications', HTMLDivElement)
});
```

**HTML:**
```html
<div id="notifications"></div>
```

### Mixed Schemas

You can mix both approaches in a single schema:

```typescript
export const FormElements = elements({
  // CSS selectors for structural elements
  form: selector('form.contact', HTMLFormElement),
  submitBtn: selector('#submit', HTMLButtonElement),

  // Data attributes for dynamic elements
  errorMessage: HTMLSpanElement,
  successMessage: HTMLSpanElement
});
```

### Using Schemas in Mediators

```typescript
import { AbstractMediator, ElementsOf } from '@mikeseghers/hydra';
import { StatusElements } from '../elements/StatusElements';

// Type is derived from the schema
type Elements = ElementsOf<typeof StatusElements>;

class StatusMediator extends AbstractMediator<StatusEvents> {
  #elements: Elements;

  constructor(elements: Elements) {
    super();
    this.#elements = elements; // Already validated by Hydra!
  }
}
```

### Registration

```typescript
// contexts/AppContext.ts
import { StatusElements } from '../elements/StatusElements';
import { NotificationElements } from '../elements/NotificationElements';

hydra.registerMediator(StatusMediator, [StatusElements]);
hydra.registerMediator(NotificationMediator, [NotificationElements]);
```

### Schema Entry Reference

| Entry Type | Syntax | Discovery Method |
|------------|--------|------------------|
| Single element | `HTMLButtonElement` | `data-hydra-element="propName"` |
| Collection | `collection(HTMLLIElement)` | Multiple `data-hydra-element="propName"` |
| Single via selector | `selector('#id', HTMLDivElement)` | CSS selector |
| Collection via selector | `selectorAll('.class', HTMLInputElement)` | CSS selector (all matches) |

### Data Attributes Reference

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `data-hydra-mediator` | Marks Mediator root, value is class name | `data-hydra-mediator="StatusMediator"` |
| `data-hydra-element` | Marks element, value must match schema property name | `data-hydra-element="indicator"` |
| `data-hydra-qualifier` | For multiple instances of same Mediator | `data-hydra-qualifier="sidebar"` |

### When to Use Each Discovery Method

| Scenario | Recommended |
|----------|-------------|
| Existing HTML you can't modify | `selector()` / `selectorAll()` |
| New project, self-documenting HTML | Direct types (data attributes) |
| Complex selectors (`:nth-child`, etc.) | `selector()` / `selectorAll()` |
| Multiple Mediator instances with qualifiers | Direct types (data attributes) |

---

## Dependency Injection

### Dependency Types

```typescript
import { service, mediator, value, htmlElementDescriptor } from '@mikeseghers/hydra';

hydra.registerPageController(MyPage, [
  service(ApiService),           // Inject a service
  mediator(NotificationMediator),    // Inject a Mediator
  value('https://api.example.com'), // Inject a constant
  myPageElements                 // Inject DOM elements
]);
```

### Services with Dependencies

```typescript
class CacheService {
  private cache = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }
}

class ApiService {
  constructor(
    private cache: CacheService,
    private baseUrl: string
  ) {}

  async get<T>(endpoint: string): Promise<T> {
    const cached = this.cache.get<T>(endpoint);
    if (cached) return cached;

    const data = await fetch(`${this.baseUrl}${endpoint}`).then(r => r.json());
    this.cache.set(endpoint, data);
    return data;
  }
}

hydra.registerService(CacheService);
hydra.registerService(ApiService, [
  service(CacheService),
  value('https://api.example.com')
]);
```

### Qualified Mediators

Create multiple instances of the same Mediator:

```typescript
// Registration
hydra.registerMediator(FormMediator, [FormElements]);

// Usage in PageController
hydra.registerPageController(SettingsPage, [
  mediator(FormMediator, { qualifier: 'profile' }),
  mediator(FormMediator, { qualifier: 'password' })
]);
```

```html
<div data-hydra-mediator="FormMediator" data-hydra-qualifier="profile">
  <input data-hydra-element="input" type="text" />
</div>

<div data-hydra-mediator="FormMediator" data-hydra-qualifier="password">
  <input data-hydra-element="input" type="password" />
</div>
```

---

## Organizing Your Code

### Recommended Project Structure

```
src/
├── services/           # Business logic, API clients
│   ├── ApiService.ts
│   └── UserService.ts
├── mediators/          # Event-capable components
│   ├── NotificationMediator.ts
│   └── ModalMediator.ts
├── elements/           # Element schemas
│   ├── StatusElements.ts
│   └── FormElements.ts
├── components/         # Reusable UI components
│   ├── CardComponent.ts
│   └── ListComponent.ts
├── pages/              # PageController controllers
│   ├── HomePage.ts
│   └── SettingsPage.ts
├── contexts/           # Hydra registrations
│   └── AppContext.ts
└── main.ts             # Bootstrap
```

### Multiple Contexts

Split registrations by feature:

```typescript
// contexts/AuthContext.ts
export const AuthContext: HydraContext = {
  register(hydra: Hydra): void {
    hydra.registerService(AuthService);
    hydra.registerService(SessionService, [service(AuthService)]);
    hydra.registerMediator(LoginFormMediator, [LoginFormElements]);
  }
};

// contexts/DashboardContext.ts
export const DashboardContext: HydraContext = {
  register(hydra: Hydra): void {
    hydra.registerService(AnalyticsService);
    hydra.registerMediator(ChartMediator, [chartElements]);
  }
};

// main.ts
Hydra.registerContext(AuthContext);
Hydra.registerContext(DashboardContext);
Hydra.getInstance();
```

---

## Working with Templates

Clone HTML templates for dynamic content:

```html
<template id="card-template">
  <div class="card">
    <h3 class="card-title"></h3>
    <p class="card-content"></p>
  </div>
</template>

<div id="card-container"></div>
```

```typescript
import { cloneTemplateContent, htmlElementDescriptor } from '@mikeseghers/hydra';

const cardElements = {
  title: htmlElementDescriptor('.card-title', HTMLHeadingElement),
  content: htmlElementDescriptor('.card-content', HTMLParagraphElement)
};

function createCard(title: string, content: string): HTMLElement {
  const { rootElement, templateElements } = cloneTemplateContent(
    'card-template',
    HTMLDivElement,
    cardElements
  );

  templateElements.title.textContent = title;
  templateElements.content.textContent = content;

  document.getElementById('card-container')!.appendChild(rootElement);
  return rootElement;
}
```

---

## API Reference

### Hydra Class

```typescript
// Static methods
Hydra.getInstance(): Hydra
Hydra.registerContext(context: HydraContext): void

// Instance methods
hydra.registerService(constructor, dependencies?): void
hydra.registerMediator(constructor, dependencies): void
hydra.registerPageController(constructor, dependencies): void
hydra.registerServiceInstance(instance, name?): HydraRegistry
hydra.registerComponentInstance(instance, name?): HydraRegistry
hydra.getServiceInstance(type, name?): T
hydra.getComponentInstance(type, name?): T
hydra.getMediatorInstance(definition): Loadable
```

### Dependency Functions

```typescript
service(ServiceType)                    // Inject a service
mediator(MediatorType, options?)        // Inject a Mediator
value(v)                                // Inject a constant
```

### Element Schema Functions

```typescript
elements(schema)                        // Create element schema
selector(cssSelector, Type)             // Single element via CSS selector
selectorAll(cssSelector, Type)          // Collection via CSS selector
collection(Type)                        // Collection via data attributes
```

### Element Schema Types

```typescript
ElementsOf<Schema>                      // Extract elements type from schema
ElementSchema<D>                        // Schema type
ElementCollection<T>                    // Collection marker (data attributes)
ElementWithSelector<T>                  // Single element with selector
ElementCollectionWithSelector<T>        // Collection with selector
```

### Legacy Element Descriptors

```typescript
htmlElementDescriptor(selector, type)   // Single element descriptor
htmlElementCollectionDescriptor(selector, type)  // Collection descriptor
```

### Type Assertion Utilities

```typescript
assertElementType(element, Type, context?)   // Validate single element
assertElementTypes(elements, Type, context?) // Validate collection
```

### Discovery Utilities

```typescript
discoverMediators(root?): DiscoveredMediator[]
findMediator(discovered, name, qualifier?): DiscoveredMediator | undefined
```

---

## Example Project

See [`examples/notes-app/`](examples/notes-app/) for a complete working example demonstrating:

- Services (NoteService)
- Mediators with events (NotificationMediator, AppStateMediator, StatusMediator)
- Components with subcomponents (NoteListComponent, NoteEditorComponent)
- Both element binding approaches (traditional + data attributes)
- Template cloning for dynamic lists

Run it:
```bash
cd examples/notes-app
npm install
npm run dev
```

---

## Browser Support

- ES6+ JavaScript
- Modern browsers (Chrome, Firefox, Safari, Edge)

## Dependencies

- **RxJS** (^7.0.0) - For reactive event handling in Mediators

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
