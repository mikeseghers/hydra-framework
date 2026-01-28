import { PageElementContainer, pageElements, PageElements } from './Hydra';

export function getAllElementsBySelector<T extends Element>(
  selector: string,
  type: new () => T,
  rootElement: Element | Document = document
): T[] {
  const elements = Array.from(rootElement.querySelectorAll(selector));
  return elements.map((element) => {
    if (element instanceof type) {
      return element;
    } else {
      throw new Error(`Could not find an HTMLElement with selector ${selector} of type ${type.name}`);
    }
  });
}

export function getFirstElement<T extends Element>(collection: HTMLCollectionOf<Element>, type: new () => T): T {
  const firstElement = Array.from(collection).shift();
  if (firstElement instanceof type) {
    return firstElement;
  } else {
    throw new Error(`First element in HTML Collection is not an HTML Element: ${firstElement}`);
  }
}

export function getFirstElementByClassName<T extends Element>(
  className: string,
  type: new () => T,
  rootElement: Element | Document = document
): T {
  try {
    return getFirstElement(rootElement.getElementsByClassName(className), type);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Could not find an HTMLElement by className ${className} (caused by: ${err.message})`);
    } else {
      throw new Error(`Could not find an HTMLElement by className ${className} (caused by: ${err})`);
    }
  }
}

export function getFirstElementByName<T extends Element>(name: string, type: new () => T, rootElement: Element | Document = document): T {
  const element = rootElement.querySelector(`[name="${name}"]`);
  if (element && element instanceof type) {
    return element;
  } else {
    throw new Error(`HTMLElement with name ${name} is not of type ${type.name}`);
  }
}

export function getFirstElementByTagName<T extends Element>(
  tagName: string,
  type: new () => T,
  rootElement: Element | Document = document
): T {
  try {
    return getFirstElement(rootElement.getElementsByTagName(tagName), type);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Could not find an HTMLElement with tagName ${tagName} (caused by: ${err.message})`);
    } else {
      throw new Error(`Could not find an HTMLElement with tagName ${tagName} (caused by: ${err})`);
    }
  }
}
export function getElementById<T extends Element>(id: string, type: new () => T): T {
  const elementById = getOptionalElementById(id, type);
  if (elementById) {
    return elementById;
  } else {
    throw new Error(`Could not find an HTMLElement with id ${id}`);
  }
}

export function getOptionalElementById<T extends Element>(id: string, type: new () => T): T | undefined {
  const elementById = document.getElementById(id) || undefined;
  if (elementById && !(elementById instanceof type)) {
    throw new Error(`HTMLElement with id ${id} is not of type ${type.name}`);
  } else {
    return elementById;
  }
}

export function getFirstElementBySelector<T extends Element>(
  selector: string,
  type: new () => T,
  rootElement: Element | Document = document
): T {
  const element = rootElement.querySelector(selector);
  if (element instanceof type) {
    return element;
  } else {
    throw new Error(
      `Could not find an HTMLElement with selector ${selector} of type ${type.name} on ${
        (rootElement as any).id || rootElement
      }. Query returned ${element}`
    );
  }
}

export function switchLinkHref(linkId: string, href: string): void {
  const link = getElementById(linkId, HTMLLinkElement);
  if (!link.href.endsWith(href)) {
    link.href = href;
  }
}

export function switchLayoutLink(hrefTemplate: string, layoutName?: string, knownLayouts?: string[]): void {
  if (layoutName && (!knownLayouts || knownLayouts.includes(layoutName))) {
    const href = hrefTemplate.replace('{}', layoutName);
    switchLinkHref('layout', href);
  } else {
    switchLinkHref('layout', '');
  }
}

export function cloneTemplateContent<T extends HTMLElement, PEC extends PageElementContainer>(
  htmlTemplateOrTemplateId: HTMLTemplateElement | string,
  type: new () => T,
  pec: PEC
): { rootElement: T; templateElements: PageElements<PEC> } {
  const htmlTemplate =
    htmlTemplateOrTemplateId instanceof HTMLTemplateElement
      ? htmlTemplateOrTemplateId
      : getElementById(htmlTemplateOrTemplateId, HTMLTemplateElement);
  const cloned = htmlTemplate.content.firstElementChild?.cloneNode(true);
  if (cloned instanceof type) {
    return { rootElement: cloned, templateElements: pageElements(pec, cloned) };
  } else {
    throw new Error(`Cloned template element has unexpected type`);
  }
}

export function getAncestorElementByType<T extends Element>(childElement: Element, type: new () => T): T | undefined {
  const parent = childElement.parentElement;
  if (parent instanceof type) {
    return parent;
  } else if (parent) {
    return getAncestorElementByType(parent, type);
  } else {
    return undefined;
  }
}

export function getAncestorElementByClassName<T extends Element>(
  className: string,
  childElement: Element,
  type: new () => T
): T | undefined {
  const parent = getAncestorElementByType(childElement, type);
  if (!parent) {
    return undefined;
  } else if (parent.classList.contains(className)) {
    return parent;
  } else {
    return getAncestorElementByClassName(className, parent, type);
  }
}
