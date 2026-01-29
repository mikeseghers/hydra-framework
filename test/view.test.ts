import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFirstElementBySelector,
  getAllElementsBySelector,
  getElementById,
  getOptionalElementById,
  getFirstElementByClassName,
  getFirstElementByTagName,
  getFirstElementByName,
  cloneTemplateContent,
  getAncestorElementByType,
  getAncestorElementByClassName
} from '../src/View';
import { htmlElementDescriptor } from '../src/Hydra';

/**
 * View Utility Tests
 *
 * The View module provides type-safe DOM utility functions for selecting
 * and manipulating elements. These utilities ensure that selected elements
 * are of the expected type, throwing helpful errors when elements are
 * missing or have unexpected types.
 *
 * Key features:
 * - Type-safe element selection (selector, id, class, tag, name)
 * - Element collections
 * - Template cloning with element mapping
 * - Ancestor traversal
 */
describe('View Utilities', () => {

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * Example 1: Selecting Elements by CSS Selector
   *
   * getFirstElementBySelector finds the first element matching a CSS
   * selector and verifies it's the expected type. This is the most
   * flexible selection method.
   */
  describe('getFirstElementBySelector', () => {

    it('should select an element by CSS selector with type checking', () => {
      document.body.innerHTML = `
        <div class="container">
          <button id="submit-btn" class="primary">Submit</button>
          <input type="text" class="input-field" />
        </div>
      `;

      // Select button by ID selector
      const button = getFirstElementBySelector('#submit-btn', HTMLButtonElement);
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button.textContent).toBe('Submit');

      // Select input by class selector
      const input = getFirstElementBySelector('.input-field', HTMLInputElement);
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect(input.type).toBe('text');

      // Select by compound selector
      const primaryBtn = getFirstElementBySelector('button.primary', HTMLButtonElement);
      expect(primaryBtn.classList.contains('primary')).toBe(true);
    });

    it('should scope selection to a root element', () => {
      document.body.innerHTML = `
        <div id="form-1">
          <input class="email" value="form1@example.com" />
        </div>
        <div id="form-2">
          <input class="email" value="form2@example.com" />
        </div>
      `;

      const form2 = document.getElementById('form-2')!;

      // Select within form-2 only
      const email = getFirstElementBySelector('.email', HTMLInputElement, form2);
      expect(email.value).toBe('form2@example.com');
    });

    it('should throw when element is not found', () => {
      document.body.innerHTML = '<div>No buttons here</div>';

      expect(() => {
        getFirstElementBySelector('#missing-button', HTMLButtonElement);
      }).toThrow(/Could not find an HTMLElement with selector/);
    });

    it('should throw when element is wrong type', () => {
      document.body.innerHTML = '<div id="my-div">I am a div</div>';

      expect(() => {
        getFirstElementBySelector('#my-div', HTMLButtonElement);
      }).toThrow(/Could not find an HTMLElement with selector #my-div of type HTMLButtonElement/);
    });
  });

  /**
   * Example 2: Selecting Multiple Elements
   *
   * getAllElementsBySelector returns all elements matching a selector,
   * with type checking for each element.
   */
  describe('getAllElementsBySelector', () => {

    it('should select all matching elements', () => {
      document.body.innerHTML = `
        <ul>
          <li class="item">Item 1</li>
          <li class="item">Item 2</li>
          <li class="item">Item 3</li>
        </ul>
      `;

      const items = getAllElementsBySelector('.item', HTMLLIElement);

      expect(items).toHaveLength(3);
      expect(items[0].textContent).toBe('Item 1');
      expect(items[1].textContent).toBe('Item 2');
      expect(items[2].textContent).toBe('Item 3');
    });

    it('should return empty array when no matches', () => {
      document.body.innerHTML = '<div>No items</div>';

      const items = getAllElementsBySelector('.item', HTMLLIElement);
      expect(items).toEqual([]);
    });

    it('should scope to root element', () => {
      document.body.innerHTML = `
        <div id="list-a">
          <span class="tag">A1</span>
          <span class="tag">A2</span>
        </div>
        <div id="list-b">
          <span class="tag">B1</span>
        </div>
      `;

      const listA = document.getElementById('list-a')!;
      const tags = getAllElementsBySelector('.tag', HTMLSpanElement, listA);

      expect(tags).toHaveLength(2);
      expect(tags[0].textContent).toBe('A1');
    });

    it('should throw if any element is wrong type', () => {
      document.body.innerHTML = `
        <div class="item">Div item</div>
        <span class="item">Span item</span>
      `;

      expect(() => {
        getAllElementsBySelector('.item', HTMLDivElement);
      }).toThrow(); // Span is not HTMLDivElement
    });
  });

  /**
   * Example 3: Selecting by ID
   *
   * getElementById and getOptionalElementById provide ID-based selection.
   * Use the optional variant when the element might not exist.
   */
  describe('getElementById / getOptionalElementById', () => {

    it('should select element by ID', () => {
      document.body.innerHTML = '<form id="login-form"><input /></form>';

      const form = getElementById('login-form', HTMLFormElement);

      expect(form).toBeInstanceOf(HTMLFormElement);
      expect(form.id).toBe('login-form');
    });

    it('should throw when ID not found', () => {
      document.body.innerHTML = '<div>No form here</div>';

      expect(() => {
        getElementById('missing-form', HTMLFormElement);
      }).toThrow(/Could not find an HTMLElement with id missing-form/);
    });

    it('should return undefined for missing optional element', () => {
      document.body.innerHTML = '<div>No form here</div>';

      const form = getOptionalElementById('optional-form', HTMLFormElement);
      expect(form).toBeUndefined();
    });

    it('should return element when optional element exists', () => {
      document.body.innerHTML = '<form id="optional-form"></form>';

      const form = getOptionalElementById('optional-form', HTMLFormElement);
      expect(form).toBeInstanceOf(HTMLFormElement);
    });

    it('should throw if optional element exists but is wrong type', () => {
      document.body.innerHTML = '<div id="not-a-form">I am a div</div>';

      expect(() => {
        getOptionalElementById('not-a-form', HTMLFormElement);
      }).toThrow(/is not of type HTMLFormElement/);
    });
  });

  /**
   * Example 4: Selecting by Class Name
   *
   * getFirstElementByClassName selects the first element with a given class.
   */
  describe('getFirstElementByClassName', () => {

    it('should select first element with class', () => {
      document.body.innerHTML = `
        <div class="card">Card 1</div>
        <div class="card">Card 2</div>
      `;

      const card = getFirstElementByClassName('card', HTMLDivElement);

      expect(card.textContent).toBe('Card 1');
    });

    it('should scope to root element', () => {
      document.body.innerHTML = `
        <section id="featured">
          <article class="post">Featured Post</article>
        </section>
        <section id="archive">
          <article class="post">Archive Post</article>
        </section>
      `;

      const archive = document.getElementById('archive')!;
      const post = getFirstElementByClassName('post', HTMLElement, archive);

      expect(post.textContent).toBe('Archive Post');
    });

    it('should throw when class not found', () => {
      document.body.innerHTML = '<div>No cards</div>';

      expect(() => {
        getFirstElementByClassName('card', HTMLDivElement);
      }).toThrow(/Could not find an HTMLElement by className card/);
    });
  });

  /**
   * Example 5: Selecting by Tag Name
   *
   * getFirstElementByTagName selects the first element with a given HTML tag.
   */
  describe('getFirstElementByTagName', () => {

    it('should select first element with tag', () => {
      document.body.innerHTML = `
        <header>Header</header>
        <main>Main Content</main>
        <footer>Footer</footer>
      `;

      const main = getFirstElementByTagName('main', HTMLElement);
      expect(main.textContent).toBe('Main Content');
    });

    it('should throw when tag not found', () => {
      document.body.innerHTML = '<div>No nav here</div>';

      expect(() => {
        getFirstElementByTagName('nav', HTMLElement);
      }).toThrow(/Could not find an HTMLElement with tagName nav/);
    });
  });

  /**
   * Example 6: Selecting by Name Attribute
   *
   * getFirstElementByName selects elements by their name attribute,
   * commonly used for form inputs.
   */
  describe('getFirstElementByName', () => {

    it('should select element by name attribute', () => {
      document.body.innerHTML = `
        <form>
          <input name="username" type="text" value="john" />
          <input name="password" type="password" />
        </form>
      `;

      const username = getFirstElementByName('username', HTMLInputElement);

      expect(username.value).toBe('john');
      expect(username.type).toBe('text');
    });

    it('should throw when name not found', () => {
      document.body.innerHTML = '<input name="email" />';

      expect(() => {
        getFirstElementByName('phone', HTMLInputElement);
      }).toThrow(/is not of type/);
    });
  });

  /**
   * Example 7: Cloning Templates
   *
   * cloneTemplateContent clones an HTML template and resolves element
   * descriptors within the cloned content. This is useful for creating
   * component instances from templates.
   */
  describe('cloneTemplateContent', () => {

    it('should clone template and resolve elements', () => {
      document.body.innerHTML = `
        <template id="card-template">
          <article class="card">
            <h2 class="card-title">Title</h2>
            <p class="card-body">Body text</p>
            <button class="card-action">Action</button>
          </article>
        </template>
      `;

      const elementDescriptors = {
        title: htmlElementDescriptor('.card-title', HTMLHeadingElement),
        body: htmlElementDescriptor('.card-body', HTMLParagraphElement),
        action: htmlElementDescriptor('.card-action', HTMLButtonElement)
      };

      const { rootElement, templateElements } = cloneTemplateContent(
        'card-template',
        HTMLElement,
        elementDescriptors
      );

      // Root element is the cloned article
      expect(rootElement.classList.contains('card')).toBe(true);

      // Elements are resolved from the clone
      expect(templateElements.title.textContent).toBe('Title');
      expect(templateElements.body.textContent).toBe('Body text');
      expect(templateElements.action.textContent).toBe('Action');

      // Modifying clone doesn't affect template
      templateElements.title.textContent = 'New Title';
      const template = document.getElementById('card-template') as HTMLTemplateElement;
      const originalTitle = template.content.querySelector('.card-title');
      expect(originalTitle?.textContent).toBe('Title');
    });

    it('should accept template element directly', () => {
      document.body.innerHTML = `
        <template id="my-template">
          <div class="wrapper">
            <span class="content">Hello</span>
          </div>
        </template>
      `;

      const template = document.getElementById('my-template') as HTMLTemplateElement;
      const descriptors = {
        content: htmlElementDescriptor('.content', HTMLSpanElement)
      };

      const { rootElement, templateElements } = cloneTemplateContent(
        template,
        HTMLDivElement,
        descriptors
      );

      expect(rootElement).toBeInstanceOf(HTMLDivElement);
      expect(templateElements.content.textContent).toBe('Hello');
    });

    it('should allow creating multiple instances from same template', () => {
      document.body.innerHTML = `
        <template id="list-item-template">
          <li class="list-item">
            <span class="text"></span>
          </li>
        </template>
        <ul id="list"></ul>
      `;

      const descriptors = {
        text: htmlElementDescriptor('.text', HTMLSpanElement)
      };

      const items = ['Apple', 'Banana', 'Cherry'];
      const list = document.getElementById('list')!;

      items.forEach(item => {
        const { rootElement, templateElements } = cloneTemplateContent(
          'list-item-template',
          HTMLLIElement,
          descriptors
        );
        templateElements.text.textContent = item;
        list.appendChild(rootElement);
      });

      expect(list.children).toHaveLength(3);
      expect(list.children[0].querySelector('.text')?.textContent).toBe('Apple');
      expect(list.children[1].querySelector('.text')?.textContent).toBe('Banana');
      expect(list.children[2].querySelector('.text')?.textContent).toBe('Cherry');
    });
  });

  /**
   * Example 8: Traversing Ancestors
   *
   * getAncestorElementByType walks up the DOM tree to find an ancestor
   * of a specific type. Useful for finding parent components.
   */
  describe('getAncestorElementByType', () => {

    it('should find ancestor by type', () => {
      document.body.innerHTML = `
        <form id="my-form">
          <fieldset>
            <div class="field-wrapper">
              <input id="my-input" type="text" />
            </div>
          </fieldset>
        </form>
      `;

      const input = document.getElementById('my-input')!;
      const form = getAncestorElementByType(input, HTMLFormElement);

      expect(form).toBeInstanceOf(HTMLFormElement);
      expect(form?.id).toBe('my-form');
    });

    it('should return undefined when ancestor not found', () => {
      document.body.innerHTML = `
        <div>
          <span id="orphan">No form ancestor</span>
        </div>
      `;

      const span = document.getElementById('orphan')!;
      const form = getAncestorElementByType(span, HTMLFormElement);

      expect(form).toBeUndefined();
    });

    it('should find immediate parent', () => {
      document.body.innerHTML = `
        <ul id="parent-list">
          <li id="child-item">Item</li>
        </ul>
      `;

      const item = document.getElementById('child-item')!;
      const list = getAncestorElementByType(item, HTMLUListElement);

      expect(list?.id).toBe('parent-list');
    });
  });

  /**
   * Example 9: Finding Ancestor by Class Name
   *
   * getAncestorElementByClassName finds an ancestor with a specific class.
   * Useful for finding component boundaries.
   */
  describe('getAncestorElementByClassName', () => {

    it('should find ancestor by class name', () => {
      document.body.innerHTML = `
        <div class="modal" id="settings-modal">
          <div class="modal-content">
            <div class="modal-body">
              <button id="save-btn">Save</button>
            </div>
          </div>
        </div>
      `;

      const button = document.getElementById('save-btn')!;
      const modal = getAncestorElementByClassName('modal', button, HTMLDivElement);

      expect(modal?.id).toBe('settings-modal');
    });

    it('should return undefined when ancestor class not found', () => {
      document.body.innerHTML = `
        <div class="container">
          <button id="btn">Click</button>
        </div>
      `;

      const button = document.getElementById('btn')!;
      const modal = getAncestorElementByClassName('modal', button, HTMLDivElement);

      expect(modal).toBeUndefined();
    });

    it('should skip ancestors without the class', () => {
      document.body.innerHTML = `
        <div class="wrapper outer">
          <div class="inner">
            <div class="wrapper inner">
              <span id="deep">Deep element</span>
            </div>
          </div>
        </div>
      `;

      const span = document.getElementById('deep')!;

      // Should find the inner wrapper first
      const innerWrapper = getAncestorElementByClassName('wrapper', span, HTMLDivElement);
      expect(innerWrapper?.classList.contains('inner')).toBe(true);
    });
  });

  /**
   * Example 10: Real-World Pattern - Form Handling
   *
   * Combining View utilities for a typical form handling scenario.
   */
  it('should demonstrate real-world form handling', () => {
    document.body.innerHTML = `
      <form id="contact-form">
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" class="form-control" />
          <span class="error-message"></span>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" class="form-control" />
          <span class="error-message"></span>
        </div>
        <button type="submit" class="btn-submit">Send</button>
      </form>
    `;

    // Get the form
    const form = getElementById('contact-form', HTMLFormElement);

    // Get all inputs by class
    const inputs = getAllElementsBySelector('.form-control', HTMLInputElement, form);
    expect(inputs).toHaveLength(2);

    // Get specific inputs by name
    const nameInput = getFirstElementByName('name', HTMLInputElement, form);
    const emailInput = getFirstElementByName('email', HTMLInputElement, form);

    // Simulate user input
    nameInput.value = 'John Doe';
    emailInput.value = 'john@example.com';

    // Find error message for email input using ancestor traversal
    const emailGroup = getAncestorElementByClassName('form-group', emailInput, HTMLDivElement);
    const errorMessage = getFirstElementBySelector('.error-message', HTMLSpanElement, emailGroup!);

    // Show validation error
    errorMessage.textContent = 'Please enter a valid email';

    expect(errorMessage.textContent).toBe('Please enter a valid email');
  });
});
