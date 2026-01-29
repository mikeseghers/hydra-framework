/**
 * Data attribute names used by Hydra for auto-discovery.
 *
 */
export const HYDRA_DATA_ATTRIBUTES = {
  /** Marks an element as the root of a Mediator. Value is the Mediator class name. */
  MEDIATOR: 'data-hydra-mediator',
  /** Marks an element within a Mediator. Value is the property name in the elements container. */
  ELEMENT: 'data-hydra-element',
  /** Marks an element as the root of a Component. Value is the Component class name. */
  COMPONENT: 'data-hydra-component',
  /** Optional qualifier for Mediator instances. */
  QUALIFIER: 'data-hydra-qualifier'
} as const;

/**
 * Result of auto-discovering elements for a Mediator.
 */
export interface DiscoveredMediator {
  /** The Mediator class name */
  name: string;
  /** Optional qualifier for multiple instances */
  qualifier?: string;
  /** The root element marked with data-hydra-mediator */
  rootElement: HTMLElement;
  /** Discovered child elements mapped by property name */
  elements: Record<string, HTMLElement | HTMLElement[]>;
}

/**
 * Auto-discovers all Mediators marked with data-hydra-mediator in the DOM.
 *
 * @param root - The root element to search within (defaults to document)
 * @returns Array of discovered Mediator information
 *
 * @example
 * ```html
 * <div data-hydra-mediator="NotificationMediator">
 *   <div data-hydra-element="container"></div>
 * </div>
 * ```
 *
 * ```typescript
 * const mediators = discoverMediators(document);
 * // [{ name: 'NotificationMediator', rootElement: div, elements: { container: div } }]
 * ```
 */
export function discoverMediators(root: Document | Element = document): DiscoveredMediator[] {
  const mediatorRoots = root.querySelectorAll(`[${HYDRA_DATA_ATTRIBUTES.MEDIATOR}]`);
  const discovered: DiscoveredMediator[] = [];

  mediatorRoots.forEach((rootElement) => {
    if (!(rootElement instanceof HTMLElement)) return;

    const name = rootElement.getAttribute(HYDRA_DATA_ATTRIBUTES.MEDIATOR);
    if (!name) return;

    const qualifier = rootElement.getAttribute(HYDRA_DATA_ATTRIBUTES.QUALIFIER) ?? undefined;
    const elements: Record<string, HTMLElement | HTMLElement[]> = {};

    // Find all elements within this Mediator root
    const elementNodes = rootElement.querySelectorAll(`[${HYDRA_DATA_ATTRIBUTES.ELEMENT}]`);
    elementNodes.forEach((elementNode) => {
      if (!(elementNode instanceof HTMLElement)) return;

      const propertyName = elementNode.getAttribute(HYDRA_DATA_ATTRIBUTES.ELEMENT);
      if (!propertyName) return;

      // Check if this property already exists (collection)
      if (elements[propertyName]) {
        if (Array.isArray(elements[propertyName])) {
          (elements[propertyName] as HTMLElement[]).push(elementNode);
        } else {
          elements[propertyName] = [elements[propertyName] as HTMLElement, elementNode];
        }
      } else {
        elements[propertyName] = elementNode;
      }
    });

    // If root itself has element attribute, include it
    const rootPropertyName = rootElement.getAttribute(HYDRA_DATA_ATTRIBUTES.ELEMENT);
    if (rootPropertyName && !elements[rootPropertyName]) {
      elements[rootPropertyName] = rootElement;
    }

    discovered.push({ name, qualifier, rootElement, elements });
  });

  return discovered;
}

/**
 * Asserts that an element is of the expected type.
 * Throws a descriptive error if the type doesn't match.
 *
 * @param element - The element to validate
 * @param expectedType - The expected HTMLElement subtype
 * @param context - Optional context for error messages (e.g., "NotificationMediator.container")
 * @returns The element cast to the expected type
 *
 * @example
 * ```typescript
 * const container = assertElementType(elements.container, HTMLDivElement, 'container');
 * // container is now typed as HTMLDivElement
 * ```
 */
export function assertElementType<T extends HTMLElement>(
  element: HTMLElement | HTMLElement[] | undefined,
  expectedType: new () => T,
  context?: string
): T {
  if (element === undefined) {
    throw new Error(
      `Element${context ? ` "${context}"` : ''} is undefined. ` +
        `Make sure it has data-hydra-element attribute.`
    );
  }

  if (Array.isArray(element)) {
    throw new Error(
      `Element${context ? ` "${context}"` : ''} is an array but expected single element. ` +
        `Use assertElementTypes for collections.`
    );
  }

  if (!(element instanceof expectedType)) {
    throw new Error(
      `Element${context ? ` "${context}"` : ''} has wrong type. ` +
        `Expected ${expectedType.name}, got ${element.constructor.name}.`
    );
  }

  return element;
}

/**
 * Asserts that elements in a collection are of the expected type.
 * Throws a descriptive error if any element doesn't match.
 *
 * @param elements - The elements to validate (single or array)
 * @param expectedType - The expected HTMLElement subtype
 * @param context - Optional context for error messages
 * @returns Array of elements cast to the expected type
 *
 * @example
 * ```typescript
 * const items = assertElementTypes(elements.items, HTMLLIElement, 'items');
 * // items is now typed as HTMLLIElement[]
 * ```
 */
export function assertElementTypes<T extends HTMLElement>(
  elements: HTMLElement | HTMLElement[] | undefined,
  expectedType: new () => T,
  context?: string
): T[] {
  if (elements === undefined) {
    throw new Error(
      `Elements${context ? ` "${context}"` : ''} is undefined. ` +
        `Make sure they have data-hydra-element attributes.`
    );
  }

  const array = Array.isArray(elements) ? elements : [elements];

  for (const el of array) {
    if (!(el instanceof expectedType)) {
      throw new Error(
        `Element in${context ? ` "${context}"` : ''} collection has wrong type. ` +
          `Expected ${expectedType.name}, got ${el.constructor.name}.`
      );
    }
  }

  return array as T[];
}

/**
 * Type-safe helper to get and validate elements from a discovered Mediator.
 * Combines discovery lookup with type assertion.
 *
 * @param discovered - Array from discoverMediators()
 * @param mediatorName - The Mediator class name to find
 * @param qualifier - Optional qualifier for multiple instances
 * @returns The discovered Mediator or undefined
 *
 * @example
 * ```typescript
 * const discovered = discoverMediators(document);
 * const notification = findMediator(discovered, 'NotificationMediator');
 * if (notification) {
 *   const container = assertElementType(notification.elements.container, HTMLDivElement);
 * }
 * ```
 */
export function findMediator(
  discovered: DiscoveredMediator[],
  mediatorName: string,
  qualifier?: string
): DiscoveredMediator | undefined {
  return discovered.find(
    (p) => p.name === mediatorName && (qualifier === undefined || p.qualifier === qualifier)
  );
}

// ============================================================================
// Element Schema - First-class element definitions
// ============================================================================

/**
 * Element with a CSS selector for traditional DOM querying.
 */
export interface ElementWithSelector<T extends HTMLElement> {
  __selector: true;
  __collection: false;
  type: new () => T;
  selector: string;
}

/**
 * Collection of elements with a CSS selector for traditional DOM querying.
 */
export interface ElementCollectionWithSelector<T extends HTMLElement> {
  __selector: true;
  __collection: true;
  type: new () => T;
  selector: string;
}

/**
 * Creates a single element entry with a CSS selector.
 * Use this when you want to find an element via CSS selector instead of data attributes.
 *
 * @example
 * ```typescript
 * const FormElements = elements({
 *   submitBtn: selector('#submit-btn', HTMLButtonElement),
 *   email: selector('input[type="email"]', HTMLInputElement)
 * });
 * ```
 */
export function selector<T extends HTMLElement>(
  cssSelector: string,
  type: new () => T
): ElementWithSelector<T> {
  return { __selector: true, __collection: false, type, selector: cssSelector };
}

/**
 * Creates a collection entry with a CSS selector.
 * Use this when you want to find multiple elements via CSS selector.
 *
 * @example
 * ```typescript
 * const FormElements = elements({
 *   checkboxes: selectorAll('.checkbox', HTMLInputElement)
 * });
 * ```
 */
export function selectorAll<T extends HTMLElement>(
  cssSelector: string,
  type: new () => T
): ElementCollectionWithSelector<T> {
  return { __selector: true, __collection: true, type, selector: cssSelector };
}

/**
 * Marker for a collection of elements (multiple elements with same data-hydra-element name).
 */
export interface ElementCollection<T extends HTMLElement> {
  __collection: true;
  __selector?: false;
  type: new () => T;
}

/**
 * Creates a collection marker for element schemas.
 * Use this when you expect multiple elements with the same data-hydra-element name.
 *
 * @example
 * ```typescript
 * const ListElements = elements({
 *   items: collection(HTMLLIElement),  // Multiple <li> elements
 *   title: HTMLHeadingElement          // Single element
 * });
 * ```
 */
export function collection<T extends HTMLElement>(type: new () => T): ElementCollection<T> {
  return { __collection: true, type };
}

/**
 * Type for a single entry in an element schema.
 * Can be:
 * - Direct HTMLElement constructor (data attribute discovery)
 * - ElementCollection (multiple elements via data attributes)
 * - ElementWithSelector (single element via CSS selector)
 * - ElementCollectionWithSelector (multiple elements via CSS selector)
 */
export type ElementSchemaEntry<T extends HTMLElement = HTMLElement> =
  | (new () => T)
  | ElementCollection<T>
  | ElementWithSelector<T>
  | ElementCollectionWithSelector<T>;

/**
 * The schema definition passed to elements().
 */
export type ElementSchemaDefinition = Record<string, ElementSchemaEntry<any>>;

/**
 * Extracts the actual element type(s) from a schema entry.
 * - Direct constructor → single element of that type
 * - ElementCollection → array of that element type
 * - ElementWithSelector → single element of that type
 * - ElementCollectionWithSelector → array of that element type
 */
export type ElementFromSchemaEntry<E> =
  E extends ElementCollectionWithSelector<infer T>
    ? T[]
    : E extends ElementWithSelector<infer T>
      ? T
      : E extends ElementCollection<infer T>
        ? T[]
        : E extends new () => infer T
          ? T
          : never;

/**
 * Extracts the Elements type from an ElementSchema.
 * Use this to get the typed elements interface from a schema.
 *
 * @example
 * ```typescript
 * const StatusElements = elements({
 *   statusText: HTMLSpanElement,
 *   indicator: HTMLElement
 * });
 *
 * type Elements = ElementsOf<typeof StatusElements>;
 * // Results in: { statusText: HTMLSpanElement, indicator: HTMLElement }
 * ```
 */
export type ElementsOf<S extends ElementSchema<any>> = S extends ElementSchema<infer D>
  ? { [K in keyof D]: ElementFromSchemaEntry<D[K]> }
  : never;

/**
 * An element schema that defines expected elements for a Mediator.
 * Created via the elements() function.
 */
export interface ElementSchema<D extends ElementSchemaDefinition = ElementSchemaDefinition> {
  __elementSchema: true;
  definition: D;
}

/**
 * Type guard to check if a value is an ElementSchema.
 */
export function isElementSchema(value: unknown): value is ElementSchema {
  return typeof value === 'object' && value !== null && '__elementSchema' in value;
}

/**
 * Type guard to check if a schema entry uses a CSS selector.
 */
export function isElementWithSelector(
  entry: ElementSchemaEntry<any>
): entry is ElementWithSelector<any> | ElementCollectionWithSelector<any> {
  return typeof entry === 'object' && '__selector' in entry && entry.__selector === true;
}

/**
 * Type guard to check if a schema entry is a collection (data attributes or selector).
 */
export function isElementCollection(
  entry: ElementSchemaEntry<any>
): entry is ElementCollection<any> | ElementCollectionWithSelector<any> {
  return typeof entry === 'object' && '__collection' in entry && entry.__collection === true;
}

/**
 * Creates an element schema for use with Mediator registration.
 * The schema defines what elements Hydra should discover and validate
 * from data-hydra-element attributes in the DOM.
 *
 * @param definition - Object mapping property names to expected HTMLElement types
 * @returns An ElementSchema that can be used as a Mediator dependency
 *
 * @example
 * ```typescript
 * // Define the schema
 * export const StatusElements = elements({
 *   statusText: HTMLSpanElement,
 *   indicator: HTMLElement
 * });
 *
 * // Use in context registration
 * hydra.registerMediator(StatusMediator, [StatusElements]);
 *
 * // Get the type for the Mediator constructor
 * type Elements = ElementsOf<typeof StatusElements>;
 * ```
 */
export function elements<D extends ElementSchemaDefinition>(definition: D): ElementSchema<D> {
  return {
    __elementSchema: true,
    definition
  };
}

/**
 * Validates discovered elements against a schema and returns typed elements.
 * Throws descriptive errors if validation fails.
 *
 * @param discovered - Raw elements discovered from data attributes
 * @param schema - The element schema to validate against
 * @param mediatorName - Name of the mediator (for error messages)
 * @returns Validated elements object matching the schema types
 */
/**
 * Gets the element type from a schema entry.
 */
function getEntryType(entry: ElementSchemaEntry<any>): new () => HTMLElement {
  if (typeof entry === 'function') {
    return entry;
  }
  return entry.type;
}

/**
 * Validates discovered elements against a schema and returns typed elements.
 * Throws descriptive errors if validation fails.
 *
 * @param discovered - Raw elements discovered from data attributes
 * @param schema - The element schema to validate against
 * @param mediatorName - Name of the mediator (for error messages)
 * @returns Validated elements object matching the schema types
 */
export function validateElementsAgainstSchema<D extends ElementSchemaDefinition>(
  discovered: Record<string, HTMLElement | HTMLElement[]>,
  schema: ElementSchema<D>,
  mediatorName: string
): ElementsOf<ElementSchema<D>> {
  const result: Record<string, HTMLElement | HTMLElement[]> = {};

  for (const [propertyName, schemaEntry] of Object.entries(schema.definition)) {
    const element = discovered[propertyName];
    const elementType = getEntryType(schemaEntry);

    if (isElementCollection(schemaEntry)) {
      // Expect a collection
      result[propertyName] = assertElementTypes(element, elementType, `${mediatorName}.${propertyName}`);
    } else {
      // Expect a single element
      result[propertyName] = assertElementType(element, elementType, `${mediatorName}.${propertyName}`);
    }
  }

  return result as ElementsOf<ElementSchema<D>>;
}
