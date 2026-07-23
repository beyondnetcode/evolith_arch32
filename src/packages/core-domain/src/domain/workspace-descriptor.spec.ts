import {
  isWorkspaceDescriptor,
  enumerateWorkspaceProjects,
  normalizeProjectPath,
} from './workspace-descriptor';

describe('workspace-descriptor', () => {
  describe('isWorkspaceDescriptor', () => {
    it('returns true for valid workspace descriptor', () => {
      const doc = {
        kind: 'SatelliteWorkspace',
        spec: {
          projects: [{ name: 'project1', path: './src' }],
        },
      };
      expect(isWorkspaceDescriptor(doc)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isWorkspaceDescriptor(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isWorkspaceDescriptor('string')).toBe(false);
    });

    it('returns false when kind is not SatelliteWorkspace', () => {
      const doc = { kind: 'Other', spec: { projects: [] } };
      expect(isWorkspaceDescriptor(doc)).toBe(false);
    });

    it('returns false when spec is missing', () => {
      const doc = { kind: 'SatelliteWorkspace' };
      expect(isWorkspaceDescriptor(doc)).toBe(false);
    });

    it('returns false when projects is not an array', () => {
      const doc = { kind: 'SatelliteWorkspace', spec: { projects: 'not-array' } };
      expect(isWorkspaceDescriptor(doc)).toBe(false);
    });
  });

  describe('enumerateWorkspaceProjects', () => {
    it('returns projects from valid descriptor', () => {
      const doc = {
        kind: 'SatelliteWorkspace',
        spec: {
          projects: [
            { name: 'frontend', path: './frontend' },
            { name: 'backend', path: './backend' },
          ],
        },
      };
      const projects = enumerateWorkspaceProjects(doc);
      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('frontend');
      expect(projects[1].name).toBe('backend');
    });

    it('returns empty array for non-descriptor', () => {
      expect(enumerateWorkspaceProjects({})).toEqual([]);
    });

    it('filters out invalid entries', () => {
      const doc = {
        kind: 'SatelliteWorkspace',
        spec: {
          projects: [
            { name: 'valid', path: './src' },
            null,
            { name: 123, path: './bad' },
            { path: './no-name' },
          ],
        },
      };
      const projects = enumerateWorkspaceProjects(doc);
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('valid');
    });

    it('normalizes paths', () => {
      const doc = {
        kind: 'SatelliteWorkspace',
        spec: {
          projects: [{ name: 'p', path: './src/' }],
        },
      };
      const projects = enumerateWorkspaceProjects(doc);
      expect(projects[0].path).toBe('src');
    });
  });

  describe('normalizeProjectPath', () => {
    it('strips leading ./', () => {
      expect(normalizeProjectPath('./src')).toBe('src');
    });

    it('strips trailing slashes', () => {
      expect(normalizeProjectPath('src/')).toBe('src');
    });

    it('normalizes empty/root to .', () => {
      expect(normalizeProjectPath('')).toBe('.');
      expect(normalizeProjectPath('./')).toBe('.');
      expect(normalizeProjectPath('.//')).toBe('.');
    });

    it('preserves normal paths', () => {
      expect(normalizeProjectPath('src/components')).toBe('src/components');
    });
  });
});
