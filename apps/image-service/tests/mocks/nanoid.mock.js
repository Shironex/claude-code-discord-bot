// Mock nanoid to generate appropriate length strings while maintaining predictability
// Using the same alphabet as IdGeneratorUtil to ensure compatibility
const SAFE_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

let counter = 0;

function generateMockId(length = 21, alphabet = SAFE_ALPHABET) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const index = (counter + i) % alphabet.length;
    result += alphabet[index];
  }
  counter++;
  return result;
}

module.exports = {
  nanoid: jest.fn((length = 21) => generateMockId(length)),
  customAlphabet: jest.fn((customAlphabet, length) => jest.fn(() => generateMockId(length, customAlphabet)))
};