import { describe, it, expect, beforeEach } from 'vitest';
import Hydra from '../src/Hydra';
import { pageElements, htmlElementDescriptor, htmlElementCollectionDescriptor } from '../src/Hydra';
import type { default as PageController } from '../src/PageController';
import { AbstractComponent } from '../src/AbstractComponent';

/**
 * Component Injection Tests
 * 
 * These tests demonstrate how to create and inject components in Hydra.
 * Components are reusable UI elements that bind to DOM elements and
 * provide encapsulated behavior.
 * 
 * These examples use the manual construction pattern (pattern 1) where
 * services and components are created directly rather than using the
 * full DI system.
 */
describe('Component Injection', () => {
  
  beforeEach(() => {
    // Clear the Hydra singleton and DOM between tests
    if ((window as any).hydra) {
      delete (window as any).hydra;
    }
    document.body.innerHTML = '';
  });
  
  /**
   * Example 1: Basic Component with DOM Elements
   * 
   * This example shows how to create a simple component that binds
   * to DOM elements using the pageElements descriptor.
   */
  it('should inject a component with DOM elements', async () => {
    // Set up HTML
    document.body.innerHTML = `
      <div id="app">
        <h1 id="title">Welcome</h1>
        <button id="click-btn">Click Me</button>
        <span id="counter">0</span>
      </div>
    `;
    
    // Define element descriptors
    const counterElementDescriptors = {
      title: htmlElementDescriptor('#title', HTMLHeadingElement),
      button: htmlElementDescriptor('#click-btn', HTMLButtonElement),
      counter: htmlElementDescriptor('#counter', HTMLSpanElement)
    };
    
    // Create component (elements will be resolved at runtime)
    class CounterComponent extends AbstractComponent<HTMLDivElement, typeof counterElementDescriptors> {
      private count = 0;
      
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
        
        // Bind click handler
        this.elements.button.addEventListener('click', () => this.increment());
      }
      
      increment() {
        this.count++;
        this.elements.counter.textContent = this.count.toString();
      }
      
      destroy() {
        // Cleanup
      }
    }
    
    // Define page entry that uses the component
    class CounterPage implements PageController {
      constructor(public component: CounterComponent) {}
      
      async load() {
        // Component is already initialized
      }
    }
    
    // Manual construction (pattern 1)
    const hydra = Hydra.getInstance();
    const rootElement = document.querySelector('#app') as HTMLDivElement;
    const resolvedElements = pageElements(counterElementDescriptors, document);
    const component = new CounterComponent(rootElement, resolvedElements);
    
    // Register instances
    hydra.registerComponentInstance(component);
    hydra.registerPageController(CounterPage, [{ value: component }]);
    
    await (hydra as any).boot();
    
    // Verify component works
    expect(component.elements.counter.textContent).toBe('0');
    component.increment();
    expect(component.elements.counter.textContent).toBe('1');
  });
  
  /**
   * Example 2: Component with Service Dependencies
   * 
   * Components can have services injected, allowing them to
   * interact with application logic and data.
   */
  it('should inject services into components', async () => {
    // Set up HTML
    document.body.innerHTML = `
      <div id="user-card">
        <h2 id="username"></h2>
        <p id="email"></p>
        <button id="load-btn">Load User</button>
      </div>
    `;
    
    // Define a service
    class UserService {
      async fetchUser(id: string) {
        return {
          name: 'John Doe',
          email: 'john@example.com'
        };
      }
    }
    
    // Define element descriptors
    const userCardDescriptors = {
      username: htmlElementDescriptor('#username', HTMLHeadingElement),
      email: htmlElementDescriptor('#email', HTMLParagraphElement),
      loadButton: htmlElementDescriptor('#load-btn', HTMLButtonElement)
    };
    
    // Create component with service dependency
    class UserCardComponent extends AbstractComponent<HTMLDivElement, typeof userCardDescriptors> {
      constructor(
        rootElement: HTMLDivElement,
        elements: any,
        private userService: UserService
      ) {
        super(rootElement, elements);
        
        this.elements.loadButton.addEventListener('click', () => this.loadUser());
      }
      
      async loadUser() {
        const user = await this.userService.fetchUser('123');
        this.elements.username.textContent = user.name;
        this.elements.email.textContent = user.email;
      }
      
      destroy() {}
    }
    
    // Page entry
    class UserPage implements PageController {
      constructor(public component: UserCardComponent) {}
      
      async load() {
        await this.component.loadUser();
      }
    }
    
    // Manual construction (pattern 1)
    const hydra = Hydra.getInstance();
    const userService = new UserService();
    
    const rootElement = document.querySelector('#user-card') as HTMLDivElement;
    const resolvedElements = pageElements(userCardDescriptors, document);
    const component = new UserCardComponent(rootElement, resolvedElements, userService);
    
    // Register instances
    hydra.registerServiceInstance(userService);
    hydra.registerComponentInstance(component);
    hydra.registerPageController(UserPage, [{ value: component }]);
    
    await (hydra as any).boot();
    
    // Verify component loaded user data
    expect(component.elements.username.textContent).toBe('John Doe');
    expect(component.elements.email.textContent).toBe('john@example.com');
  });
  
  /**
   * Example 3: Multiple Components on One Page
   * 
   * A page can have multiple components, each handling different
   * areas of the UI independently.
   */
  it('should inject multiple components into a page', async () => {
    // Set up HTML
    document.body.innerHTML = `
      <div id="header">
        <h1 id="site-title">My Site</h1>
        <button id="menu-toggle">Menu</button>
      </div>
      <div id="sidebar">
        <ul id="nav-list"></ul>
      </div>
      <div id="content">
        <p id="page-content"></p>
      </div>
    `;
    
    // Header component
    const headerDescriptors = {
      title: htmlElementDescriptor('#site-title', HTMLHeadingElement),
      menuToggle: htmlElementDescriptor('#menu-toggle', HTMLButtonElement)
    };
    
    class HeaderComponent extends AbstractComponent<HTMLDivElement, typeof headerDescriptors> {
      public menuOpen = false;
      
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
        this.elements.menuToggle.addEventListener('click', () => this.toggleMenu());
      }
      
      toggleMenu() {
        this.menuOpen = !this.menuOpen;
      }
      
      destroy() {}
    }
    
    // Sidebar component
    const sidebarDescriptors = {
      navList: htmlElementDescriptor('#nav-list', HTMLUListElement)
    };
    
    class SidebarComponent extends AbstractComponent<HTMLDivElement, typeof sidebarDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }
      
      addNavItem(text: string) {
        const li = document.createElement('li');
        li.textContent = text;
        this.elements.navList.appendChild(li);
      }
      
      destroy() {}
    }
    
    // Content component
    const contentDescriptors = {
      pageContent: htmlElementDescriptor('#page-content', HTMLParagraphElement)
    };
    
    class ContentComponent extends AbstractComponent<HTMLDivElement, typeof contentDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
      }
      
      setContent(text: string) {
        this.elements.pageContent.textContent = text;
      }
      
      destroy() {}
    }
    
    // Page entry using all components
    class MainPage implements PageController {
      constructor(
        public header: HeaderComponent,
        public sidebar: SidebarComponent,
        public content: ContentComponent
      ) {}
      
      async load() {
        this.sidebar.addNavItem('Home');
        this.sidebar.addNavItem('About');
        this.sidebar.addNavItem('Contact');
        this.content.setContent('Welcome to the main page!');
      }
    }
    
    // Manual construction (pattern 1)
    const hydra = Hydra.getInstance();
    
    // Create header component
    const headerRoot = document.querySelector('#header') as HTMLDivElement;
    const headerResolved = pageElements(headerDescriptors, document);
    const header = new HeaderComponent(headerRoot, headerResolved);
    
    // Create sidebar component
    const sidebarRoot = document.querySelector('#sidebar') as HTMLDivElement;
    const sidebarResolved = pageElements(sidebarDescriptors, document);
    const sidebar = new SidebarComponent(sidebarRoot, sidebarResolved);
    
    // Create content component
    const contentRoot = document.querySelector('#content') as HTMLDivElement;
    const contentResolved = pageElements(contentDescriptors, document);
    const content = new ContentComponent(contentRoot, contentResolved);
    
    // Register all components
    hydra.registerComponentInstance(header, 'header');
    hydra.registerComponentInstance(sidebar, 'sidebar');
    hydra.registerComponentInstance(content, 'content');
    
    hydra.registerPageController(MainPage, [
      { value: header },
      { value: sidebar },
      { value: content }
    ]);
    
    await (hydra as any).boot();
    
    // Verify all components work
    expect(header.menuOpen).toBe(false);
    header.toggleMenu();
    expect(header.menuOpen).toBe(true);
    
    expect(sidebar.elements.navList.children.length).toBe(3);
    expect(content.elements.pageContent.textContent).toBe('Welcome to the main page!');
  });
  
  /**
   * Example 4: Component with Element Collections
   * 
   * Components can work with multiple elements of the same type
   * using htmlElementCollectionDescriptor.
   */
  it('should inject components with element collections', async () => {
    // Set up HTML
    document.body.innerHTML = `
      <div id="todo-app">
        <input id="new-todo" type="text" placeholder="New todo">
        <button id="add-btn">Add</button>
        <ul id="todo-list">
          <li class="todo-item">Existing todo 1</li>
          <li class="todo-item">Existing todo 2</li>
        </ul>
      </div>
    `;
    
    // Define element descriptors with collection
    const todoDescriptors = {
      newTodoInput: htmlElementDescriptor('#new-todo', HTMLInputElement),
      addButton: htmlElementDescriptor('#add-btn', HTMLButtonElement),
      todoList: htmlElementDescriptor('#todo-list', HTMLUListElement),
      todoItems: htmlElementCollectionDescriptor('.todo-item', HTMLLIElement)
    };
    
    // Create component
    class TodoComponent extends AbstractComponent<HTMLDivElement, typeof todoDescriptors> {
      constructor(rootElement: HTMLDivElement, elements: any) {
        super(rootElement, elements);
        
        this.elements.addButton.addEventListener('click', () => this.addTodo());
      }
      
      addTodo() {
        const text = this.elements.newTodoInput.value.trim();
        if (text) {
          const li = document.createElement('li');
          li.className = 'todo-item';
          li.textContent = text;
          this.elements.todoList.appendChild(li);
          this.elements.newTodoInput.value = '';
        }
      }
      
      getTodoCount(): number {
        return this.elements.todoList.querySelectorAll('.todo-item').length;
      }
      
      destroy() {}
    }
    
    // Page entry
    class TodoPage implements PageController {
      constructor(public todoComponent: TodoComponent) {}
      
      async load() {
        // Component ready to use
      }
    }
    
    // Manual construction (pattern 1)
    const hydra = Hydra.getInstance();
    const rootElement = document.querySelector('#todo-app') as HTMLDivElement;
    const resolvedElements = pageElements(todoDescriptors, document);
    const component = new TodoComponent(rootElement, resolvedElements);
    
    hydra.registerComponentInstance(component);
    hydra.registerPageController(TodoPage, [{ value: component }]);
    
    await (hydra as any).boot();
    
    // Verify component works with collections
    expect(component.getTodoCount()).toBe(2);
    
    component.elements.newTodoInput.value = 'New todo item';
    component.addTodo();
    
    expect(component.getTodoCount()).toBe(3);
  });
  
  /**
   * Example 5: Real-World Component Pattern
   * 
   * This shows a complete pattern for creating components
   * with services.
   */
  it('should demonstrate a real-world component injection pattern', async () => {
    // Set up HTML
    document.body.innerHTML = `
      <div id="app">
        <div id="notification-bar">
          <span id="message"></span>
          <button id="close-btn">×</button>
        </div>
        <form id="contact-form">
          <input id="name-input" type="text" placeholder="Name">
          <input id="email-input" type="email" placeholder="Email">
          <button id="submit-btn" type="submit">Submit</button>
        </form>
      </div>
    `;
    
    // Notification service
    class NotificationService {
      private subscribers: Array<(message: string) => void> = [];
      
      subscribe(callback: (message: string) => void) {
        this.subscribers.push(callback);
      }
      
      notify(message: string) {
        this.subscribers.forEach(cb => cb(message));
      }
    }
    
    // Notification component
    const notificationDescriptors = {
      message: htmlElementDescriptor('#message', HTMLSpanElement),
      closeButton: htmlElementDescriptor('#close-btn', HTMLButtonElement)
    };
    
    class NotificationComponent extends AbstractComponent<HTMLDivElement, typeof notificationDescriptors> {
      constructor(
        rootElement: HTMLDivElement,
        elements: any,
        private notificationService: NotificationService
      ) {
        super(rootElement, elements);
        
        this.notificationService.subscribe((msg) => this.show(msg));
        this.elements.closeButton.addEventListener('click', () => this.hide());
        this.hide();
      }
      
      show(message: string) {
        this.elements.message.textContent = message;
        this.rootElement.style.display = 'block';
      }
      
      hide() {
        this.rootElement.style.display = 'none';
      }
      
      destroy() {}
    }
    
    // Form component
    const formDescriptors = {
      nameInput: htmlElementDescriptor('#name-input', HTMLInputElement),
      emailInput: htmlElementDescriptor('#email-input', HTMLInputElement),
      submitButton: htmlElementDescriptor('#submit-btn', HTMLButtonElement)
    };
    
    class ContactFormComponent extends AbstractComponent<HTMLFormElement, typeof formDescriptors> {
      constructor(
        rootElement: HTMLFormElement,
        elements: any,
        private notificationService: NotificationService
      ) {
        super(rootElement, elements);
        
        this.rootElement.addEventListener('submit', (e) => this.handleSubmit(e));
      }
      
      handleSubmit(e: Event) {
        e.preventDefault();
        const name = this.elements.nameInput.value;
        const email = this.elements.emailInput.value;
        
        if (name && email) {
          this.notificationService.notify(`Thank you, ${name}!`);
          this.reset();
        }
      }
      
      reset() {
        this.elements.nameInput.value = '';
        this.elements.emailInput.value = '';
      }
      
      destroy() {}
    }
    
    // Page entry
    class ContactPage implements PageController {
      constructor(
        private notificationComponent: NotificationComponent,
        private formComponent: ContactFormComponent
      ) {}
      
      async load() {
        // Components are ready
      }
    }
    
    const hydra = Hydra.getInstance();
    
    // Create service
    const notificationService = new NotificationService();
    
    // Create notification component
    const notifRoot = document.querySelector('#notification-bar') as HTMLDivElement;
    const notifResolved = pageElements(notificationDescriptors, document);
    const notificationComponent = new NotificationComponent(
      notifRoot,
      notifResolved,
      notificationService
    );
    
    // Create form component
    const formRoot = document.querySelector('#contact-form') as HTMLFormElement;
    const formResolved = pageElements(formDescriptors, document);
    const formComponent = new ContactFormComponent(
      formRoot,
      formResolved,
      notificationService
    );
    
    // Register all instances
    hydra.registerServiceInstance(notificationService);
    hydra.registerComponentInstance(notificationComponent, 'notification');
    hydra.registerComponentInstance(formComponent, 'contactForm');
    
    hydra.registerPageController(ContactPage, [
      { value: notificationComponent },
      { value: formComponent }
    ]);
    
    await (hydra as any).boot();
    
    // Verify the complete flow
    const registeredFormComponent = hydra.getComponentInstance(ContactFormComponent, 'contactForm');
    const registeredNotificationComponent = hydra.getComponentInstance(NotificationComponent, 'notification');
    
    // Simulate form submission
    registeredFormComponent.elements.nameInput.value = 'Alice';
    registeredFormComponent.elements.emailInput.value = 'alice@example.com';
    registeredFormComponent.handleSubmit(new Event('submit'));
    
    // Verify notification was shown
    expect(registeredNotificationComponent.elements.message.textContent).toBe('Thank you, Alice!');
    expect(registeredNotificationComponent.rootElement.style.display).toBe('block');
  });
});