import { describe, it, expect } from 'vitest';
import Hydra from '../src/Hydra';
import { service } from '../src/Hydra';
import type { default as PageEntry } from '../src/PageEntry';

/**
 * Bootstrap Tests
 * 
 * These tests demonstrate how to initialize and bootstrap Hydra
 * in your application. The bootstrap process involves:
 * 1. Getting the Hydra singleton instance
 * 2. Registering services, page parts and page entries
 * 3. Letting Hydra automatically boot when the page loads
 */
describe('Hydra Bootstrap', () => {
  
  /**
   * Example 1: Basic Bootstrap
   * 
   * The simplest way to use Hydra is to get the instance and
   * register your components directly.
   */
  it('should bootstrap with a simple page entry', async () => {
    // Define a simple page entry
    class SimplePage implements PageEntry {
      public loaded = false;
      
      async load() {
        this.loaded = true;
      }
    }
    
    // Get the Hydra singleton instance
    const hydra = Hydra.getInstance();
    
    // Register the page entry
    hydra.registerPageEntry(SimplePage, []);
    
    // Manually trigger boot (normally happens on window.onload)
    await hydra['boot']();
    
    // Verify the page was loaded
    const pageEntries = hydra['pageEntries'];
    expect(pageEntries['SimplePage']).toBeDefined();
  });
  
  /**
   * Example 2: Bootstrap with Services
   * 
   * Services are singleton instances that provide shared functionality.
   * They are registered first and then injected into page entries.
   */
  it('should bootstrap with services', async () => {
    // Define a service
    class DataService {
      public data: string[] = [];
      
      fetchData(): string[] {
        this.data = ['item1', 'item2', 'item3'];
        return this.data;
      }
    }
    
    // Define a page entry that uses the service
    class HomePage implements PageEntry {
      public loadedData: string[] = [];
      
      constructor(private dataService: DataService) {}
      
      async load() {
        this.loadedData = this.dataService.fetchData();
      }
    }
    
    // Bootstrap Hydra
    const hydra = Hydra.getInstance();
    
    // Register service first
    hydra.registerService(DataService);
    
    // Register page entry with service dependency
    hydra.registerPageEntry(HomePage, [service(DataService)]);
    
    // Boot
    await hydra['boot']();
    
    // Verify service was created and used
    const dataService = hydra.getServiceInstance(DataService);
    expect(dataService.data).toEqual(['item1', 'item2', 'item3']);
  });
  
  /**
   * Example 3: Bootstrap with Context
   * 
   * Using contexts is the recommended way to organize your
   * registrations. Contexts group related services and components.
   */
  it('should bootstrap using context registration', async () => {
    // Define services
    class ApiService {
      baseUrl = 'https://api.example.com';
      
      get(endpoint: string): Promise<any> {
        return Promise.resolve({ url: `${this.baseUrl}${endpoint}` });
      }
    }
    
    class AuthService {
      isLoggedIn = false;
      
      login(username: string, password: string): void {
        this.isLoggedIn = true;
      }
    }
    
    // Define page entry
    class DashboardPage implements PageEntry {
      public apiResponse: any = null;
      
      constructor(
        private apiService: ApiService,
        private authService: AuthService
      ) {}
      
      async load() {
        if (!this.authService.isLoggedIn) {
          this.authService.login('user', 'pass');
        }
        this.apiResponse = await this.apiService.get('/dashboard');
      }
    }
    
    // Create a context that registers everything
    const AppContext = {
      register(hydra: Hydra) {
        // Register services
        hydra.registerService(ApiService);
        hydra.registerService(AuthService);
        
        // Register page entry
        hydra.registerPageEntry(DashboardPage, [
          service(ApiService),
          service(AuthService)
        ]);
      }
    };
    
    // Bootstrap using the context
    Hydra.registerContext(AppContext);
    
    // Boot
    const hydra = Hydra.getInstance();
    await hydra['boot']();
    
    // Verify everything was initialized
    const authService = hydra.getServiceInstance(AuthService);
    expect(authService.isLoggedIn).toBe(true);
  });
  
  /**
   * Example 4: Bootstrap with Multiple Contexts
   * 
   * Large applications can be organized into multiple contexts,
   * each handling a specific domain or feature area.
   */
  it('should bootstrap with multiple contexts', async () => {
    // Auth domain
    class AuthService {
      token: string | null = null;
      
      login() {
        this.token = 'abc123';
      }
    }
    
    // Data domain
    class CacheService {
      cache: Map<string, any> = new Map();
      
      set(key: string, value: any) {
        this.cache.set(key, value);
      }
      
      get(key: string) {
        return this.cache.get(key);
      }
    }
    
    class DataService {
      constructor(private cacheService: CacheService) {}
      
      fetchWithCache(key: string): any {
        if (this.cacheService.get(key)) {
          return this.cacheService.get(key);
        }
        const data = { value: 'fresh data' };
        this.cacheService.set(key, data);
        return data;
      }
    }
    
    // Page entry using both domains
    class AppPage implements PageEntry {
      public data: any = null;
      
      constructor(
        private authService: AuthService,
        private dataService: DataService
      ) {}
      
      async load() {
        this.authService.login();
        this.data = this.dataService.fetchWithCache('user-data');
      }
    }
    
    // Define contexts for each domain
    const AuthContext = {
      register(hydra: Hydra) {
        hydra.registerService(AuthService);
      }
    };
    
    const DataContext = {
      register(hydra: Hydra) {
        hydra.registerService(CacheService);
        hydra.registerService(DataService, [service(CacheService)]);
      }
    };
    
    const AppContext = {
      register(hydra: Hydra) {
        hydra.registerPageEntry(AppPage, [
          service(AuthService),
          service(DataService)
        ]);
      }
    };
    
    // Register all contexts
    Hydra.registerContext(AuthContext);
    Hydra.registerContext(DataContext);
    Hydra.registerContext(AppContext);
    
    // Boot
    const hydra = Hydra.getInstance();
    await hydra['boot']();
    
    // Verify everything works together
    const authService = hydra.getServiceInstance(AuthService);
    const cacheService = hydra.getServiceInstance(CacheService);
    
    expect(authService.token).toBe('abc123');
    expect(cacheService.get('user-data')).toEqual({ value: 'fresh data' });
  });
  
  /**
   * Example 5: Real-World Bootstrap Pattern
   * 
   * This example shows a complete bootstrap pattern you might
   * use in a production application.
   */
  it('should demonstrate a real-world bootstrap pattern', async () => {
    // Services
    class ConfigService {
      apiUrl = 'https://api.example.com';
      timeout = 5000;
    }
    
    class LoggerService {
      logs: string[] = [];
      
      log(message: string) {
        this.logs.push(`[${new Date().toISOString()}] ${message}`);
      }
    }
    
    class ApiService {
      constructor(
        private config: ConfigService,
        private logger: LoggerService
      ) {}
      
      async get(endpoint: string): Promise<any> {
        this.logger.log(`GET ${endpoint}`);
        return { data: 'response' };
      }
    }
    
    // Page entry
    class MainPage implements PageEntry {
      constructor(
        private logger: LoggerService,
        private api: ApiService
      ) {}
      
      async load() {
        this.logger.log('MainPage loading');
        await this.api.get('/init');
        this.logger.log('MainPage loaded');
      }
    }
    
    // Application context
    const ApplicationContext = {
      register(hydra: Hydra) {
        // Infrastructure services
        hydra.registerService(ConfigService);
        hydra.registerService(LoggerService);
        
        // Domain services
        hydra.registerService(ApiService, [
          service(ConfigService),
          service(LoggerService)
        ]);
        
        // Page entries
        hydra.registerPageEntry(MainPage, [
          service(LoggerService),
          service(ApiService)
        ]);
      }
    };
    
    // Bootstrap
    Hydra.registerContext(ApplicationContext);
    const hydra = Hydra.getInstance();
    await hydra['boot']();
    
    // Verify the complete flow
    const logger = hydra.getServiceInstance(LoggerService);
    expect(logger.logs).toHaveLength(3);
    expect(logger.logs[0]).toContain('MainPage loading');
    expect(logger.logs[1]).toContain('GET /init');
    expect(logger.logs[2]).toContain('MainPage loaded');
  });
});