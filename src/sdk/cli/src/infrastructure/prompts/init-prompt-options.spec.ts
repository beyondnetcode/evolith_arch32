import { validateProjectName, CI_CD_OPTIONS, OBSERVABILITY_OPTIONS, FEATURE_OPTIONS, AGENT_OPTIONS } from './init-prompt-options';

describe('CI_CD_OPTIONS', () => {
  it('contains expected CI/CD platforms', () => {
    const values = CI_CD_OPTIONS.map(o => o.value);
    expect(values).toContain('github');
    expect(values).toContain('gitlab');
    expect(values).toContain('azure');
    expect(values).toContain('none');
  });

  it('all options have labels', () => {
    for (const opt of CI_CD_OPTIONS) {
      expect(opt.label).toBeDefined();
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe('OBSERVABILITY_OPTIONS', () => {
  it('contains expected observability levels', () => {
    const values = OBSERVABILITY_OPTIONS.map(o => o.value);
    expect(values).toContain('otel');
    expect(values).toContain('otel-traces');
    expect(values).toContain('minimal');
    expect(values).toContain('none');
  });
});

describe('FEATURE_OPTIONS', () => {
  it('contains expected features', () => {
    const values = FEATURE_OPTIONS.map(o => o.value);
    expect(values).toContain('otel');
    expect(values).toContain('acl');
    expect(values).toContain('bilingual');
    expect(values).toContain('hooks');
    expect(values).toContain('adr');
  });
});

describe('AGENT_OPTIONS', () => {
  it('contains expected agents', () => {
    const values = AGENT_OPTIONS.map(o => o.value);
    expect(values).toContain('bmad');
    expect(values).toContain('architecture');
    expect(values).toContain('qa');
    expect(values).toContain('sdlc');
  });
});

describe('validateProjectName', () => {
  it('returns error for empty input', () => {
    expect(validateProjectName(undefined)).toBeDefined();
    expect(validateProjectName('')).toBeDefined();
  });

  it('returns error for names with spaces', () => {
    expect(validateProjectName('my project')).toBeDefined();
    expect(validateProjectName(' foo')).toBeDefined();
  });

  it('returns error for names starting with number', () => {
    expect(validateProjectName('1project')).toBeDefined();
  });

  it('returns error for names with special characters', () => {
    expect(validateProjectName('proj$ect')).toBeDefined();
    expect(validateProjectName('project!')).toBeDefined();
  });

  it('accepts valid project names', () => {
    expect(validateProjectName('my-project')).toBeUndefined();
    expect(validateProjectName('my_project')).toBeUndefined();
    expect(validateProjectName('MyProject1')).toBeUndefined();
    expect(validateProjectName('a')).toBeUndefined();
  });

  it('returns English error messages', () => {
    expect(validateProjectName('')).toContain('Please enter');
    expect(validateProjectName('a b')).toContain('must not contain spaces');
    expect(validateProjectName('1x')).toContain('must start with a letter');
  });
});
