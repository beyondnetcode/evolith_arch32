import { YamlConfigParserProvider, JsonConfigParserProvider } from './config-parser.provider';

describe('Config Parser Providers', () => {
  describe('YamlConfigParserProvider', () => {
    it('should parse YAML content', () => {
      const provider = new YamlConfigParserProvider();
      const parser = provider.createConfigParser('yaml');
      const result = parser.parse('key: value\nlist:\n  - a\n  - b');
      expect(result).toEqual({ key: 'value', list: ['a', 'b'] });
    });

    it('should stringify to YAML', () => {
      const provider = new YamlConfigParserProvider();
      const parser = provider.createConfigParser('yaml');
      const result = parser.stringify({ key: 'value' });
      expect(result).toContain('key: value');
    });
  });

  describe('JsonConfigParserProvider', () => {
    it('should parse JSON content', () => {
      const provider = new JsonConfigParserProvider();
      const parser = provider.createConfigParser('json');
      const result = parser.parse('{"key":"value","nested":{"a":1}}');
      expect(result).toEqual({ key: 'value', nested: { a: 1 } });
    });

    it('should stringify to JSON', () => {
      const provider = new JsonConfigParserProvider();
      const parser = provider.createConfigParser('json');
      const result = parser.stringify({ key: 'value' });
      expect(result).toBe('{\n  "key": "value"\n}');
    });

    it('should throw on invalid JSON', () => {
      const provider = new JsonConfigParserProvider();
      const parser = provider.createConfigParser('json');
      expect(() => parser.parse('{invalid}')).toThrow();
    });
  });
});
