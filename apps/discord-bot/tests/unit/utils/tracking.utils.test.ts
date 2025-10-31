import { TrackingUtils } from '@/utils/tracking.utils';

describe('TrackingUtils', () => {
  describe('generateTrackingId', () => {
    it('should generate tracking ID with correct format', () => {
      const id = TrackingUtils.generateTrackingId();
      
      // Should match pattern: bot_<timestamp>_<8-char-hex>
      const pattern = /^bot_\d+_[a-f0-9]{8}$/;
      expect(pattern.test(id)).toBe(true);
    });

    it('should generate unique tracking IDs', () => {
      const id1 = TrackingUtils.generateTrackingId();
      const id2 = TrackingUtils.generateTrackingId();
      
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with different timestamps over time', async () => {
      const id1 = TrackingUtils.generateTrackingId();
      
      // Wait 5ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const id2 = TrackingUtils.generateTrackingId();
      
      const timestamp1 = TrackingUtils.getTimestampFromTrackingId(id1);
      const timestamp2 = TrackingUtils.getTimestampFromTrackingId(id2);
      
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1!);
    });

    it('should generate IDs with bot_ prefix', () => {
      const id = TrackingUtils.generateTrackingId();
      expect(id.startsWith('bot_')).toBe(true);
    });

    it('should generate IDs with valid timestamp component', () => {
      const beforeGeneration = Date.now();
      const id = TrackingUtils.generateTrackingId();
      const afterGeneration = Date.now();
      
      const timestamp = TrackingUtils.getTimestampFromTrackingId(id);
      
      expect(timestamp).not.toBeNull();
      expect(timestamp!).toBeGreaterThanOrEqual(beforeGeneration);
      expect(timestamp!).toBeLessThanOrEqual(afterGeneration);
    });

    it('should generate IDs with 8-character hex random component', () => {
      const id = TrackingUtils.generateTrackingId();
      const parts = id.split('_');
      
      expect(parts).toHaveLength(3);
      expect(parts[2]).toHaveLength(8);
      expect(/^[a-f0-9]{8}$/.test(parts[2])).toBe(true);
    });
  });

  describe('extractTrackingId', () => {
    it('should extract valid tracking ID from text', () => {
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      const text = `Workflow run for ${trackingId} analysis completed`;
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBe(trackingId);
    });

    it('should extract first tracking ID when multiple exist', () => {
      const firstId = 'bot_1704067200000_a3f2b1c4';
      const secondId = 'bot_1704067300000_b4g3c2d5';
      const text = `First: ${firstId}, Second: ${secondId}`;
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBe(firstId);
    });

    it('should return null for text without tracking ID', () => {
      const text = 'This is just some regular text without any tracking information';
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = TrackingUtils.extractTrackingId('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = TrackingUtils.extractTrackingId(null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = TrackingUtils.extractTrackingId(undefined as any);
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(TrackingUtils.extractTrackingId(123 as any)).toBeNull();
      expect(TrackingUtils.extractTrackingId({} as any)).toBeNull();
      expect(TrackingUtils.extractTrackingId([] as any)).toBeNull();
    });

    it('should handle malformed tracking ID patterns', () => {
      const malformedCases = [
        'bot_invalid_a3f2b1c4',        // Invalid timestamp
        'bot_1704067200000_ghijklmn',    // Invalid hex (contains non-hex chars)
        'bot_1704067200000_a3f',        // Too short hex
        'notabot_1704067200000_ghijklmn', // Wrong prefix entirely
        'bot1704067200000a3f2b1c4',     // Missing underscores
        'bot_1704067200000_g3f2b1c4',   // Invalid hex character (g)
        'bot_1704067200000_A3F2B1C4',   // Uppercase hex (should be lowercase)
        'xbot_1704067200000_ghijklmn', // Wrong prefix
      ];

      malformedCases.forEach(malformed => {
        const result = TrackingUtils.extractTrackingId(malformed);
        expect(result).toBeNull();
      });
    });

    it('should extract tracking ID at beginning of text', () => {
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      const text = `${trackingId} workflow started`;
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBe(trackingId);
    });

    it('should extract tracking ID at end of text', () => {
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      const text = `Workflow completed: ${trackingId}`;
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBe(trackingId);
    });

    it('should extract tracking ID with surrounding special characters', () => {
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      const text = `[${trackingId}] - Analysis completed (SUCCESS)`;
      
      const result = TrackingUtils.extractTrackingId(text);
      expect(result).toBe(trackingId);
    });

    it('should handle very long text with tracking ID', () => {
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      const longText = 'a'.repeat(10000) + trackingId + 'b'.repeat(10000);
      
      const result = TrackingUtils.extractTrackingId(longText);
      expect(result).toBe(trackingId);
    });

    it('should be case sensitive for hex component', () => {
      // Valid lowercase hex
      const validId = 'bot_1704067200000_a3f2b1c4';
      expect(TrackingUtils.extractTrackingId(validId)).toBe(validId);
      
      // Invalid uppercase hex should not match
      const invalidId = 'bot_1704067200000_A3F2B1C4';
      expect(TrackingUtils.extractTrackingId(invalidId)).toBeNull();
    });
  });

  describe('isMatchingTrackingId', () => {
    const validTrackingId = 'bot_1704067200000_a3f2b1c4';

    it('should return true when tracking ID is found in text', () => {
      const text = `Workflow analysis for ${validTrackingId} completed successfully`;
      
      const result = TrackingUtils.isMatchingTrackingId(text, validTrackingId);
      expect(result).toBe(true);
    });

    it('should return false when tracking ID is not found in text', () => {
      const text = 'This text does not contain the tracking ID we are looking for';
      
      const result = TrackingUtils.isMatchingTrackingId(text, validTrackingId);
      expect(result).toBe(false);
    });

    it('should return true for exact match (text equals tracking ID)', () => {
      const result = TrackingUtils.isMatchingTrackingId(validTrackingId, validTrackingId);
      expect(result).toBe(true);
    });

    it('should be case sensitive', () => {
      const text = 'Analysis for BOT_1704067200000_A3F2B1C4 completed';
      const trackingId = 'bot_1704067200000_a3f2b1c4';
      
      const result = TrackingUtils.isMatchingTrackingId(text, trackingId);
      expect(result).toBe(false);
    });

    it('should return false for empty text', () => {
      const result = TrackingUtils.isMatchingTrackingId('', validTrackingId);
      expect(result).toBe(false);
    });

    it('should return false for empty tracking ID', () => {
      const text = 'Some text with content';
      const result = TrackingUtils.isMatchingTrackingId(text, '');
      expect(result).toBe(false);
    });

    it('should return false for null text', () => {
      const result = TrackingUtils.isMatchingTrackingId(null as any, validTrackingId);
      expect(result).toBe(false);
    });

    it('should return false for null tracking ID', () => {
      const text = 'Some text content';
      const result = TrackingUtils.isMatchingTrackingId(text, null as any);
      expect(result).toBe(false);
    });

    it('should return false for undefined inputs', () => {
      expect(TrackingUtils.isMatchingTrackingId(undefined as any, validTrackingId)).toBe(false);
      expect(TrackingUtils.isMatchingTrackingId('text', undefined as any)).toBe(false);
      expect(TrackingUtils.isMatchingTrackingId(undefined as any, undefined as any)).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(TrackingUtils.isMatchingTrackingId(123 as any, validTrackingId)).toBe(false);
      expect(TrackingUtils.isMatchingTrackingId('text', 123 as any)).toBe(false);
      expect(TrackingUtils.isMatchingTrackingId({} as any, validTrackingId)).toBe(false);
      expect(TrackingUtils.isMatchingTrackingId('text', {} as any)).toBe(false);
    });

    it('should handle partial matches correctly', () => {
      const fullId = 'bot_1704067200000_a3f2b1c4';
      const partialId = 'bot_1704067200000_a3f';
      
      // Text contains full ID, searching for partial - should find it (partial is substring of full)
      const textWithFullId = `Analysis for ${fullId} completed`;
      expect(TrackingUtils.isMatchingTrackingId(textWithFullId, partialId)).toBe(true);
      
      // Text contains partial, searching for full - should not find it
      const textWithPartialId = `Analysis for ${partialId} completed`;
      expect(TrackingUtils.isMatchingTrackingId(textWithPartialId, fullId)).toBe(false);
      
      // Should match full ID in text containing it with extra content
      const partialText = `${fullId}_extra_content`;
      expect(TrackingUtils.isMatchingTrackingId(partialText, fullId)).toBe(true);
    });

    it('should handle special characters in text', () => {
      const text = `[INFO] Workflow {${validTrackingId}} completed with status: SUCCESS!`;
      
      const result = TrackingUtils.isMatchingTrackingId(text, validTrackingId);
      expect(result).toBe(true);
    });

    it('should handle multiple occurrences', () => {
      const text = `First: ${validTrackingId}, Second: ${validTrackingId}`;
      
      const result = TrackingUtils.isMatchingTrackingId(text, validTrackingId);
      expect(result).toBe(true);
    });
  });

  describe('getTimestampFromTrackingId', () => {
    it('should extract valid timestamp from tracking ID', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const trackingId = `bot_${timestamp}_a3f2b1c4`;
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(timestamp);
    });

    it('should return valid Date when timestamp is extracted', () => {
      const timestamp = 1704067200000; // 2024-01-01T00:00:00.000Z
      const trackingId = `bot_${timestamp}_a3f2b1c4`;
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      const date = new Date(result!);
      
      expect(date.getTime()).toBe(timestamp);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should return null for empty string', () => {
      const result = TrackingUtils.getTimestampFromTrackingId('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = TrackingUtils.getTimestampFromTrackingId(null as any);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = TrackingUtils.getTimestampFromTrackingId(undefined as any);
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      expect(TrackingUtils.getTimestampFromTrackingId(123 as any)).toBeNull();
      expect(TrackingUtils.getTimestampFromTrackingId({} as any)).toBeNull();
      expect(TrackingUtils.getTimestampFromTrackingId([] as any)).toBeNull();
    });

    it('should return null for malformed tracking ID format', () => {
      const malformedCases = [
        'invalid_format',
        'bot_only',
        'bot_timestamp',
        'bot__hex',
        'notbot_1704067200000_a3f2b1c4',
        'bot_1704067200000_a3f2b1c4_extra',
        'prefix_bot_1704067200000_a3f2b1c4',
      ];

      malformedCases.forEach(malformed => {
        const result = TrackingUtils.getTimestampFromTrackingId(malformed);
        expect(result).toBeNull();
      });
    });

    it('should return null for non-numeric timestamp', () => {
      const trackingId = 'bot_notanumber_a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBeNull();
    });

    it('should handle zero timestamp', () => {
      const trackingId = 'bot_0_a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(0);
    });

    it('should handle negative timestamp (invalid but parseable)', () => {
      const trackingId = 'bot_-1000_a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(-1000);
    });

    it('should handle very large timestamp', () => {
      const largeTimestamp = 9999999999999;
      const trackingId = `bot_${largeTimestamp}_a3f2b1c4`;
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(largeTimestamp);
    });

    it('should handle timestamp with leading zeros', () => {
      const trackingId = 'bot_000001704067200000_a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(1704067200000);
    });

    it('should return null for empty timestamp part', () => {
      const trackingId = 'bot__a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBeNull();
    });

    it('should handle decimal timestamp (parseInt ignores decimal)', () => {
      const trackingId = 'bot_1704067200000.5_a3f2b1c4';
      
      const result = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(result).toBe(1704067200000);
    });
  });

  describe('integration tests', () => {
    it('should work with generated tracking ID throughout pipeline', () => {
      // Generate a tracking ID
      const trackingId = TrackingUtils.generateTrackingId();
      expect(trackingId).toBeDefined();
      
      // Extract timestamp from generated ID
      const timestamp = TrackingUtils.getTimestampFromTrackingId(trackingId);
      expect(timestamp).not.toBeNull();
      expect(typeof timestamp).toBe('number');
      
      // Use ID in text and extract it back
      const workflowText = `GitHub Actions workflow for ${trackingId} analysis`;
      const extractedId = TrackingUtils.extractTrackingId(workflowText);
      expect(extractedId).toBe(trackingId);
      
      // Check matching
      const isMatch = TrackingUtils.isMatchingTrackingId(workflowText, trackingId);
      expect(isMatch).toBe(true);
      
      // Verify timestamp consistency
      const extractedTimestamp = TrackingUtils.getTimestampFromTrackingId(extractedId!);
      expect(extractedTimestamp).toBe(timestamp);
    });

    it('should handle workflow scenario with multiple operations', () => {
      // Simulate workflow dispatch
      const dispatchId = TrackingUtils.generateTrackingId();
      const dispatchTime = TrackingUtils.getTimestampFromTrackingId(dispatchId);
      
      // Simulate workflow run name
      const runName = `Claude Code Analysis - ${dispatchId}`;
      
      // Simulate finding the workflow run
      const foundId = TrackingUtils.extractTrackingId(runName);
      expect(foundId).toBe(dispatchId);
      
      // Simulate checking if this is our workflow
      const isOurWorkflow = TrackingUtils.isMatchingTrackingId(runName, dispatchId);
      expect(isOurWorkflow).toBe(true);
      
      // Simulate logging with timestamp
      const logTime = TrackingUtils.getTimestampFromTrackingId(foundId!);
      expect(logTime).toBe(dispatchTime);
      
      // Verify it's a recent timestamp
      const now = Date.now();
      expect(logTime!).toBeLessThanOrEqual(now);
      expect(now - logTime!).toBeLessThan(5000); // Less than 5 seconds ago
    });

    it('should handle edge cases in workflow matching', () => {
      const trackingId = TrackingUtils.generateTrackingId();
      
      // Test various text formats workflows might use
      const textFormats = [
        `Analysis run: ${trackingId}`,
        `[${trackingId}] GitHub Actions`,
        `${trackingId}: Claude Code Analysis`,
        `Workflow ${trackingId} completed`,
        `Started ${trackingId} at ${new Date().toISOString()}`,
      ];

      textFormats.forEach(text => {
        expect(TrackingUtils.extractTrackingId(text)).toBe(trackingId);
        expect(TrackingUtils.isMatchingTrackingId(text, trackingId)).toBe(true);
      });
    });

    it('should demonstrate timestamp ordering capabilities', () => {
      const ids: string[] = [];
      const timestamps: number[] = [];

      // Generate multiple IDs with small delays
      for (let i = 0; i < 3; i++) {
        const id = TrackingUtils.generateTrackingId();
        const timestamp = TrackingUtils.getTimestampFromTrackingId(id)!;
        
        ids.push(id);
        timestamps.push(timestamp);
        
        // Small delay to ensure different timestamps
        if (i < 2) {
          // Busy wait for 1ms
          const start = Date.now();
          while (Date.now() - start < 1) {}
        }
      }

      // Verify chronological ordering
      expect(timestamps[1]).toBeGreaterThan(timestamps[0]);
      expect(timestamps[2]).toBeGreaterThan(timestamps[1]);
      
      // Verify all IDs are unique
      expect(new Set(ids).size).toBe(3);
    });
  });
});