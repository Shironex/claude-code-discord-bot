/**
 * Simple test to verify Jest is working
 */

describe('Simple Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should do basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    const message = 'Hello, Jest\!';
    expect(message).toContain('Jest');
  });

  describe('Array operations', () => {
    it('should add items to array', () => {
      const arr: number[] = [];
      arr.push(1);
      arr.push(2);
      expect(arr).toHaveLength(2);
      expect(arr).toContain(1);
    });
  });

  describe('Async operations', () => {
    it('should handle promises', async () => {
      const promise = Promise.resolve('success');
      await expect(promise).resolves.toBe('success');
    });
  });
});
