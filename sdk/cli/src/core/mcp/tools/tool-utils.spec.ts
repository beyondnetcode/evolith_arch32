import { getFileSystem, clearFileSystemCache } from './tool-utils';

// ── mock the container ────────────────────────────────────────────────────────

const mockFs = { exists: jest.fn() };
const mockCreateFileSystem = jest.fn().mockReturnValue(mockFs);

jest.mock('../../abstractions', () => ({
  getContainer: jest.fn(() => ({ createFileSystem: mockCreateFileSystem })),
}));

import { getContainer } from '../../abstractions';

beforeEach(() => {
  jest.clearAllMocks();
  clearFileSystemCache();
});

// ── getFileSystem ─────────────────────────────────────────────────────────────

describe('getFileSystem', () => {
  it('returns a filesystem instance from the container', () => {
    const fs = getFileSystem();
    expect(fs).toBe(mockFs);
  });

  it('caches the instance — createFileSystem called only once', () => {
    getFileSystem();
    getFileSystem();
    getFileSystem();
    expect(mockCreateFileSystem).toHaveBeenCalledTimes(1);
  });

  it('re-creates the instance after clearFileSystemCache', () => {
    getFileSystem();
    clearFileSystemCache();
    getFileSystem();
    expect(mockCreateFileSystem).toHaveBeenCalledTimes(2);
  });
});

// ── clearFileSystemCache ──────────────────────────────────────────────────────

describe('clearFileSystemCache', () => {
  it('does not throw when cache is already empty', () => {
    expect(() => clearFileSystemCache()).not.toThrow();
    expect(() => clearFileSystemCache()).not.toThrow();
  });
});
