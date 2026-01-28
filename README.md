# Hydra

A lightweight dependency injection and component management framework for TypeScript web applications.

## Overview

Hydra is a framework for building modular, maintainable web applications with TypeScript. It provides dependency injection, component lifecycle management and a structured approach to organizing client-side code.

## Features

- **Dependency Injection** - Register and resolve services, components and page parts
- **Component Lifecycle** - Loadable interface for async initialization
- **Type Safety** - Full TypeScript support with generic types
- **DOM Management** - Helper utilities for working with HTML elements
- **Event System** - Built-in event handling with RxJS integration
- **Zero Configuration** - Convention-based registration and resolution

## Installation
```bash
npm install @mikeseghers/hydra
```

Or include directly in HTML:
```html
<script src="hydra.umd.js"></script>
```

## Quick Start
```typescript
import { Hydra, service } from '@mikeseghers/hydra';

// Define a service
class DataService {
  fetchData() {
    return fetch('/api/data').then(r => r.json());
  }
}

// Define a page entry
class MyPage {
  constructor(private dataService: DataService) {}
  
  async load() {
    const data = await this.dataService.fetchData();
    console.log('Loaded:', data);
  }
}

// Register and boot
Hydra.registerContext({
  register: (hydra) => {
    hydra.registerService(DataService);
    hydra.registerPageEntry(MyPage, [service(DataService)]);
  }
});
```

## Core Concepts

### Services

Services are singleton instances that provide shared functionality across your application.
```typescript
class AuthService {
  private token: string | null = null;
  
  login(username: string, password: string) {
    // Authentication logic
  }
  
  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

// Register
hydra.registerService(AuthService);

// Retrieve
const auth = hydra.getServiceInstance(AuthService);
```

### Components

Components are reusable UI elements with their own DOM structure and behavior.
```typescript
import { AbstractComponent } from '@mikeseghers/hydra';

interface ButtonElements {
  button: HTMLButtonElement;
}

class MyButton extends AbstractComponent<HTMLDivElement, ButtonElements> {
  constructor(rootElement: HTMLDivElement, elements: ButtonElements) {
    super(rootElement, elements);
    this.elements.button.addEventListener('click', () => this.handleClick());
  }
  
  private handleClick() {
    console.log('Button clicked!');
  }
  
  destroy() {
    // Cleanup
  }
}
```

### Page Parts

Page parts are components that can emit and listen to typed events.
```typescript
interface CounterEvents {
  increment: { count: number };
  decrement: { count: number };
}

class Counter implements PagePart<CounterEvents> {
  private count = 0;
  
  increment() {
    this.count++;
    this.emit('increment', { count: this.count });
  }
  
  async load() {
    // Initialization logic
  }
  
  // Event system implementation
  addListener(event, listener) { /* ... */ }
  removeListener(event, listener) { /* ... */ }
  emit(event, payload) { /* ... */ }
  fromPagePartEvent(event) { /* ... */ }
}
```

### Page Entries

Page entries are top-level containers that represent a complete page or application view.
```typescript
class HomePage implements PageEntry {
  constructor(
    private authService: AuthService,
    private counter: Counter
  ) {}
  
  async load() {
    if (!this.authService.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }
    
    this.counter.addListener('increment', (payload) => {
      console.log('Count is now:', payload.count);
    });
  }
}

hydra.registerPageEntry(HomePage, [
  service(AuthService),
  pagePart(Counter)
]);
```

## Dependency Injection

### Service Dependencies
```typescript
class ApiService {
  get(url: string) { /* ... */ }
}

class UserService {
  constructor(private api: ApiService) {}
  
  getUser(id: string) {
    return this.api.get(`/users/${id}`);
  }
}

hydra.registerService(ApiService);
hydra.registerService(UserService, [service(ApiService)]);
```

### Value Dependencies
```typescript
class Config {
  constructor(private apiUrl: string) {}
}

hydra.registerService(Config, [value('https://api.example.com')]);
```

### Page Element Dependencies
```typescript
import { htmlElementDescriptor, pageElements } from '@mikeseghers/hydra';

interface MyPageElements {
  submitButton: HTMLButtonElement;
  nameInput: HTMLInputElement;
}

const elements: MyPageElements = {
  submitButton: htmlElementDescriptor('#submit', HTMLButtonElement),
  nameInput: htmlElementDescriptor('#name', HTMLInputElement)
};

class MyForm {
  constructor(private elements: PageElements<MyPageElements>) {
    this.elements.submitButton.addEventListener('click', () => {
      console.log(this.elements.nameInput.value);
    });
  }
  
  async load() {}
}

hydra.registerPageEntry(MyForm, [elements]);
```

## DOM Utilities

### Element Descriptors
```typescript
import { 
  htmlElementDescriptor, 
  htmlElementCollectionDescriptor 
} from '@mikeseghers/hydra';

// Single element
const button = htmlElementDescriptor('.btn-primary', HTMLButtonElement);

// Collection of elements
const listItems = htmlElementCollectionDescriptor('.list-item', HTMLLIElement);
```

### View Helpers
```typescript
import { 
  getFirstElementBySelector, 
  getAllElementsBySelector,
  cloneTemplateContent 
} from '@mikeseghers/hydra';

// Get single element
const header = getFirstElementBySelector('.header', HTMLElement);

// Get multiple elements
const buttons = getAllElementsBySelector('.btn', HTMLButtonElement);

// Clone template
const template = document.querySelector('#my-template') as HTMLTemplateElement;
const clone = cloneTemplateContent(template);
```

## Advanced Usage

### Sub-Contexts

Organize related registrations into contexts:
```typescript
const AuthContext = {
  register(hydra: Hydra) {
    hydra.registerService(AuthService);
    hydra.registerService(SessionService, [service(AuthService)]);
  }
};

const DataContext = {
  register(hydra: Hydra) {
    hydra.registerService(ApiService);
    hydra.registerService(CacheService);
  }
};

Hydra.registerContext(AuthContext);
Hydra.registerContext(DataContext);
```

### Named Instances

Register multiple instances of the same type:
```typescript
class Logger {
  constructor(private name: string) {}
  log(msg: string) {
    console.log(`[${this.name}] ${msg}`);
  }
}

const appLogger = new Logger('App');
const dbLogger = new Logger('Database');

hydra.registerServiceInstance(appLogger, 'app');
hydra.registerServiceInstance(dbLogger, 'database');

// Retrieve
const logger = hydra.getServiceInstance(Logger, 'app');
```

### Qualified Page Parts

Create multiple instances of the same page part with different qualifiers:
```typescript
interface ModalEvents {
  open: {};
  close: {};
}

class Modal implements PagePart<ModalEvents> {
  constructor(private options: { qualifier: string }) {}
  async load() {}
  // ...
}

hydra.registerPagePart(Modal, []);

// Use with different qualifiers
const loginModal = hydra.getPagePartInstance(
  pagePart(Modal, { qualifier: 'login' })
);

const signupModal = hydra.getPagePartInstance(
  pagePart(Modal, { qualifier: 'signup' })
);
```

## API Reference

### Hydra

**Static Methods:**
- `getInstance()` - Get the singleton Hydra instance
- `registerContext(context: HydraContext)` - Register a context

**Instance Methods:**
- `registerService(constructor, dependencies?)` - Register a service
- `registerPageEntry(constructor, dependencies)` - Register a page entry
- `registerPagePart(constructor, dependencies)` - Register a page part
- `registerComponent(component, name?)` - Register a component instance
- `registerServiceInstance(service, name?)` - Register a service instance
- `registerComponentInstance(component, name?)` - Register a component instance
- `getServiceInstance(type, name?)` - Retrieve a service
- `getComponentInstance(type, name?)` - Retrieve a component
- `getPagePartInstance(definition)` - Retrieve a page part

### Dependency Functions

- `service(ServiceType)` - Inject a service
- `pagePart(PagePartType, options?)` - Inject a page part
- `value(v)` - Inject a constant value
- `pageElements(container, rootElement?, options?)` - Inject DOM elements

### Interfaces

- `Loadable` - Interface for async initialization
- `PageEntry` - Top-level page container
- `PagePart<EventType>` - Component with event system
- `Component<RootElement, Elements>` - UI component
- `BaseComponent` - Base component interface

## Browser Support

Hydra requires:
- ES6+ JavaScript features
- TypeScript 4.0+ (for development)
- Modern browsers (Chrome, Firefox, Safari, Edge)

## Dependencies

- **RxJS** (^7.0.0) - For reactive event handling

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.