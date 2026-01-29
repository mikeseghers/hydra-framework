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

### 3. Define a PageEntry

PageEntries are top-level controllers that coordinate your page.

```typescript
// pages/HomePage.ts
import type { PageEntry } from '@mikeseghers/hydra';
import { GreetingService } from '../services/GreetingService';

interface Elements {
  greeting: HTMLHeadingElement;
  changeButton: HTMLButtonElement;
}

export class HomePage implements PageEntry {
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
    hydra.registerPageEntry(HomePage, [
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
3. Construct PageEntries with their dependencies
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

### PageParts

PageParts are event-capable components for cross-cutting concerns (notifications, modals, state).

```typescript
import { AbstractPagePart } from '@mikeseghers/hydra';

interface NotificationEvents {
  shown: { message: string };
  hidden: { message: string };
}

interface Elements {
  container: HTMLDivElement;
}

class NotificationPart extends AbstractPagePart<NotificationEvents> {
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
notifications.fromPagePartEvent('shown').subscribe((payload) => {
  console.log('Notification shown:', payload.message);
});
```

### PageEntries

PageEntries are top-level page controllers. They receive dependencies and coordinate the page.

```typescript
class DashboardPage implements PageEntry {
  constructor(
    private userService: UserService,
    private notifications: NotificationPart,
    private elements: DashboardElements
  ) {}

  async load(): Promise<void> {
    const user = await this.userService.getCurrentUser();
    this.elements.userName.textContent = user.name;
    this.notifications.show(`Welcome back, ${user.name}!`);
  }
}

hydra.registerPageEntry(DashboardPage, [
  service(UserService),
  pagePart(NotificationPart),
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

Hydra offers two approaches for binding DOM elements to your components.

### Traditional Approach: CSS Selectors

Define element descriptors with CSS selectors in your context:

```typescript
import { htmlElementDescriptor, htmlElementCollectionDescriptor } from '@mikeseghers/hydra';

const formElements = {
  // Single element
  submitButton: htmlElementDescriptor('#submit-btn', HTMLButtonElement),
  emailInput: htmlElementDescriptor('input[type="email"]', HTMLInputElement),

  // Collection of elements
  checkboxes: htmlElementCollectionDescriptor('.checkbox', HTMLInputElement)
};

hydra.registerPagePart(FormPart, [formElements]);
```

**HTML:**
```html
<form>
  <input type="email" />
  <input type="checkbox" class="checkbox" />
  <input type="checkbox" class="checkbox" />
  <button id="submit-btn">Submit</button>
</form>
```

### Data Attributes Approach

Let Hydra discover elements automatically using data attributes:

```typescript
import { dataAttributes } from '@mikeseghers/hydra';

// Just use the marker - no element descriptors needed
hydra.registerPagePart(StatusPart, [dataAttributes()]);
```

**HTML:**
```html
<div data-hydra-pagepart="StatusPart">
  <span data-hydra-element="indicator"></span>
  <span data-hydra-element="statusText">Ready</span>
</div>
```

**PagePart with data attributes:**
```typescript
import { AbstractPagePart, assertElementType } from '@mikeseghers/hydra';

interface Elements {
  indicator: HTMLSpanElement;
  statusText: HTMLSpanElement;
}

class StatusPart extends AbstractPagePart<StatusEvents> {
  #elements: Elements;

  constructor(discovered: Record<string, HTMLElement | HTMLElement[]>) {
    super();
    // Validate and type the discovered elements
    this.#elements = {
      indicator: assertElementType(discovered.indicator, HTMLSpanElement),
      statusText: assertElementType(discovered.statusText, HTMLSpanElement)
    };
  }

  load(): void {}

  setStatus(message: string): void {
    this.#elements.statusText.textContent = message;
  }
}
```

### Data Attributes Reference

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `data-hydra-pagepart` | Marks PagePart root, value is class name | `data-hydra-pagepart="NotificationPart"` |
| `data-hydra-element` | Marks element property name | `data-hydra-element="container"` |
| `data-hydra-qualifier` | For multiple instances of same PagePart | `data-hydra-qualifier="sidebar"` |

### When to Use Each Approach

| Scenario | Recommended |
|----------|-------------|
| Existing HTML you can't modify | Traditional (CSS selectors) |
| New project, prefer self-documenting HTML | Data attributes |
| Complex selectors (`:nth-child`, etc.) | Traditional |
| Multiple instances with qualifiers | Data attributes |
| Mix of both in same project | Supported! |

---

## Dependency Injection

### Dependency Types

```typescript
import { service, pagePart, value, htmlElementDescriptor } from '@mikeseghers/hydra';

hydra.registerPageEntry(MyPage, [
  service(ApiService),           // Inject a service
  pagePart(NotificationPart),    // Inject a PagePart
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

### Qualified PageParts

Create multiple instances of the same PagePart:

```typescript
// Registration
hydra.registerPagePart(FormPart, [dataAttributes()]);

// Usage in PageEntry
hydra.registerPageEntry(SettingsPage, [
  pagePart(FormPart, { qualifier: 'profile' }),
  pagePart(FormPart, { qualifier: 'password' })
]);
```

```html
<div data-hydra-pagepart="FormPart" data-hydra-qualifier="profile">
  <input data-hydra-element="input" type="text" />
</div>

<div data-hydra-pagepart="FormPart" data-hydra-qualifier="password">
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
├── pageparts/          # Event-capable components
│   ├── NotificationPart.ts
│   └── ModalPart.ts
├── components/         # Reusable UI components
│   ├── CardComponent.ts
│   └── ListComponent.ts
├── pages/              # PageEntry controllers
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
    hydra.registerPagePart(LoginFormPart, [dataAttributes()]);
  }
};

// contexts/DashboardContext.ts
export const DashboardContext: HydraContext = {
  register(hydra: Hydra): void {
    hydra.registerService(AnalyticsService);
    hydra.registerPagePart(ChartPart, [chartElements]);
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
hydra.registerPagePart(constructor, dependencies): void
hydra.registerPageEntry(constructor, dependencies): void
hydra.registerServiceInstance(instance, name?): HydraRegistry
hydra.registerComponentInstance(instance, name?): HydraRegistry
hydra.getServiceInstance(type, name?): T
hydra.getComponentInstance(type, name?): T
hydra.getPagePartInstance(definition): Loadable
```

### Dependency Functions

```typescript
service(ServiceType)                    // Inject a service
pagePart(PagePartType, options?)        // Inject a PagePart
value(v)                                // Inject a constant
dataAttributes()                        // Auto-discover elements
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
discoverPageParts(root?): DiscoveredPagePart[]
findPagePart(discovered, name, qualifier?): DiscoveredPagePart | undefined
```

---

## Example Project

See [`examples/notes-app/`](examples/notes-app/) for a complete working example demonstrating:

- Services (NoteService)
- PageParts with events (NotificationPart, AppStatePart, StatusPart)
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

- **RxJS** (^7.0.0) - For reactive event handling in PageParts

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
