export default class Conf {
  constructor() {}
  get = jest.fn();
  set = jest.fn();
  has = jest.fn().mockReturnValue(false);
  delete = jest.fn();
  clear = jest.fn();
  onDidChange = jest.fn();
  onDidAnyChange = jest.fn();
  store = {};
  path = '/tmp/mock-conf';
}
