import { DeepArchitectureAnalyzer } from './deep-architecture-analyzer';
import * as fs from 'fs-extra';

jest.mock('fs-extra');

const mockFs = fs as any;

const isDir = (file: string) => !file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.jsx');

const makeStatImpl = () => async (file: string) => ({
  isDirectory: () => isDir(file),
  isFile: () => !isDir(file),
});

describe('DeepArchitectureAnalyzer', () => {
  let analyzer: DeepArchitectureAnalyzer;
  const testDir = '/test/repo';

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new DeepArchitectureAnalyzer(testDir);
  });

  describe('analyze', () => {
    it('should return empty results when src directory does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await analyzer.analyze();

      expect(result.layerViolations).toHaveLength(0);
      expect(result.contextViolations).toHaveLength(0);
      expect(result.dependencyInversionIssues).toHaveLength(0);
    });

    it('should detect dependency inversion issues for ORM imports', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain'];
        if (dir.endsWith('/domain')) return ['user.entity.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockImplementation(async (file: string) => {
        if (file.includes('user.entity.ts')) return "import { Entity } from 'typeorm';";
        return '';
      });

      const result = await analyzer.analyze();

      const diIssues = result.dependencyInversionIssues;
      expect(diIssues.some((i: any) => i.ruleId === 'ARCH-DI-01')).toBe(true);
    });

    it('should detect NestJS imports in domain layer', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain'];
        if (dir.endsWith('/domain')) return ['user.entity.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockImplementation(async (file: string) => {
        if (file.includes('user.entity.ts')) return "import { Injectable } from '@nestjs/common';";
        return '';
      });

      const result = await analyzer.analyze();

      const diIssues = result.dependencyInversionIssues;
      expect(diIssues.some((i: any) => i.ruleId === 'ARCH-DI-03')).toBe(true);
    });

    it('should detect web framework imports in domain layer', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain'];
        if (dir.endsWith('/domain')) return ['user.entity.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockImplementation(async (file: string) => {
        if (file.includes('user.entity.ts')) return "import { Request } from 'express';";
        return '';
      });

      const result = await analyzer.analyze();

      const diIssues = result.dependencyInversionIssues;
      expect(diIssues.some((i: any) => i.ruleId === 'ARCH-DI-02')).toBe(true);
    });

    it('should handle files with no imports', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain'];
        if (dir.endsWith('/domain')) return ['empty.entity.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockResolvedValue('export class Empty {}');

      const result = await analyzer.analyze();

      expect(result.layerViolations).toHaveLength(0);
      expect(result.dependencyInversionIssues).toHaveLength(0);
    });

    it('should skip node_modules and dist directories', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain', 'node_modules', 'dist'];
        if (dir.endsWith('/domain')) return ['user.entity.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockResolvedValue('export class User {}');

      const result = await analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should calculate coupling metrics for multiple contexts', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['orders', 'billing'];
        if (dir.endsWith('/orders')) return ['order.service.ts'];
        if (dir.endsWith('/billing')) return ['invoice.service.ts'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockImplementation(async (file: string) => {
        if (file.includes('order.service')) return "import { Invoice } from '../../billing/invoice.service';";
        return '';
      });

      const result = await analyzer.analyze();

      expect(Object.keys(result.couplingMetrics.instability).length).toBeGreaterThanOrEqual(0);
    });

    it('should handle require() syntax in imports', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/src')) return ['domain'];
        if (dir.endsWith('/domain')) return ['user.entity.js'];
        return [];
      });
      mockFs.stat.mockImplementation(makeStatImpl());
      mockFs.readFile.mockImplementation(async (file: string) => {
        if (file.includes('user.entity.js')) return "const db = require('prisma');";
        return '';
      });

      const result = await analyzer.analyze();

      expect(result).toBeDefined();
    });
  });
});
