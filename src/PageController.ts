import Loadable from './Loadable';

/**
 * PageController - Top-level controller for a page or view.
 *
 * PageControllers coordinate components and handle the main logic for a page.
 * They receive their dependencies through constructor injection and implement
 * the load() method for initialization.
 *
 * @example
 * ```typescript
 * class DashboardPage implements PageController {
 *   constructor(
 *     private userService: UserService,
 *     private notifications: NotificationMediator
 *   ) {}
 *
 *   async load(): Promise<void> {
 *     const user = await this.userService.getCurrentUser();
 *     this.notifications.show(`Welcome, ${user.name}!`);
 *   }
 * }
 * ```
 */
export default interface PageController extends Loadable {}
