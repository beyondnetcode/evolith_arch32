import * as yaml from 'yaml';
import { IConfigParser, IConfigParserProvider } from '@beyondnet/evolith-core-domain/domain/interfaces';

export class YamlConfigParserProvider implements IConfigParserProvider {
  createConfigParser(_format: string): IConfigParser {
    return new YamlConfigParserImpl();
  }
}

export class YamlConfigParserImpl implements IConfigParser {
  parse(content: string): unknown {
    return yaml.parse(content);
  }

  stringify(data: unknown): string {
    return yaml.stringify(data);
  }
}

export class JsonConfigParserProvider implements IConfigParserProvider {
  createConfigParser(_format: string): IConfigParser {
    return new JsonConfigParserImpl();
  }
}

export class JsonConfigParserImpl implements IConfigParser {
  parse(content: string): unknown {
    return JSON.parse(content);
  }

  stringify(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }
}