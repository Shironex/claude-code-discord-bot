module.exports = {
  nanoid: jest.fn(() => 'test-nanoid-123456789'),
  customAlphabet: jest.fn(() => jest.fn(() => 'test-nanoid-123456789'))
};