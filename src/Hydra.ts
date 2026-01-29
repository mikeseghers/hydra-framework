import { BaseComponent } from './BaseComponent';
import { Component } from './Component';
import {
  discoverMediators,
  findMediator,
  isElementSchema,
  isElementWithSelector,
  validateElementsAgainstSchema,
  ElementSchema
} from './DataAttributes';
import Loadable from './Loadable';
import Mediator from './Mediator';
import PageController from './PageController';
import { cloneTemplateContent, getAllElementsBySelector, getFirstElementBySelector } from './View';

declare global {
  interface Window {
    hydra: Hydra;
  }
}

// New names
export type PageControllerConstructor = new (...args: any[]) => PageController;
export type PageControllerDefinitionParameter =
  | ServiceDependencyDefinition
  | MediatorDependencyDefinition
  | PageElementContainer
  | ValueDependencyDefinition;
export type MediatorConstructor<EventType, T extends Mediator<EventType> = Mediator<EventType>> = new (...args: any[]) => T;
export type MediatorDefinitionParameter =
  | ServiceDependencyDefinition
  | MediatorDependencyDefinition
  | PageElementContainer
  | ValueDependencyDefinition
  | ElementSchema;
export type ServiceConstructor = new (...args: any[]) => any;
export type ServiceDefinitionParameter = ServiceDependencyDefinition | ValueDependencyDefinition;
export interface MediatorOptions {
  qualifier: string;
  [key: string]: any;
}

export interface HydraRegistry {
  registerServiceInstance<ServiceType extends {}>(service: ServiceType, name?: string): HydraRegistry;
  registerComponentInstance<ComponentType extends BaseComponent>(component: ComponentType, name?: string): HydraRegistry;
}

export interface HydraRepository {
  getServiceInstance<ServiceType>(serviceType: ConstructorOf<ServiceType>, name?: string): ServiceType;
  getComponentInstance<ComponentType extends BaseComponent>(componentType: ConstructorOf<ComponentType>, name?: string): ComponentType;
}

export type ConstructorOf<T> = new (...args: any[]) => T;

export default class Hydra implements HydraRegistry, HydraRepository {
  private pageControllerDefinitions: {
    [name: string]: [PageControllerConstructor, PageControllerDefinitionParameter[]];
  } = {};
  private mediatorDefinitions: { [name: string]: [MediatorConstructor<any>, MediatorDefinitionParameter[]] } = {};
  private serviceDefinitions: { [serviceName: string]: [ServiceConstructor, ServiceDefinitionParameter[]] } = {};

  private services: { [serviceName: string]: any | undefined } = {};
  private mediators: { [name: string]: Mediator<any> } = {};
  private pageControllers: { [name: string]: Loadable } = {};
  private components: { [name: string]: BaseComponent | undefined } = {};

  static registerContext(context: HydraContext) {
    context.register(this.getInstance());
  }

  registerSubContext(context: HydraContext, options?: any) {
    context.register(this, options);
  }

  // New API methods
  registerPageController(constructor: PageControllerConstructor, dependencies: PageControllerDefinitionParameter[]) {
    this.pageControllerDefinitions[constructor.name] = [constructor, dependencies];
  }

  registerMediator<EventType>(mediatorConstructor: MediatorConstructor<EventType>, dependencies: MediatorDefinitionParameter[]) {
    this.mediatorDefinitions[mediatorConstructor.name] = [mediatorConstructor, dependencies];
  }

  registerService(serviceConstructor: ServiceConstructor, dependencies: ServiceDefinitionParameter[] = []) {
    this.serviceDefinitions[serviceConstructor.name] = [serviceConstructor, dependencies];
  }

  registerComponent(component: BaseComponent, name?: string) {
    const typeName = Object.getPrototypeOf(component).constructor.name;
    if (!typeName) {
      throw new Error(`Couldn't registerd component, is it a class?`);
    }
    const key = name ? name + '_' + typeName : typeName;
    this.components[key] = component;
  }

  registerServiceInstance<ServiceType extends {}>(serv: ServiceType, name?: string): HydraRegistry {
    const servName = this.getKey(serv.constructor as ConstructorOf<ServiceType>, name);
    if (!this.services[servName]) {
      this.services[servName] = serv;
    }
    return this;
  }

  registerComponentInstance<ComponentType extends BaseComponent>(component: ComponentType, name?: string): HydraRegistry {
    const compName = this.getKey(component.constructor as ConstructorOf<ComponentType>, name);
    this.components[compName] = component;
    return this;
  }

  private getKey(ctor: ConstructorOf<any>, name?: string) {
    const typeName = ctor.name;
    return name ? name + '_' + typeName : typeName;
  }

  getComponent<T extends BaseComponent>(type: new (...args: any) => T, name?: string): T | undefined {
    const key = name ? name + '_' + type.name : type.name;
    return this.components[key] as T;
  }

  private async boot() {
    try {
      Object.entries(this.serviceDefinitions).forEach(([serviceName, [serviceConstructor, serviceDecoratorOptions]]) => {
        this.services[serviceName] = this.constructService(serviceConstructor, serviceDecoratorOptions);
      });

      Object.entries(this.pageControllerDefinitions).forEach(([name, [constructor, dependencies]]) => {
        this.pageControllers[name] = this.constructPageController(constructor, dependencies);
      });

      const serviceLoadPromises = Object.values(this.services).map((s) => {
        if (typeof s.load === 'function') {
          return this.load(s);
        } else {
          return Promise.resolve();
        }
      });
      await Promise.all(serviceLoadPromises);
      const mediatorLoadPromises = Object.values(this.mediators).map((m) => this.load(m));
      await Promise.all(mediatorLoadPromises);
      const pageControllerLoadPromises = Object.values(this.pageControllers).map((pc) => this.load(pc));
      await Promise.all(pageControllerLoadPromises);

      this.serviceDefinitions = {};
      this.pageControllerDefinitions = {};
      this.mediatorDefinitions = {};
    } catch (err) {
      console.error('Error during load time', err);
    }
  }

  private load(loadable: Loadable): Promise<void> {
    try {
      return Promise.resolve(loadable.load());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private constructService(serviceConstructor: ServiceConstructor, parameters: ServiceDefinitionParameter[]): any {
    const alreadyLoaded = this.services[serviceConstructor.name];
    if (alreadyLoaded) {
      return alreadyLoaded;
    }

    const dependencies = parameters.map((param) => {
      if (isServiceDependencyDefinition(param)) {
        return this.getServiceInstance(param.serviceType);
      } else {
        return param.value;
      }
    });
    this.services[serviceConstructor.name] = new serviceConstructor(...dependencies);
    return this.services[serviceConstructor.name];
  }

  private constructMediator<EventType, T extends Mediator<EventType>>(
    mediatorConstructor: MediatorConstructor<EventType, T>,
    parameters: MediatorDefinitionParameter[],
    options?: MediatorOptions
  ): T {
    const nameSuffix = options?.qualifier ? `_${options.qualifier}` : '';
    const mediatorName = `${mediatorConstructor.name}${nameSuffix}`;
    const alreadyConstructed = this.mediators[mediatorName];
    if (alreadyConstructed) {
      return alreadyConstructed as T;
    }

    const dependencies = this.resolveDependencies(parameters, options, mediatorConstructor.name);
    const constructed = new mediatorConstructor(...dependencies, options);
    this.mediators[mediatorName] = constructed;
    return constructed;
  }

  private constructPageController(constructor: PageControllerConstructor, parameters: PageControllerDefinitionParameter[]): Loadable {
    const alreadyConstructed = this.pageControllers[constructor.name];
    if (alreadyConstructed) {
      return alreadyConstructed;
    }

    const dependencies = this.resolveDependencies(parameters);
    this.pageControllers[constructor.name] = new constructor(...dependencies);
    return this.pageControllers[constructor.name];
  }

  private resolveDependencies(
    parameters: MediatorDefinitionParameter[] | PageControllerDefinitionParameter[],
    options?: MediatorOptions,
    mediatorName?: string
  ) {
    const dependencies = [];
    const elementDependencies: any = {};
    for (const param of parameters) {
      if (isServiceDependencyDefinition(param)) {
        dependencies.push(this.getServiceInstance(param.serviceType));
      } else if (isMediatorDependencyDefinition(param)) {
        dependencies.push(this.getMediatorInstance(param));
      } else if (isElementSchema(param)) {
        // Resolve elements from schema (handles both selectors and data attributes)
        const resolved = this.resolveElementsFromSchema(param, mediatorName, options?.qualifier);
        const validated = validateElementsAgainstSchema(resolved, param, mediatorName ?? 'Unknown');
        dependencies.push(validated);
      } else if (isPageElementContainer(param)) {
        const result = pageElements(param, document, options);
        dependencies.push(result);
      } else if (isValueDependencyDefinition(param)) {
        dependencies.push(param.value);
      }
    }
    if (Object.keys(elementDependencies).length > 0) {
      dependencies.unshift(elementDependencies);
    }
    return dependencies;
  }

  private discoverElementsFromDataAttributes(
    mediatorName?: string,
    qualifier?: string
  ): Record<string, HTMLElement | HTMLElement[]> {
    if (!mediatorName) {
      throw new Error('Cannot discover elements via data attributes without a Mediator name');
    }

    const discovered = discoverMediators(document);
    const mediator = findMediator(discovered, mediatorName, qualifier);

    if (!mediator) {
      throw new Error(
        `Could not find Mediator "${mediatorName}"${qualifier ? ` with qualifier "${qualifier}"` : ''} in the DOM. ` +
          `Make sure to add data-hydra-mediator="${mediatorName}" to an element.`
      );
    }

    return mediator.elements;
  }

  private resolveElementsFromSchema(
    schema: ElementSchema,
    mediatorName?: string,
    qualifier?: string
  ): Record<string, HTMLElement | HTMLElement[]> {
    const result: Record<string, HTMLElement | HTMLElement[]> = {};
    let needsDataAttributeDiscovery = false;

    // First pass: resolve selector-based entries and detect if we need data attribute discovery
    for (const [propertyName, entry] of Object.entries(schema.definition)) {
      if (isElementWithSelector(entry)) {
        // Resolve via CSS selector
        if (entry.__collection) {
          result[propertyName] = getAllElementsBySelector(entry.selector, entry.type);
        } else {
          result[propertyName] = getFirstElementBySelector(entry.selector, entry.type);
        }
      } else {
        // This entry needs data attribute discovery
        needsDataAttributeDiscovery = true;
      }
    }

    // Second pass: if any entries need data attribute discovery, do it once
    if (needsDataAttributeDiscovery) {
      const discovered = this.discoverElementsFromDataAttributes(mediatorName, qualifier);

      for (const [propertyName, entry] of Object.entries(schema.definition)) {
        if (!isElementWithSelector(entry)) {
          result[propertyName] = discovered[propertyName];
        }
      }
    }

    return result;
  }

  getServiceInstance<ServiceType>(serviceType: ConstructorOf<ServiceType>, name?: string): ServiceType {
    const servName = this.getKey(serviceType, name);
    const serv = this.services[servName];
    if (!serv || !(serv instanceof serviceType)) {
      throw new Error(
        `Could not find service of type ${serviceType.name}${name ? ' qualified by ' + name : ''}. Make sure to register it first.`
      );
    }
    return serv;
  }

  getComponentInstance<ComponentType extends BaseComponent>(componentType: ConstructorOf<ComponentType>, name?: string): ComponentType {
    const comp = this.components[this.getKey(componentType, name)];
    if (!comp || !(comp instanceof componentType)) {
      throw new Error(
        `Could not find component of type ${componentType.name}${name ? ' qualified by ' + name : ''}. Make sure to register it first.`
      );
    }
    return comp;
  }

  getMediatorInstance(definition: MediatorDependencyDefinition): Loadable {
    const md = this.mediatorDefinitions[definition.mediatorType.name];
    if (!md) {
      throw new Error(
        'Could not find definition for ' + definition.mediatorType.name + '. Make sure to register it with registerMediator.'
      );
    }
    const [mediatorConstructor, mediatorDefinitionParams] = md;
    return this.constructMediator(mediatorConstructor, mediatorDefinitionParams, definition.options);
  }

  static getInstance(): Hydra {
    if (!window.hydra) {
      window.hydra = new Hydra();
      window.onload = window.hydra.boot.bind(window.hydra);
    }
    return window.hydra;
  }
}

export interface HydraContext {
  register(hydra: Hydra, options?: any): void;
}

export interface ServiceDependencyDefinition {
  serviceType: new (...args: any[]) => any;
}

export function isServiceDependencyDefinition(definition: any): definition is ServiceDependencyDefinition {
  return definition.serviceType !== undefined;
}

export function service(serviceType: new (...args: any[]) => any): ServiceDependencyDefinition {
  return { serviceType };
}

export interface MediatorDependencyDefinition {
  mediatorType: new (...args: unknown[]) => Loadable;
  options?: MediatorOptions;
}

export function isMediatorDependencyDefinition(definition: unknown): definition is MediatorDependencyDefinition {
  return typeof definition === 'object' && definition !== null && 'mediatorType' in definition;
}

export function mediator<EventType, T extends Mediator<EventType>>(
  mediatorType: MediatorConstructor<EventType, T>,
  options?: MediatorOptions
): MediatorDependencyDefinition {
  return { mediatorType, options };
}

type Selector = string | ((options: any) => string);

export type PageElementContainer = { [key: string]: HTMLElementDescriptor<HTMLElement> | HTMLElementCollectionDescriptor<HTMLElement> };
type ElementContainerType<T extends PageElementContainer> = {
  [P in keyof T]: T[P];
};
type WhatDescriptor<T> = T extends HTMLElementDescriptor<infer H> ? H : T extends HTMLElementCollectionDescriptor<infer HC> ? HC[] : never;
export type PageElements<PEC extends PageElementContainer> = {
  [P in keyof PEC]: WhatDescriptor<PEC[P]>;
};
export type PageElementFromContainerType<T extends PageElementContainer> = PageElements<Readonly<ElementContainerType<T>>>;

export function isPageElementContainer(elementContainer: any): elementContainer is PageElementContainer {
  return Object.entries(elementContainer).every(([key, maybeDescriptor]) => {
    return typeof key === 'string' && (isHTMLElementDescriptor(maybeDescriptor) || isHTMLElementCollectionDescriptor(maybeDescriptor));
  }, true);
}

export interface HTMLElementDescriptor<HTMLElementType extends HTMLElement> {
  selector: Selector;
  type: new () => HTMLElementType;
  collection: false;
}

export function isHTMLElementDescriptor(maybeDescriptor: any): maybeDescriptor is HTMLElementDescriptor<HTMLElement> {
  return maybeDescriptor && maybeDescriptor.selector && maybeDescriptor.type && maybeDescriptor.collection === false;
}

export interface HTMLElementCollectionDescriptor<HTMLElementType extends HTMLElement> {
  selector: Selector;
  type: new () => HTMLElementType;
  collection: true;
}

export function isHTMLElementCollectionDescriptor(maybeDescriptor: any): maybeDescriptor is HTMLElementCollectionDescriptor<HTMLElement> {
  return maybeDescriptor && maybeDescriptor.selector && maybeDescriptor.type && maybeDescriptor.collection === true;
}

export function getHTMLElement<T extends HTMLElement>(desc: HTMLElementDescriptor<T>, rootElement: Element | Document, options: any): T {
  const selector = typeof desc.selector === 'function' ? desc.selector(options) : desc.selector;
  return getFirstElementBySelector(selector, desc.type, rootElement);
}

export function getHTMLElements<T extends HTMLElement>(
  desc: HTMLElementCollectionDescriptor<T>,
  rootElement: Element | Document,
  options: any
): T[] {
  const selector = typeof desc.selector === 'function' ? desc.selector(options) : desc.selector;
  return getAllElementsBySelector(selector, desc.type, rootElement);
}

export function htmlElementDescriptor<H extends HTMLElement>(selector: Selector, type: new () => H): HTMLElementDescriptor<H> {
  return { selector, type, collection: false };
}

export function htmlElementCollectionDescriptor<H extends HTMLElement>(
  selector: Selector,
  type: new () => H
): HTMLElementCollectionDescriptor<H> {
  return { selector, type, collection: true };
}

export interface ValueDependencyDefinition {
  value: any;
}

export function isValueDependencyDefinition(definition: any): definition is ValueDependencyDefinition {
  return definition.value !== undefined;
}

export function value(v: any): ValueDependencyDefinition {
  return { value: v };
}

export function pageElements<PEC extends PageElementContainer>(
  pageElementContainer: PEC,
  rootElement: Element | Document = document,
  options?: any
): PageElements<PEC> {
  return Object.entries(pageElementContainer).reduce((prev, [propertyName, desc]) => {
    let elem = null;
    if (isHTMLElementDescriptor(desc)) {
      elem = getHTMLElement(desc, rootElement, options);
    } else {
      elem = getHTMLElements(desc, rootElement, options);
    }
    prev[propertyName] = elem;
    return prev;
  }, {} as { [key: string]: HTMLElement | HTMLElement[] }) as PageElements<PEC>;
}

function isConstructor(func: any): func is new (...args: any[]) => any {
  return (func && typeof func === 'function' && func.prototype && func.prototype.constructor) === func;
}

export function constructComponent<
  ComponentType extends Component<RootElement, PEC>,
  RootElement extends HTMLElement,
  PEC extends PageElementContainer
>(
  componentConstructor:
    | (new (rootElement: RootElement, elements: PageElementFromContainerType<PEC>) => ComponentType)
    | ((rootElement: RootElement, elements: PageElementFromContainerType<PEC>) => ComponentType),
  rootElementOrTemplateSelector: string,
  rootElementType: new (...args: any) => RootElement,
  elementContainer: PEC
): ComponentType {
  const element = getFirstElementBySelector(rootElementOrTemplateSelector, HTMLElement);

  if (element instanceof HTMLTemplateElement) {
    const { rootElement, templateElements } = cloneTemplateContent(element, rootElementType, elementContainer);
    return _constructComponent(componentConstructor, rootElement, templateElements);
  } else if (element instanceof rootElementType) {
    return _constructComponent(componentConstructor, element, pageElements(elementContainer, element));
  } else {
    throw new Error(
      `Could not construct component, the selector '${rootElementOrTemplateSelector}' did not select a template element or the expected root element type. Instead the selected element is ${typeof element}`
    );
  }
}

function _constructComponent<
  ComponentType extends Component<RootElement, PEC>,
  RootElement extends HTMLElement,
  PEC extends PageElementContainer
>(
  componentConstructor:
    | (new (rootElement: RootElement, elements: PageElementFromContainerType<PEC>) => ComponentType)
    | ((rootElement: RootElement, elements: PageElementFromContainerType<PEC>) => ComponentType),
  rootElement: RootElement,
  elements: PageElementFromContainerType<PEC>
) {
  if (isConstructor(componentConstructor)) {
    return new componentConstructor(rootElement, elements);
  } else {
    return componentConstructor(rootElement, elements);
  }
}
