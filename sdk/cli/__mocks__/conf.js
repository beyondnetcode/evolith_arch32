module.exports = class Conf { constructor() { this.store = {}; } get(k) { return this.store[k]; } set(k, v) { this.store[k] = v; } has(k) { return k in this.store; } };
