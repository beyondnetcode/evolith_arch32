import {
  isWithin,
  declareScope,
  activateScope,
  narrowScope,
  resolveScope,
  ScopeContractError,
  type ScopeSpec,
  type ScopeEffect,
} from './scope-contract';

describe('scope-contract', () => {
  describe('isWithin', () => {
    it('returns true when child is the same as parent', () => {
      expect(isWithin('/project', '/project')).toBe(true);
    });

    it('returns true when child is beneath parent', () => {
      expect(isWithin('/project', '/project/src')).toBe(true);
      expect(isWithin('/project', '/project/src/index.ts')).toBe(true);
    });

    it('returns false when child is outside parent', () => {
      expect(isWithin('/project', '/other')).toBe(false);
      expect(isWithin('/project', '/project2')).toBe(false);
    });

    it('returns false for traversal sequences', () => {
      expect(isWithin('/project', '/project/../other')).toBe(false);
    });

    it('handles root as parent', () => {
      expect(isWithin('/', '/anything')).toBe(true);
    });
  });

  describe('declareScope', () => {
    const validSpec: ScopeSpec = {
      id: 'test-op',
      root: '/project',
      include: ['src/'],
      effects: ['read'],
      declaredBy: 'test-user',
      reason: 'testing',
    };

    it('creates a declared scope from valid spec', () => {
      const scope = declareScope(validSpec);
      expect(scope.state).toBe('declared');
      expect(scope.id).toBe('test-op');
      expect(scope.root).toBe('/project');
      expect(scope.include).toEqual(['/project/src']);
      expect(scope.effects).toEqual(['read']);
      expect(scope.declaredBy).toBe('test-user');
      expect(scope.reason).toBe('testing');
    });

    it('throws when id is missing', () => {
      expect(() => declareScope({ ...validSpec, id: '' })).toThrow(ScopeContractError);
    });

    it('throws when declaredBy is missing', () => {
      expect(() => declareScope({ ...validSpec, declaredBy: '' })).toThrow(ScopeContractError);
    });

    it('throws when reason is missing', () => {
      expect(() => declareScope({ ...validSpec, reason: '' })).toThrow(ScopeContractError);
    });

    it('throws when include list is empty', () => {
      expect(() => declareScope({ ...validSpec, include: [] })).toThrow(ScopeContractError);
    });

    it('throws when effects list is empty', () => {
      expect(() => declareScope({ ...validSpec, effects: [] })).toThrow(ScopeContractError);
    });

    it('throws when root contains traversal', () => {
      expect(() => declareScope({ ...validSpec, root: '/project/../other' })).toThrow(ScopeContractError);
    });

    it('throws when include selector escapes root', () => {
      expect(() => declareScope({ ...validSpec, include: ['../../etc'] })).toThrow(ScopeContractError);
    });

    it('handles self-selector (.) as include', () => {
      const scope = declareScope({ ...validSpec, include: ['.'] });
      expect(scope.include).toEqual(['/project']);
    });
  });

  describe('activateScope', () => {
    it('creates effective scope from declared scope', () => {
      const declared = declareScope({
        id: 'test',
        root: '/project',
        include: ['src/'],
        effects: ['read'],
        declaredBy: 'user',
        reason: 'testing',
      });
      const effective = activateScope(declared);
      expect(effective.state).toBe('effective');
      expect(effective.declared).toBe(declared);
      expect(effective.include).toEqual(declared.include);
    });
  });

  describe('narrowScope', () => {
    const declared = declareScope({
      id: 'test',
      root: '/project',
      include: ['src/', 'docs/'],
      effects: ['read', 'write'],
      declaredBy: 'user',
      reason: 'testing',
    });

    it('narrows include by dropping selectors not in scope', () => {
      const narrowed = narrowScope(declared, { include: ['src/'] });
      expect(narrowed.include).toEqual(['/project/src']);
      expect(narrowed.exclude).toEqual([]);
    });

    it('narrows effects by intersection', () => {
      const narrowed = narrowScope(declared, { effects: ['read'] });
      expect(narrowed.effects).toEqual(['read']);
    });

    it('adds exclusions', () => {
      const narrowed = narrowScope(declared, { exclude: ['src/test/'] });
      expect(narrowed.exclude).toContain('/project/src/test');
    });

    it('never enlarges scope — drops selectors outside current include', () => {
      const narrowed = narrowScope(declared, { include: ['src/', 'nonexistent/'] });
      // nonexistent/ is not in the original include, so it's dropped
      expect(narrowed.include).toEqual(['/project/src']);
    });

    it('can narrow to empty scope (refuses everything)', () => {
      const narrowed = narrowScope(declared, { include: [] });
      expect(narrowed.include).toEqual([]);
      expect(narrowed.effects).toEqual(['read', 'write']);
    });
  });

  describe('resolveScope', () => {
    const validDeclared = declareScope({
      id: 'test',
      root: '/project',
      include: ['src/'],
      effects: ['read'],
      declaredBy: 'user',
      reason: 'testing',
    });

    it('returns ok:true with effective scope on success', () => {
      const result = resolveScope(validDeclared, () => ({}));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.scope.state).toBe('effective');
      }
    });

    it('returns ok:false when resolver throws', () => {
      const result = resolveScope(validDeclared, () => {
        throw new Error('resolution failed');
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('resolution failed');
      }
    });

    it('returns ok:false when resolver returns null', () => {
      const result = resolveScope(validDeclared, () => null as any);
      expect(result.ok).toBe(false);
    });
  });
});
