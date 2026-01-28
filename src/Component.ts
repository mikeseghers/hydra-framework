import { BaseComponent } from './BaseComponent';
import { PageElementContainer, PageElementFromContainerType } from './Hydra';

export type FilteredKeys<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T];
export interface Component<RootElement extends HTMLElement, PEC extends PageElementContainer> extends BaseComponent {
  readonly rootElement: RootElement;
  readonly elements: PageElementFromContainerType<PEC>;
  addSubComponent(component: Component<HTMLElement, any>, elementName: FilteredKeys<PageElementFromContainerType<PEC>, HTMLElement>): this;
  removeSubComponent(component: Component<HTMLElement, any>): this;
}
