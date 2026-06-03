module.exports = { watch: jest.fn(() => ({ on: jest.fn().mockReturnThis(), close: jest.fn() })) };
