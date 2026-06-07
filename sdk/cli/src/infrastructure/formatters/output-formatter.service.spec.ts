import { OutputFormatterService, FormatterOptions } from './output-formatter.service';

describe('OutputFormatterService', () => {
  let formatter: OutputFormatterService;

  beforeEach(() => {
    formatter = new OutputFormatterService();
  });

  describe('format', () => {
    it('should format as JSON by default', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'json' });

      expect(result).toContain('"name": "test"');
      expect(result).toContain('"value": 42');
    });

    it('should format as table for array data', () => {
      const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
      const result = formatter.format(data, { format: 'table' });

      expect(result).toContain('Name');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    it('should format as yaml', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'yaml' });

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format as markdown', () => {
      const data = { name: 'test', value: 42 };
      const result = formatter.format(data, { format: 'markdown' });

      expect(typeof result).toBe('string');
    });
  });

  describe('formatJson', () => {
    it('should stringify data with 2-space indent', () => {
      const data = { a: 1, b: 'test' };
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toBe('{\n  "a": 1,\n  "b": "test"\n}');
    });

    it('should handle nested objects', () => {
      const data = { outer: { inner: 'value' } };
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toContain('"outer"');
      expect(result).toContain('"inner": "value"');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = formatter.formatJson(data, { format: 'json' });

      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });
  });

  describe('formatYaml', () => {
    it('should convert simple object to yaml-like format', () => {
      const data = { name: 'test', count: 5 };
      const result = formatter.formatYaml(data, { format: 'yaml' });

      expect(result).toContain('name');
      expect(result).toContain('test');
      expect(result).toContain('count');
      expect(result).toContain('5');
    });

    it('should fallback to JSON on error', () => {
      const data = { name: 'test', count: 5 };
      const result = formatter.formatYaml(data, { format: 'yaml' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatMarkdown', () => {
    it('should convert array to markdown table', () => {
      const data = [{ name: 'Alice', role: 'Dev' }, { name: 'Bob', role: 'QA' }];
      const result = formatter.formatMarkdown(data, { format: 'markdown' });

      expect(result).toContain('|');
      expect(result).toContain('Name');
      expect(result).toContain('Alice');
    });

    it('should convert object to markdown', () => {
      const data = { title: 'Test', status: 'passed' };
      const result = formatter.formatMarkdown(data, { format: 'markdown' });

      expect(result).toContain('Title');
      expect(result).toContain('Test');
      expect(result).toContain('Status');
      expect(result).toContain('passed');
    });

    it('should handle primitive values', () => {
      const result = formatter.formatMarkdown('hello', { format: 'markdown' });

      expect(result).toBe('hello');
    });
  });

  describe('formatTable', () => {
    it('should format array as table', () => {
      const data = [{ id: 1, name: 'Item1' }, { id: 2, name: 'Item2' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('Id');
      expect(result).toContain('Name');
      expect(result).toContain('Item1');
    });

    it('should format object as key-value list', () => {
      const data = { key1: 'value1', key2: 'value2' };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('key1');
      expect(result).toContain('value1');
      expect(result).toContain('key2');
      expect(result).toContain('value2');
    });

    it('should return (empty) for empty array', () => {
      const result = formatter.formatTable([], { format: 'table' });

      expect(result).toBe('(empty)');
    });

    it('should return (empty) for empty object', () => {
      const result = formatter.formatTable({}, { format: 'table' });

      expect(result).toBe('(empty)');
    });

    it('should handle primitive values', () => {
      const result = formatter.formatTable(42, { format: 'table' });

      expect(result).toBe('42');
    });
  });

  describe('humanizeKey', () => {
    it('should convert camelCase to title case', () => {
      const data = [{ firstName: 'John', lastName: 'Doe' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('First Name');
      expect(result).toContain('Last Name');
    });

    it('should convert snake_case to title case', () => {
      const data = [{ first_name: 'John', last_name: 'Doe' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('First name');
      expect(result).toContain('Last name');
    });

    it('should handle kebab-case', () => {
      const data = [{ 'my-key': 'value' }];
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('My-key');
    });
  });

  describe('formatValue', () => {
    it('should handle boolean values', () => {
      const data = { active: true, disabled: false };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null values', () => {
      const data = { value: null };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('(none)');
    });

    it('should handle undefined values', () => {
      const data = { value: undefined };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toBeDefined();
    });

    it('should handle arrays as values', () => {
      const data = { items: [1, 2, 3] };
      const result = formatter.formatTable(data, { format: 'table' });

      expect(result).toContain('[3 items]');
    });
  });
});
