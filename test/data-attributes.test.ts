import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  HYDRA_DATA_ATTRIBUTES,
  discoverMediators,
  findMediator,
  assertElementType,
  assertElementTypes
} from '../src/DataAttributes';

describe('DataAttributes', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('HYDRA_DATA_ATTRIBUTES', () => {
    it('should define correct attribute names', () => {
      expect(HYDRA_DATA_ATTRIBUTES.MEDIATOR).toBe('data-hydra-mediator');
      expect(HYDRA_DATA_ATTRIBUTES.ELEMENT).toBe('data-hydra-element');
      expect(HYDRA_DATA_ATTRIBUTES.COMPONENT).toBe('data-hydra-component');
      expect(HYDRA_DATA_ATTRIBUTES.QUALIFIER).toBe('data-hydra-qualifier');
    });
  });

  describe('discoverMediators()', () => {
    it('should discover a Mediator with elements', () => {
      container.innerHTML = `
        <div data-hydra-mediator="NotificationPart">
          <div data-hydra-element="container" id="inner"></div>
        </div>
      `;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].name).toBe('NotificationPart');
      expect(discovered[0].qualifier).toBeUndefined();
      expect(discovered[0].elements.container).toBeInstanceOf(HTMLDivElement);
      expect((discovered[0].elements.container as HTMLElement).id).toBe('inner');
    });

    it('should discover Mediator with qualifier', () => {
      container.innerHTML = `
        <div data-hydra-mediator="FormPart" data-hydra-qualifier="login">
          <input data-hydra-element="input" type="text">
        </div>
      `;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].name).toBe('FormPart');
      expect(discovered[0].qualifier).toBe('login');
    });

    it('should discover multiple Mediators', () => {
      container.innerHTML = `
        <div data-hydra-mediator="HeaderPart">
          <button data-hydra-element="menuButton"></button>
        </div>
        <div data-hydra-mediator="FooterPart">
          <a data-hydra-element="link"></a>
        </div>
      `;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(2);
      expect(discovered[0].name).toBe('HeaderPart');
      expect(discovered[1].name).toBe('FooterPart');
    });

    it('should collect multiple elements with same property name as array', () => {
      container.innerHTML = `
        <div data-hydra-mediator="ListPart">
          <li data-hydra-element="items">Item 1</li>
          <li data-hydra-element="items">Item 2</li>
          <li data-hydra-element="items">Item 3</li>
        </div>
      `;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(1);
      expect(Array.isArray(discovered[0].elements.items)).toBe(true);
      expect((discovered[0].elements.items as HTMLElement[]).length).toBe(3);
    });

    it('should include root element if it has element attribute', () => {
      container.innerHTML = `
        <div data-hydra-mediator="SimplePart" data-hydra-element="root"></div>
      `;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(1);
      expect(discovered[0].elements.root).toBe(discovered[0].rootElement);
    });

    it('should return empty array when no Mediators found', () => {
      container.innerHTML = `<div>No Mediators here</div>`;

      const discovered = discoverMediators(container);

      expect(discovered).toHaveLength(0);
    });
  });

  describe('findMediator()', () => {
    it('should find Mediator by name', () => {
      container.innerHTML = `
        <div data-hydra-mediator="HeaderPart"></div>
        <div data-hydra-mediator="FooterPart"></div>
      `;

      const discovered = discoverMediators(container);
      const footer = findMediator(discovered, 'FooterPart');

      expect(footer).toBeDefined();
      expect(footer?.name).toBe('FooterPart');
    });

    it('should find Mediator by name and qualifier', () => {
      container.innerHTML = `
        <div data-hydra-mediator="FormPart" data-hydra-qualifier="login"></div>
        <div data-hydra-mediator="FormPart" data-hydra-qualifier="signup"></div>
      `;

      const discovered = discoverMediators(container);
      const signup = findMediator(discovered, 'FormPart', 'signup');

      expect(signup).toBeDefined();
      expect(signup?.qualifier).toBe('signup');
    });

    it('should return undefined when not found', () => {
      container.innerHTML = `<div data-hydra-mediator="HeaderPart"></div>`;

      const discovered = discoverMediators(container);
      const result = findMediator(discovered, 'NonExistent');

      expect(result).toBeUndefined();
    });
  });

  describe('assertElementType()', () => {
    it('should return element when type matches', () => {
      const div = document.createElement('div');

      const result = assertElementType(div, HTMLDivElement);

      expect(result).toBe(div);
    });

    it('should throw when element is undefined', () => {
      expect(() => assertElementType(undefined, HTMLDivElement, 'container')).toThrow(
        'Element "container" is undefined'
      );
    });

    it('should throw when element is array', () => {
      const elements = [document.createElement('div')];

      expect(() => assertElementType(elements, HTMLDivElement, 'container')).toThrow(
        'Element "container" is an array but expected single element'
      );
    });

    it('should throw when type does not match', () => {
      const span = document.createElement('span');

      expect(() => assertElementType(span, HTMLDivElement, 'container')).toThrow(
        'Element "container" has wrong type. Expected HTMLDivElement'
      );
    });
  });

  describe('assertElementTypes()', () => {
    it('should return array when types match', () => {
      const items = [document.createElement('li'), document.createElement('li')];

      const result = assertElementTypes(items, HTMLLIElement);

      expect(result).toHaveLength(2);
      expect(result).toEqual(items);
    });

    it('should convert single element to array', () => {
      const item = document.createElement('li');

      const result = assertElementTypes(item, HTMLLIElement);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(item);
    });

    it('should throw when elements undefined', () => {
      expect(() => assertElementTypes(undefined, HTMLLIElement, 'items')).toThrow(
        'Elements "items" is undefined'
      );
    });

    it('should throw when any element has wrong type', () => {
      const items = [document.createElement('li'), document.createElement('div')];

      expect(() => assertElementTypes(items, HTMLLIElement, 'items')).toThrow(
        'Element in "items" collection has wrong type'
      );
    });
  });

  describe('Integration: Full discovery and validation flow', () => {
    it('should discover and validate Mediator elements', () => {
      // Setup DOM with data attributes
      container.innerHTML = `
        <div data-hydra-mediator="NotificationPart">
          <div data-hydra-element="container">
            <h2 data-hydra-element="title">Notifications</h2>
            <button data-hydra-element="closeButton">X</button>
            <p data-hydra-element="messages">Message 1</p>
            <p data-hydra-element="messages">Message 2</p>
          </div>
        </div>
      `;

      // Step 1: Discover
      const discovered = discoverMediators(container);
      expect(discovered).toHaveLength(1);

      // Step 2: Find specific Mediator
      const notificationPart = findMediator(discovered, 'NotificationPart');
      expect(notificationPart).toBeDefined();

      // Step 3: Validate and type elements
      const elements = notificationPart!.elements;

      const containerEl = assertElementType(elements.container, HTMLDivElement, 'container');
      expect(containerEl).toBeInstanceOf(HTMLDivElement);

      const title = assertElementType(elements.title, HTMLHeadingElement, 'title');
      expect(title).toBeInstanceOf(HTMLHeadingElement);

      const closeButton = assertElementType(elements.closeButton, HTMLButtonElement, 'closeButton');
      expect(closeButton).toBeInstanceOf(HTMLButtonElement);

      const messages = assertElementTypes(elements.messages, HTMLParagraphElement, 'messages');
      expect(messages).toHaveLength(2);
      expect(messages[0]).toBeInstanceOf(HTMLParagraphElement);
    });

    it('should work with multiple qualified Mediators', () => {
      container.innerHTML = `
        <div data-hydra-mediator="FormPart" data-hydra-qualifier="login">
          <input data-hydra-element="emailInput" type="email">
          <input data-hydra-element="passwordInput" type="password">
          <button data-hydra-element="submitButton">Login</button>
        </div>
        <div data-hydra-mediator="FormPart" data-hydra-qualifier="signup">
          <input data-hydra-element="emailInput" type="email">
          <input data-hydra-element="passwordInput" type="password">
          <input data-hydra-element="confirmInput" type="password">
          <button data-hydra-element="submitButton">Sign Up</button>
        </div>
      `;

      const discovered = discoverMediators(container);
      expect(discovered).toHaveLength(2);

      // Get login form
      const loginForm = findMediator(discovered, 'FormPart', 'login');
      expect(loginForm).toBeDefined();
      const loginSubmit = assertElementType(loginForm!.elements.submitButton, HTMLButtonElement);
      expect(loginSubmit.textContent).toBe('Login');

      // Get signup form
      const signupForm = findMediator(discovered, 'FormPart', 'signup');
      expect(signupForm).toBeDefined();
      const signupSubmit = assertElementType(signupForm!.elements.submitButton, HTMLButtonElement);
      expect(signupSubmit.textContent).toBe('Sign Up');

      // Signup has extra field
      expect(signupForm!.elements.confirmInput).toBeDefined();
      expect(loginForm!.elements.confirmInput).toBeUndefined();
    });
  });
});
