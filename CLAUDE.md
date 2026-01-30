# Hydra Framework

Lightweight TypeScript dependency injection and component management framework for web applications. Provides structured, maintainable client-side development without heavy framework overhead.

**Package:** `@mikeseghers/hydra` | **Dependencies:** RxJS ^7.0.0 | **Build:** Vite + TypeScript | **Tests:** Vitest

## Project Structure

```
src/
├── Hydra.ts              # Main singleton DI container
├── AbstractMediator.ts   # Base class for Mediators (with events)
├── AbstractComponent.ts  # Base class for Components
├── DataAttributes.ts     # Element schema API & discovery
├── View.ts               # DOM element querying utilities
└── index.ts              # Main export barrel

examples/notes-app/       # Complete example application
test/                     # Test suite
```

## Core Concepts

### 1. Services
Singleton business logic. No special base class required.
```typescript
hydra.registerService(NoteService);
```

### 2. Mediators
Event-capable components for cross-cutting concerns (notifications, state, dialogs).
- Extend `AbstractMediator<EventType>` with typed event interface
- Emit events: `this.emit(eventName, payload)`
- Listen: `mediator.addListener('shown', cb)` or `mediator.fromEvent('shown').subscribe()`
```typescript
hydra.registerMediator(NotificationMediator, [NotificationElements]);
```

### 3. PageControllers
Top-level page coordinators. Implement `PageController` interface.
```typescript
hydra.registerPageController(NotesPage, [
  service(NoteService),
  mediator(NotificationMediator)
]);
```

### 4. Components
Reusable UI elements. Extend `AbstractComponent<RootElement, ElementContainer>`.
Support parent-child hierarchies via `addSubComponent()`.

### 5. Element Schemas (Unified API)
Define expected DOM elements with type safety:
```typescript
export const FormElements = elements({
  // CSS selector-based
  form: selector('form.contact', HTMLFormElement),
  submitBtn: selector('#submit', HTMLButtonElement),

  // Data attribute-based (data-hydra-element="errorMsg")
  errorMsg: HTMLSpanElement,
  successMsg: HTMLSpanElement,

  // Collections
  items: collection(HTMLLIElement),
  allInputs: selectorAll('input', HTMLInputElement)
});

type Elements = ElementsOf<typeof FormElements>;
```

## Naming Conventions

- **Services:** `{Domain}Service` (NoteService, ApiService)
- **Mediators:** `{Feature}Mediator` (NotificationMediator, AppStateMediator)
- **Components:** `{Feature}Component` (NoteListComponent)
- **PageControllers:** `{Page}Page` (NotesPage, HomePage)
- **Element schemas:** `{Feature}Elements.ts`
- **Private fields:** ES2022 `#privateField`
- **Event names:** Past tense camelCase (noteCreated, itemAdded)

## File Organization

```
src/
├── services/     # Business logic (no UI)
├── mediators/    # Event-capable components
├── elements/     # Element schema definitions
├── components/   # Reusable UI components
├── pages/        # Page controllers
├── contexts/     # HydraContext definitions
└── model/        # Data models and types
```

## Bootstrap Pattern

```typescript
// main.ts
import { Hydra } from '@mikeseghers/hydra';
import { AppContext } from './contexts/AppContext';

Hydra.registerContext(AppContext);
Hydra.getInstance(); // Hooks into window.onload
```

```typescript
// AppContext.ts
export const AppContext: HydraContext = {
  register(hydra: Hydra): void {
    hydra.registerService(NoteService);
    hydra.registerMediator(NotificationMediator, [NotificationElements]);
    hydra.registerPageController(NotesPage, [
      service(NoteService),
      mediator(NotificationMediator)
    ]);
  }
};
```

## Lifecycle Order

1. Register all contexts
2. `Hydra.getInstance()` sets up `window.onload`
3. On load: construct services → mediators → page controllers
4. Call `load()` on all (supports async)

## Data Attribute Discovery

```html
<div data-hydra-mediator="NotificationMediator">
  <span data-hydra-element="message"></span>
  <button data-hydra-element="closeBtn"></button>
</div>

<!-- Multiple instances with qualifier -->
<div data-hydra-mediator="FormMediator" data-hydra-qualifier="login">
  <input data-hydra-element="username" />
</div>
```

## Key APIs

```typescript
// Dependencies
service(ServiceClass)
mediator(MediatorClass, { qualifier?: string })
value(constantValue)

// Element schemas
elements(schema)
selector(css, ElementType)
selectorAll(css, ElementType)
collection(ElementType)

// Components
constructComponent(ComponentClass, selector, ElementType, elementDescriptors)
cloneTemplateContent(templateSelector, ElementType, elementDescriptors)

// Discovery
discoverMediators(root?)
findMediator(discovered, name, qualifier?)
```

## Testing

```bash
npm test          # Watch mode
npm run test:run  # Run once
```

Reset Hydra singleton in tests:
```typescript
beforeEach(() => {
  if ((window as any).hydra) delete (window as any).hydra;
  document.body.innerHTML = '';
});
```

## Build

```bash
npm run build     # Build + type declarations
npm run dev       # Watch mode
```

Output: `dist/hydra.es.js` (ESM), `dist/hydra.umd.js` (UMD), `dist/index.d.ts`
