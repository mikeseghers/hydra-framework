/**
 * Data attribute names used by Hydra for auto-discovery.
 */
export const HYDRA_DATA_ATTRIBUTES = {
  /** Marks an element as the root of a PagePart. Value is the PagePart class name. */
  PAGE_PART: 'data-hydra-pagepart',
  /** Marks an element within a PagePart. Value is the property name in the elements container. */
  ELEMENT: 'data-hydra-element',
  /** Marks an element as the root of a Component. Value is the Component class name. */
  COMPONENT: 'data-hydra-component',
  /** Optional qualifier for PagePart instances. */
  QUALIFIER: 'data-hydra-qualifier'
} as const;

/**
 * Result of auto-discovering elements for a PagePart.
 */
export interface DiscoveredPagePart {
  /** The PagePart class name */
  name: string;
  /** Optional qualifier for multiple instances */
  qualifier?: string;
  /** The root element marked with data-hydra-pagepart */
  rootElement: HTMLElement;
  /** Discovered child elements mapped by property name */
  elements: Record<string, HTMLElement | HTMLElement[]>;
}

/**
 * Auto-discovers all PageParts marked with data-hydra-pagepart in the DOM.
 *
 * @param root - The root element to search within (defaults to document)
 * @returns Array of discovered PagePart information
 *
 * @example
 * ```html
 * <div data-hydra-pagepart="NotificationPart">
 *   <div data-hydra-element="container"></div>
 * </div>
 * ```
 *
 * ```typescript
 * const parts = discoverPageParts(document);
 * // [{ name: 'NotificationPart', rootElement: div, elements: { container: div } }]
 * ```
 */
export function discoverPageParts(root: Document | Element = document): DiscoveredPagePart[] {
  const pagePartRoots = root.querySelectorAll(`[${HYDRA_DATA_ATTRIBUTES.PAGE_PART}]`);
  const discovered: DiscoveredPagePart[] = [];

  pagePartRoots.forEach((rootElement) => {
    if (!(rootElement instanceof HTMLElement)) return;

    const name = rootElement.getAttribute(HYDRA_DATA_ATTRIBUTES.PAGE_PART);
    if (!name) return;

    const qualifier = rootElement.getAttribute(HYDRA_DATA_ATTRIBUTES.QUALIFIER) ?? undefined;
    const elements: Record<string, HTMLElement | HTMLElement[]> = {};

    // Find all elements within this PagePart root
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
 * @param context - Optional context for error messages (e.g., "NotificationPart.container")
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
 * Type-safe helper to get and validate elements from a discovered PagePart.
 * Combines discovery lookup with type assertion.
 *
 * @param discovered - Array from discoverPageParts()
 * @param pagePartName - The PagePart class name to find
 * @param qualifier - Optional qualifier for multiple instances
 * @returns The discovered PagePart or undefined
 *
 * @example
 * ```typescript
 * const discovered = discoverPageParts(document);
 * const notification = findPagePart(discovered, 'NotificationPart');
 * if (notification) {
 *   const container = assertElementType(notification.elements.container, HTMLDivElement);
 * }
 * ```
 */
export function findPagePart(
  discovered: DiscoveredPagePart[],
  pagePartName: string,
  qualifier?: string
): DiscoveredPagePart | undefined {
  return discovered.find(
    (p) => p.name === pagePartName && (qualifier === undefined || p.qualifier === qualifier)
  );
}
