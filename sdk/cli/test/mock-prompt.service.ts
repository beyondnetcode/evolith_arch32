export class MockPromptService {
  showIntro = jest.fn();
  showOutro = jest.fn();
  showInfo = jest.fn();
  showSuccess = jest.fn();
  showWarning = jest.fn();
  showError = jest.fn();
  startSpinner = jest.fn();
  stopSpinner = jest.fn();

  select = jest.fn().mockResolvedValue('test-value');
  text = jest.fn().mockResolvedValue('test-value');
  multiselect = jest.fn().mockResolvedValue(['discovery']);
  confirm = jest.fn().mockResolvedValue(true);
  askInitOptions = jest.fn().mockResolvedValue({
    name: 'test-project',
    runtime: 'nodejs',
    monorepo: 'none',
    architecture: 'clean',
    database: 'postgresql',
    apiProtocol: 'rest',
    ciCd: 'github',
    observability: 'otel',
    features: ['otel', 'bilingual'],
    agents: ['bmad']
  });
}
