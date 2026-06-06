import { CatalogLoader, catalogLoader } from './catalog-loader';

describe('CatalogLoader', () => {
  let loader: CatalogLoader;

  beforeEach(() => {
    loader = new CatalogLoader();
    loader.reload();
  });

  describe('loadRuntimeCatalog', () => {
    it('should load runtimes from config', () => {
      const runtimes = loader.loadRuntimeCatalog();
      expect(Array.isArray(runtimes)).toBe(true);
      expect(runtimes.length).toBeGreaterThan(0);
    });

    it('should include nodejs runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      const nodejs = runtimes.find(r => r.id === 'nodejs');
      expect(nodejs).toBeDefined();
      expect(nodejs?.name).toBe('Node.js');
    });

    it('should include dotnet runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      const dotnet = runtimes.find(r => r.id === 'dotnet');
      expect(dotnet).toBeDefined();
      expect(dotnet?.name).toBe('.NET');
    });

    it('should include python runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      const python = runtimes.find(r => r.id === 'python');
      expect(python).toBeDefined();
      expect(python?.name).toBe('Python');
    });

    it('should include typescript runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      const typescript = runtimes.find(r => r.id === 'typescript');
      expect(typescript).toBeDefined();
      expect(typescript?.name).toBe('TypeScript');
    });

    it('should have defaultVersion for each runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      for (const runtime of runtimes) {
        expect(runtime.defaultVersion).toBeDefined();
      }
    });

    it('should have frameworks for nodejs', () => {
      const runtimes = loader.loadRuntimeCatalog();
      const nodejs = runtimes.find(r => r.id === 'nodejs');
      expect(nodejs?.frameworks).toBeDefined();
      expect(nodejs?.frameworks.length).toBeGreaterThan(0);
    });

    it('should have databases for each runtime', () => {
      const runtimes = loader.loadRuntimeCatalog();
      for (const runtime of runtimes) {
        expect(Array.isArray(runtime.databases)).toBe(true);
        expect(runtime.databases.length).toBeGreaterThan(0);
      }
    });
  });

  describe('loadToolCatalog', () => {
    it('should load tool catalog with phases', () => {
      const catalog = loader.loadToolCatalog();
      expect(catalog.phases).toBeDefined();
      expect(typeof catalog.phases).toBe('object');
    });

    it('should include all phases', () => {
      const catalog = loader.loadToolCatalog();
      expect(catalog.phases['phase-0']).toBeDefined();
      expect(catalog.phases['phase-1']).toBeDefined();
      expect(catalog.phases['phase-2']).toBeDefined();
      expect(catalog.phases['phase-3']).toBeDefined();
      expect(catalog.phases['phase-4']).toBeDefined();
      expect(catalog.phases['phase-5']).toBeDefined();
    });

    it('should have tool metadata for phases with tool groups', () => {
      const catalog = loader.loadToolCatalog();
      // Phase-0 doesn't have toolGroups, only phases 1-5 have them
      for (const [phase, definition] of Object.entries(catalog.phases)) {
        expect(definition).toHaveProperty('description');
        expect(definition).toHaveProperty('gateChecks');
        expect(definition).toHaveProperty('artifacts');
        // Only phases >= 1 have toolGroups and defaultTools
        if (parseInt(phase.split('-')[1]) >= 1) {
          expect(definition).toHaveProperty('defaultTools');
          expect(definition).toHaveProperty('toolGroups');
        }
      }
    });
  });

  describe('getMonorepoOptions', () => {
    it('should return monorepo options', () => {
      const options = loader.getMonorepoOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
    });

    it('should include none option', () => {
      const options = loader.getMonorepoOptions();
      const none = options.find(o => o.id === 'none');
      expect(none).toBeDefined();
    });

    it('should include nx option', () => {
      const options = loader.getMonorepoOptions();
      const nx = options.find(o => o.id === 'nx');
      expect(nx).toBeDefined();
    });

    it('should include npm-workspaces option', () => {
      const options = loader.getMonorepoOptions();
      const npm = options.find(o => o.id === 'npm-workspaces');
      expect(npm).toBeDefined();
    });
  });

  describe('getArchitecturePatterns', () => {
    it('should return architecture patterns', () => {
      const patterns = loader.getArchitecturePatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should include clean architecture', () => {
      const patterns = loader.getArchitecturePatterns();
      const clean = patterns.find(p => p.id === 'clean');
      expect(clean).toBeDefined();
    });

    it('should include hexagonal architecture', () => {
      const patterns = loader.getArchitecturePatterns();
      const hexagonal = patterns.find(p => p.id === 'hexagonal');
      expect(hexagonal).toBeDefined();
    });

    it('should include DDD architecture', () => {
      const patterns = loader.getArchitecturePatterns();
      const ddd = patterns.find(p => p.id === 'ddd');
      expect(ddd).toBeDefined();
    });

    it('should have layers for each pattern', () => {
      const patterns = loader.getArchitecturePatterns();
      for (const pattern of patterns) {
        expect(Array.isArray(pattern.layers)).toBe(true);
        expect(pattern.layers.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getDefaultDatabase', () => {
    it('should return postgresql for nodejs', () => {
      const db = loader.getDefaultDatabase('nodejs');
      expect(db).toBe('postgresql');
    });

    it('should return sqlserver for dotnet', () => {
      const db = loader.getDefaultDatabase('dotnet');
      expect(db).toBe('sqlserver');
    });

    it('should return postgresql for python', () => {
      const db = loader.getDefaultDatabase('python');
      expect(db).toBe('postgresql');
    });

    it('should return postgresql as fallback for unknown runtime', () => {
      const db = loader.getDefaultDatabase('unknown');
      expect(db).toBe('postgresql');
    });
  });

  describe('getApiProtocols', () => {
    it('should return API protocols', () => {
      const protocols = loader.getApiProtocols();
      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
    });

    it('should include REST protocol', () => {
      const protocols = loader.getApiProtocols();
      const rest = protocols.find(p => p.id === 'rest');
      expect(rest).toBeDefined();
    });
  });

  describe('reload', () => {
    it('should reload catalogs', () => {
      const first = loader.loadRuntimeCatalog();
      loader.reload();
      const second = loader.loadRuntimeCatalog();

      expect(first).toEqual(second);
    });
  });

  describe('singleton instance', () => {
    it('should export catalogLoader singleton', () => {
      expect(catalogLoader).toBeDefined();
      expect(catalogLoader.loadRuntimeCatalog).toBeDefined();
    });
  });
});