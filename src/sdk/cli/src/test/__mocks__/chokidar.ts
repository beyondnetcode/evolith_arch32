export const watch = jest.fn(() => ({
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
  add: jest.fn(),
  unwatch: jest.fn(),
}));

export default { watch };
