import { AbstractBaseComponent } from './AbstractBaseComponent';
import { Component, FilteredKeys } from './Component';
import { PageElementContainer, PageElementFromContainerType } from './Hydra';

interface SubComponentRepository {
  [key: string]: Component<any, any>[];
}

export abstract class AbstractComponent<RootElement extends HTMLElement, PEC extends PageElementContainer>
  extends AbstractBaseComponent
  implements Component<RootElement, PEC>
{
  readonly rootElement: RootElement;
  readonly elements: PageElementFromContainerType<PEC>;

  constructor(rootElement: RootElement, elements: PageElementFromContainerType<PEC>) {
    super();
    this.rootElement = rootElement;
    this.elements = elements;
    (this.rootElement as any).hydraComponent = this;
  }

  addSubComponent(c: Component<HTMLElement, any>, parentElement: FilteredKeys<PageElementFromContainerType<PEC>, HTMLElement>) {
    (this.elements[parentElement] as HTMLElement).appendChild(c.rootElement);
    return this;
  }

  removeSubComponent(c: Component<HTMLElement, any>) {
    c.rootElement.remove();
    delete (c.rootElement as any).hydraComponent;
    c.destroy();
    return this;
  }

  subComponentsInParentElement<T extends Component<HTMLElement, any> = Component<HTMLElement, any>>(
    parentElement: FilteredKeys<PageElementFromContainerType<PEC>, HTMLElement>
  ): T[] {
    return Array.from((this.elements[parentElement] as HTMLElement).children).map((child) => (child as any).hydraComponent) as T[];
  }
}
