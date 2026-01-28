export default interface Loadable {
  load(): Promise<void> | void;
  unload?: () => Promise<void> | void;
}
