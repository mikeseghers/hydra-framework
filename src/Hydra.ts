import { BaseComponent } from './BaseComponent';
import { Component } from './Component';
import { discoverPageParts, findPagePart } from './DataAttributes';
import Loadable from './Loadable';
import PageEntry from './PageEntry';
import PagePart from './PagePart';
import { cloneTemplateContent, getAllElementsBySelector, getFirstElementBySelector } from './View';

declare global {
  interface Window {
    hydra: Hydra;
  }
}

export type PageEntryConstructor = new (...args: any[]) => PageEntry;
export type PageEntryDefinitionParameter =
  | ServiceDependencyDefinition
  | PagePartDependencyDefinition
  | PageElementContainer
  | ValueDependencyDefinition;
export type PagePartConstructor<EventType, T extends PagePart<EventType> = PagePart<EventType>> = new (...args: any[]) => T;
export type PagePartDefinitionParameter =
  | ServiceDependencyDefinition
  | PagePartDependencyDefinition
  | PageElementContainer
  | ValueDependencyDefinition
  | DataAttributesMarker;
export type ServiceConstructor = new (...args: any[]) => any;
export type ServiceDefinitionParameter = ServiceDependencyDefinition | ValueDependencyDefinition;
export interface PagePartOptions {
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
  private pageEntrieDefinitions: {
    [pageEntryName: string]: [PageEntryConstructor, PageEntryDefinitionParameter[]];
  } = {};
  private pagePartDefinitions: { [pagePartName: string]: [PagePartConstructor<any>, PagePartDefinitionParameter[]] } = {};
  private serviceDefinitions: { [serviceName: string]: [ServiceConstructor, ServiceDefinitionParameter[]] } = {};

  private services: { [serviceName: string]: any | undefined } = {};
  private pageParts: { [pagePartName: string]: PagePart<any> } = {};
  private pageEntries: { [pageEntryName: string]: Loadable } = {};
  private components: { [name: string]: BaseComponent | undefined } = {};

  static registerContext(context: HydraContext) {
    context.register(this.getInstance());
  }

  registerSubContext(context: HydraContext, options?: any) {
    context.register(this, options);
  }

  registerPageEntry(constructor: PageEntryConstructor, dependencies: PageEntryDefinitionParameter[]) {
    this.pageEntrieDefinitions[constructor.name] = [constructor, dependencies];
  }

  registerPagePart<EventType>(pagePartConstructor: PagePartConstructor<EventType>, dependencies: PagePartDefinitionParameter[]) {
    this.pagePartDefinitions[pagePartConstructor.name] = [pagePartConstructor, dependencies];
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

      Object.entries(this.pageEntrieDefinitions).forEach(([pageEntryName, [pageEntryConstructor, pageEntryDependencyDefinitions]]) => {
        this.pageEntries[pageEntryName] = this.constructPageEntry(pageEntryConstructor, pageEntryDependencyDefinitions);
      });

      const serviceLoadPromises = Object.values(this.services).map((s) => {
        if (typeof s.load === 'function') {
          return this.load(s);
        } else {
          return Promise.resolve();
        }
      });
      await Promise.all(serviceLoadPromises);
      const pagePartLoadPromises = Object.values(this.pageParts).map((pp) => this.load(pp));
      await Promise.all(pagePartLoadPromises);
      const pageEntryLoadPromises = Object.values(this.pageEntries).map((pe) => this.load(pe));
      await Promise.all(pageEntryLoadPromises);

      this.serviceDefinitions = {};
      this.pageEntrieDefinitions = {};
      this.pagePartDefinitions = {};
    } catch (err) {
      console.error('Error during load time', err);
    }
  }

  private newBoot() {}

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

  private constructPagePart<EventType, T extends PagePart<EventType>>(
    pagePartConstructor: PagePartConstructor<EventType, T>,
    parameters: PagePartDefinitionParameter[],
    options?: PagePartOptions
  ): T {
    const nameSuffix = options?.qualifier ? `_${options.qualifier}` : '';
    const pagePartName = `${pagePartConstructor.name}${nameSuffix}`;
    const alreadyConstructed = this.pageParts[pagePartName];
    if (alreadyConstructed) {
      return alreadyConstructed as T;
    }

    const dependencies = this.resolveDependencies(parameters, options, pagePartConstructor.name);
    const constructed = new pagePartConstructor(...dependencies, options);
    this.pageParts[pagePartName] = constructed;
    return constructed;
  }

  private constructPageEntry(pageEntryConstructor: PageEntryConstructor, parameters: PageEntryDefinitionParameter[]): Loadable {
    const alreadyConstructed = this.pageEntries[pageEntryConstructor.name];
    if (alreadyConstructed) {
      return alreadyConstructed;
    }

    const dependencies = this.resolveDependencies(parameters);
    this.pageEntries[pageEntryConstructor.name] = new pageEntryConstructor(...dependencies);
    return this.pageEntries[pageEntryConstructor.name];
  }

  private resolveDependencies(
    parameters: PagePartDefinitionParameter[] | PageEntryDefinitionParameter[],
    options?: PagePartOptions,
    pagePartName?: string
  ) {
    const dependencies = [];
    const elementDependencies: any = {};
    for (const param of parameters) {
      if (isServiceDependencyDefinition(param)) {
        dependencies.push(this.getServiceInstance(param.serviceType));
      } else if (isPagePartDependencyDefinition(param)) {
        dependencies.push(this.getPagePartInstance(param));
      } else if (isDataAttributesMarker(param)) {
        // Auto-discover elements from DOM using data attributes
        const elements = this.discoverElementsFromDataAttributes(pagePartName, options?.qualifier);
        dependencies.push(elements);
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
    pagePartName?: string,
    qualifier?: string
  ): Record<string, HTMLElement | HTMLElement[]> {
    if (!pagePartName) {
      throw new Error('Cannot discover elements via data attributes without a PagePart name');
    }

    const discovered = discoverPageParts(document);
    const pagePart = findPagePart(discovered, pagePartName, qualifier);

    if (!pagePart) {
      throw new Error(
        `Could not find PagePart "${pagePartName}"${qualifier ? ` with qualifier "${qualifier}"` : ''} in the DOM. ` +
          `Make sure to add data-hydra-pagepart="${pagePartName}" to an element.`
      );
    }

    return pagePart.elements;
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

  getPagePartInstance(definition: PagePartDependencyDefinition): Loadable {
    const ppd = this.pagePartDefinitions[definition.pagePartType.name];
    if (!ppd) {
      throw new Error(
        'Could not find definition for ' + definition.pagePartType.name + ' make sure you decorate it with the PagePart decorator'
      );
    }
    const [pagePartConstructor, pagePartDecoratorOptions] = ppd;
    return this.constructPagePart(pagePartConstructor, pagePartDecoratorOptions, definition.options);
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

export interface PagePartDependencyDefinition {
  pagePartType: new (...args: unknown[]) => Loadable;
  options?: PagePartOptions;
}

export function isPagePartDependencyDefinition(definition: unknown): definition is PagePartDependencyDefinition {
  return typeof definition === 'object' && definition !== null && 'pagePartType' in definition;
}

export function pagePart<EventType, T extends PagePart<EventType>>(
  pagePartType: PagePartConstructor<EventType, T>,
  options?: PagePartOptions
): PagePartDependencyDefinition {
  return { pagePartType, options };
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

/**
 * Marker for data-attribute based element discovery.
 * When used in PagePart registration, Hydra will auto-discover elements
 * from the DOM using data-hydra-element attributes.
 */
export interface DataAttributesMarker {
  __dataAttributes: true;
}

export function isDataAttributesMarker(value: unknown): value is DataAttributesMarker {
  return typeof value === 'object' && value !== null && '__dataAttributes' in value;
}

/**
 * Marker that tells Hydra to discover elements via data attributes.
 *
 * @example
 * ```typescript
 * // In context registration:
 * hydra.registerPagePart(NotificationPart, [dataAttributes()]);
 *
 * // In HTML:
 * <div data-hydra-pagepart="NotificationPart">
 *   <div data-hydra-element="container"></div>
 * </div>
 * ```
 */
export function dataAttributes(): DataAttributesMarker {
  return { __dataAttributes: true };
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
