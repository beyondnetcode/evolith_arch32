import { DynamicModule } from '@nestjs/common';

export const CACHE_MANAGER = 'CACHE_MANAGER';

const mockCacheProvider = {
  provide: CACHE_MANAGER,
  useValue: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  },
};

class MockCacheModule {
  static register(_options?: any): DynamicModule {
    return {
      module: MockCacheModule,
      providers: [mockCacheProvider],
      exports: [CACHE_MANAGER],
    };
  }

  static forRoot(_options?: any): DynamicModule {
    return {
      module: MockCacheModule,
      providers: [mockCacheProvider],
      exports: [CACHE_MANAGER],
    };
  }
}

export const CacheModule = MockCacheModule;
