const mockLog = {
  info: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  message: jest.fn(),
};

export const text = jest.fn();
export const select = jest.fn();
export const confirm = jest.fn();
export const spinner = jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }));
export const intro = jest.fn();
export const outro = jest.fn();
export const isCancel = jest.fn();
export const cancel = jest.fn();
export const multiselect = jest.fn();
export const group = jest.fn();
export const log = mockLog;
export const note = jest.fn();
