import { describe, it, expect, beforeEach } from 'vitest';
import { AbstractComponent } from '../src/AbstractComponent';
import { htmlElementDescriptor, pageElements, htmlElementCollectionDescriptor } from '../src/Hydra';
import { cloneTemplateContent } from '../src/View';

/**
 * SubComponent Tests
 *
 * Components can contain other components, creating a hierarchical structure.
 * This is useful for building complex UIs from reusable pieces.
 *
 * Key features:
 * - addSubComponent: Attach a child component to a parent element
 * - removeSubComponent: Detach and destroy a child component
 * - subComponentsInParentElement: Get all child components in a container
 * - Automatic component reference on DOM elements (hydraComponent)
 */
describe('SubComponents', () => {

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * Example 1: Adding SubComponents
   *
   * A parent component can add child components to designated
   * container elements. The child's rootElement is appended to
   * the parent's specified element.
   */
  it('should add subcomponents to parent element', () => {
    document.body.innerHTML = `
      <div id="list-container">
        <h2 class="title">My List</h2>
        <ul class="items"></ul>
      </div>
    `;

    // Define item component
    const itemDescriptors = {
      label: htmlElementDescriptor('.item-label', HTMLSpanElement)
    };

    class ListItemComponent extends AbstractComponent<HTMLLIElement, typeof itemDescriptors> {
      constructor(rootElement: HTMLLIElement, elements: any) {
        super(rootElement, elements);
      }
      destroy() {}
    }

    // Define list component
    const listDescriptors = {
      title: htmlElementDescriptor('.title', HTMLHeadingElement),
      items: htmlElementDescriptor('.items', HTMLUListElement)
    };

    class ListComponent extends AbstractComponent<HTMLDivElement, typeof listDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addItem(text: string): ListItemComponent {
        // Create item element
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = '<span class="item-label"></span>';

        const itemElements = pageElements(itemDescriptors, li);
        const item = new ListItemComponent(li, itemElements);
        item.elements.label.textContent = text;

        // Add as subcomponent
        this.addSubComponent(item, 'items');
        return item;
      }

      destroy() {}
    }

    // Create list component
    const container = document.querySelector('#list-container') as HTMLDivElement;
    const listElements = pageElements(listDescriptors, document);
    const list = new ListComponent(container, listElements);

    // Add items
    list.addItem('First item');
    list.addItem('Second item');
    list.addItem('Third item');

    // Verify items were added to DOM
    const itemsList = container.querySelector('.items')!;
    expect(itemsList.children).toHaveLength(3);
    expect(itemsList.children[0].querySelector('.item-label')?.textContent).toBe('First item');
    expect(itemsList.children[1].querySelector('.item-label')?.textContent).toBe('Second item');
    expect(itemsList.children[2].querySelector('.item-label')?.textContent).toBe('Third item');
  });

  /**
   * Example 2: Removing SubComponents
   *
   * SubComponents can be removed from their parent. This removes
   * the element from the DOM and calls destroy() on the component.
   */
  it('should remove subcomponents and call destroy', () => {
    document.body.innerHTML = `
      <div id="container">
        <div class="content"></div>
      </div>
    `;

    // Simple child component
    const childDescriptors = {};

    class ChildComponent extends AbstractComponent<HTMLDivElement, typeof childDescriptors> {
      public destroyed = false;

      constructor(rootElement: HTMLDivElement) {
        super(rootElement, {});
      }

      destroy() {
        this.destroyed = true;
      }
    }

    // Parent component
    const parentDescriptors = {
      content: htmlElementDescriptor('.content', HTMLDivElement)
    };

    class ParentComponent extends AbstractComponent<HTMLDivElement, typeof parentDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }
      destroy() {}
    }

    // Create parent
    const container = document.querySelector('#container') as HTMLDivElement;
    const parentElements = pageElements(parentDescriptors, document);
    const parent = new ParentComponent(container, parentElements);

    // Create and add child
    const childElement = document.createElement('div');
    childElement.className = 'child';
    childElement.textContent = 'Child content';
    const child = new ChildComponent(childElement);

    parent.addSubComponent(child, 'content');

    // Verify child is in DOM
    expect(container.querySelector('.child')).not.toBeNull();
    expect(child.destroyed).toBe(false);

    // Remove child
    parent.removeSubComponent(child);

    // Verify child is removed and destroyed
    expect(container.querySelector('.child')).toBeNull();
    expect(child.destroyed).toBe(true);
  });

  /**
   * Example 3: Getting SubComponents from Parent Element
   *
   * subComponentsInParentElement returns all child components
   * currently attached to a parent element.
   */
  it('should retrieve all subcomponents from a parent element', () => {
    document.body.innerHTML = `
      <div id="tabs">
        <div class="tab-headers"></div>
        <div class="tab-content"></div>
      </div>
    `;

    // Tab header component
    const tabHeaderDescriptors = {};

    class TabHeaderComponent extends AbstractComponent<HTMLButtonElement, typeof tabHeaderDescriptors> {
      constructor(rootElement: HTMLButtonElement, public label: string) {
        super(rootElement, {});
        rootElement.textContent = label;
      }
      destroy() {}
    }

    // Tabs container component
    const tabsDescriptors = {
      headers: htmlElementDescriptor('.tab-headers', HTMLDivElement),
      content: htmlElementDescriptor('.tab-content', HTMLDivElement)
    };

    class TabsComponent extends AbstractComponent<HTMLDivElement, typeof tabsDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addTab(label: string): TabHeaderComponent {
        const button = document.createElement('button');
        button.className = 'tab-header';
        const tab = new TabHeaderComponent(button, label);
        this.addSubComponent(tab, 'headers');
        return tab;
      }

      getTabs(): TabHeaderComponent[] {
        return this.subComponentsInParentElement('headers');
      }

      destroy() {}
    }

    // Create tabs
    const container = document.querySelector('#tabs') as HTMLDivElement;
    const tabsElements = pageElements(tabsDescriptors, document);
    const tabs = new TabsComponent(container, tabsElements);

    // Add some tabs
    tabs.addTab('Home');
    tabs.addTab('Profile');
    tabs.addTab('Settings');

    // Retrieve tabs via subComponentsInParentElement
    const retrievedTabs = tabs.getTabs();

    expect(retrievedTabs).toHaveLength(3);
    expect(retrievedTabs[0].label).toBe('Home');
    expect(retrievedTabs[1].label).toBe('Profile');
    expect(retrievedTabs[2].label).toBe('Settings');
  });

  /**
   * Example 4: Component Reference on DOM Elements
   *
   * When a component is created, a reference is stored on its
   * rootElement as 'hydraComponent'. This allows finding the
   * component instance from a DOM element.
   */
  it('should attach component reference to DOM element', () => {
    document.body.innerHTML = `
      <div id="widget">
        <span class="status">Ready</span>
      </div>
    `;

    const widgetDescriptors = {
      status: htmlElementDescriptor('.status', HTMLSpanElement)
    };

    class WidgetComponent extends AbstractComponent<HTMLDivElement, typeof widgetDescriptors> {
      public name = 'MyWidget';

      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }
      destroy() {}
    }

    const container = document.querySelector('#widget') as HTMLDivElement;
    const elements = pageElements(widgetDescriptors, document);
    const widget = new WidgetComponent(container, elements);

    // Access component from DOM element
    const componentFromDom = (container as any).hydraComponent;

    expect(componentFromDom).toBe(widget);
    expect(componentFromDom.name).toBe('MyWidget');
  });

  /**
   * Example 5: Nested Component Hierarchies
   *
   * Components can be nested multiple levels deep, creating
   * complex UI structures.
   */
  it('should support deeply nested component hierarchies', () => {
    document.body.innerHTML = `
      <div id="app">
        <div class="sections"></div>
      </div>
    `;

    // Card component (leaf)
    class CardComponent extends AbstractComponent<HTMLDivElement, {}> {
      constructor(rootElement: HTMLDivElement, public title: string) {
        super(rootElement, {});
        rootElement.innerHTML = `<h3>${title}</h3>`;
      }
      destroy() {}
    }

    // Section component (contains cards)
    const sectionDescriptors = {
      cards: htmlElementDescriptor('.cards', HTMLDivElement)
    };

    class SectionComponent extends AbstractComponent<HTMLDivElement, typeof sectionDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any, public name: string) {
        super(rootElement, elements);
      }

      addCard(title: string): CardComponent {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        const card = new CardComponent(cardEl, title);
        this.addSubComponent(card, 'cards');
        return card;
      }

      getCards(): CardComponent[] {
        return this.subComponentsInParentElement('cards');
      }

      destroy() {}
    }

    // App component (contains sections)
    const appDescriptors = {
      sections: htmlElementDescriptor('.sections', HTMLDivElement)
    };

    class AppComponent extends AbstractComponent<HTMLDivElement, typeof appDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addSection(name: string): SectionComponent {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section';
        sectionEl.innerHTML = `<h2>${name}</h2><div class="cards"></div>`;
        const sectionElements = pageElements(sectionDescriptors, sectionEl);
        const section = new SectionComponent(sectionEl, sectionElements, name);
        this.addSubComponent(section, 'sections');
        return section;
      }

      getSections(): SectionComponent[] {
        return this.subComponentsInParentElement('sections');
      }

      destroy() {}
    }

    // Build the hierarchy
    const appEl = document.querySelector('#app') as HTMLDivElement;
    const appElements = pageElements(appDescriptors, document);
    const app = new AppComponent(appEl, appElements);

    // Add sections with cards
    const newsSection = app.addSection('News');
    newsSection.addCard('Breaking: Something happened');
    newsSection.addCard('Weather update');

    const sportsSection = app.addSection('Sports');
    sportsSection.addCard('Team wins championship');
    sportsSection.addCard('Player breaks record');
    sportsSection.addCard('Upcoming matches');

    // Verify structure
    const sections = app.getSections();
    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe('News');
    expect(sections[1].name).toBe('Sports');

    expect(sections[0].getCards()).toHaveLength(2);
    expect(sections[1].getCards()).toHaveLength(3);

    // Verify DOM structure
    const domSections = document.querySelectorAll('.section');
    expect(domSections).toHaveLength(2);

    const newsCards = domSections[0].querySelectorAll('.card');
    expect(newsCards).toHaveLength(2);
  });

  /**
   * Example 6: Template-Based SubComponents
   *
   * SubComponents can be created from templates, allowing for
   * reusable, pre-defined HTML structures.
   */
  it('should create subcomponents from templates', () => {
    document.body.innerHTML = `
      <template id="todo-item-template">
        <li class="todo-item">
          <input type="checkbox" class="todo-checkbox" />
          <span class="todo-text"></span>
          <button class="todo-delete">×</button>
        </li>
      </template>

      <div id="todo-app">
        <ul class="todo-list"></ul>
      </div>
    `;

    // Todo item component
    const todoItemDescriptors = {
      checkbox: htmlElementDescriptor('.todo-checkbox', HTMLInputElement),
      text: htmlElementDescriptor('.todo-text', HTMLSpanElement),
      deleteBtn: htmlElementDescriptor('.todo-delete', HTMLButtonElement)
    };

    class TodoItemComponent extends AbstractComponent<HTMLLIElement, typeof todoItemDescriptors> {
      constructor(rootElement: HTMLLIElement, elements: any, public task: string) {
        super(rootElement, elements);
        this.elements.text.textContent = task;
      }

      isCompleted(): boolean {
        return this.elements.checkbox.checked;
      }

      toggle() {
        this.elements.checkbox.checked = !this.elements.checkbox.checked;
      }

      destroy() {}
    }

    // Todo list component
    const todoListDescriptors = {
      list: htmlElementDescriptor('.todo-list', HTMLUListElement)
    };

    class TodoListComponent extends AbstractComponent<HTMLDivElement, typeof todoListDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addTodo(task: string): TodoItemComponent {
        // Clone from template
        const { rootElement, templateElements } = cloneTemplateContent(
          'todo-item-template',
          HTMLLIElement,
          todoItemDescriptors
        );

        const todoItem = new TodoItemComponent(rootElement, templateElements, task);
        this.addSubComponent(todoItem, 'list');
        return todoItem;
      }

      getTodos(): TodoItemComponent[] {
        return this.subComponentsInParentElement('list');
      }

      getCompletedCount(): number {
        return this.getTodos().filter(t => t.isCompleted()).length;
      }

      destroy() {}
    }

    // Create todo list
    const appEl = document.querySelector('#todo-app') as HTMLDivElement;
    const listElements = pageElements(todoListDescriptors, document);
    const todoList = new TodoListComponent(appEl, listElements);

    // Add todos
    const todo1 = todoList.addTodo('Buy groceries');
    const todo2 = todoList.addTodo('Walk the dog');
    const todo3 = todoList.addTodo('Write code');

    // Verify todos
    expect(todoList.getTodos()).toHaveLength(3);
    expect(todoList.getCompletedCount()).toBe(0);

    // Complete some todos
    todo1.toggle();
    todo3.toggle();

    expect(todoList.getCompletedCount()).toBe(2);

    // Verify DOM
    const items = document.querySelectorAll('.todo-item');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('.todo-text')?.textContent).toBe('Buy groceries');
  });

  /**
   * Example 7: Dynamic SubComponent Updates
   *
   * SubComponents can be dynamically added, removed, and
   * reordered based on application state.
   */
  it('should support dynamic subcomponent updates', () => {
    document.body.innerHTML = `
      <div id="playlist">
        <div class="tracks"></div>
      </div>
    `;

    // Track component
    class TrackComponent extends AbstractComponent<HTMLDivElement, {}> {
      constructor(rootElement: HTMLDivElement, public trackName: string) {
        super(rootElement, {});
        rootElement.className = 'track';
        rootElement.textContent = trackName;
      }
      destroy() {}
    }

    // Playlist component
    const playlistDescriptors = {
      tracks: htmlElementDescriptor('.tracks', HTMLDivElement)
    };

    class PlaylistComponent extends AbstractComponent<HTMLDivElement, typeof playlistDescriptors> {
      private trackComponents: TrackComponent[] = [];

      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addTrack(name: string): TrackComponent {
        const trackEl = document.createElement('div');
        const track = new TrackComponent(trackEl, name);
        this.trackComponents.push(track);
        this.addSubComponent(track, 'tracks');
        return track;
      }

      removeTrack(track: TrackComponent) {
        const index = this.trackComponents.indexOf(track);
        if (index !== -1) {
          this.trackComponents.splice(index, 1);
          this.removeSubComponent(track);
        }
      }

      getTracks(): TrackComponent[] {
        return [...this.trackComponents];
      }

      destroy() {}
    }

    // Create playlist
    const playlistEl = document.querySelector('#playlist') as HTMLDivElement;
    const playlistElements = pageElements(playlistDescriptors, document);
    const playlist = new PlaylistComponent(playlistEl, playlistElements);

    // Add initial tracks
    const track1 = playlist.addTrack('Song A');
    const track2 = playlist.addTrack('Song B');
    const track3 = playlist.addTrack('Song C');

    expect(playlist.getTracks()).toHaveLength(3);

    // Remove middle track
    playlist.removeTrack(track2);

    expect(playlist.getTracks()).toHaveLength(2);
    expect(playlist.getTracks()[0].trackName).toBe('Song A');
    expect(playlist.getTracks()[1].trackName).toBe('Song C');

    // Verify DOM
    const trackElements = document.querySelectorAll('.track');
    expect(trackElements).toHaveLength(2);
    expect(trackElements[0].textContent).toBe('Song A');
    expect(trackElements[1].textContent).toBe('Song C');
  });

  /**
   * Example 8: SubComponents with Event Communication
   *
   * SubComponents can communicate with their parent through
   * callbacks or by emitting events the parent listens to.
   */
  it('should enable parent-child communication via callbacks', () => {
    document.body.innerHTML = `
      <div id="form">
        <div class="fields"></div>
        <div class="errors"></div>
      </div>
    `;

    // Field component
    class FieldComponent extends AbstractComponent<HTMLDivElement, {}> {
      private onChangeCallback?: (value: string) => void;

      constructor(
        rootElement: HTMLDivElement,
        public fieldName: string,
        onChange?: (value: string) => void
      ) {
        super(rootElement, {});
        this.onChangeCallback = onChange;

        rootElement.innerHTML = `
          <label>${fieldName}</label>
          <input type="text" class="field-input" />
        `;

        const input = rootElement.querySelector('input')!;
        input.addEventListener('input', () => {
          this.onChangeCallback?.(input.value);
        });
      }

      getValue(): string {
        return (this.rootElement.querySelector('input') as HTMLInputElement).value;
      }

      setValue(value: string) {
        (this.rootElement.querySelector('input') as HTMLInputElement).value = value;
      }

      destroy() {}
    }

    // Form component
    const formDescriptors = {
      fields: htmlElementDescriptor('.fields', HTMLDivElement),
      errors: htmlElementDescriptor('.errors', HTMLDivElement)
    };

    class FormComponent extends AbstractComponent<HTMLDivElement, typeof formDescriptors> {
      private fieldChanges: Array<{ field: string; value: string }> = [];

      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }

      addField(name: string): FieldComponent {
        const fieldEl = document.createElement('div');
        fieldEl.className = 'form-field';

        const field = new FieldComponent(fieldEl, name, (value) => {
          this.onFieldChange(name, value);
        });

        this.addSubComponent(field, 'fields');
        return field;
      }

      private onFieldChange(fieldName: string, value: string) {
        this.fieldChanges.push({ field: fieldName, value });
      }

      getChanges() {
        return [...this.fieldChanges];
      }

      destroy() {}
    }

    // Create form
    const formEl = document.querySelector('#form') as HTMLDivElement;
    const formElements = pageElements(formDescriptors, document);
    const form = new FormComponent(formEl, formElements);

    // Add fields
    const nameField = form.addField('Name');
    const emailField = form.addField('Email');

    // Simulate user input
    nameField.setValue('John');
    (nameField.rootElement.querySelector('input') as HTMLInputElement).dispatchEvent(
      new Event('input')
    );

    emailField.setValue('john@test.com');
    (emailField.rootElement.querySelector('input') as HTMLInputElement).dispatchEvent(
      new Event('input')
    );

    // Verify parent received changes
    const changes = form.getChanges();
    expect(changes).toHaveLength(2);
    expect(changes[0]).toEqual({ field: 'Name', value: 'John' });
    expect(changes[1]).toEqual({ field: 'Email', value: 'john@test.com' });
  });
});
