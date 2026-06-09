import {
  JsonConfigParserImpl,
  JsonConfigParserProvider,
  YamlConfigParserImpl,
  YamlConfigParserProvider,
} from './config-parser.provider';

describe('Config parser providers', () => {
  it('creates YAML parsers that parse and stringify content', () => {
    const parser = new YamlConfigParserProvider().createConfigParser('yaml');

    expect(parser).toBeInstanceOf(YamlConfigParserImpl);
    expect(parser.parse('name: demo\nphase: F1\n')).toEqual({ name: 'demo', phase: 'F1' });
    expect(parser.stringify({ name: 'demo' })).toContain('name: demo');
  });

  it('creates JSON parsers that parse and stringify content', () => {
    const parser = new JsonConfigParserProvider().createConfigParser('json');

    expect(parser).toBeInstanceOf(JsonConfigParserImpl);
    expect(parser.parse('{"name":"demo"}')).toEqual({ name: 'demo' });
    expect(parser.stringify({ name: 'demo' })).toBe('{\n  "name": "demo"\n}');
  });
});
