import { ErrorCategory, ErrorCategorizer, CategorizedError } from '@/utils/error.types';

describe('ErrorCategory', () => {
  it('should have all expected error category constants', () => {
    expect(ErrorCategory.NETWORK).toBe('network');
    expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
    expect(ErrorCategory.RATE_LIMIT).toBe('rate_limit');
    expect(ErrorCategory.NOT_FOUND).toBe('not_found');
    expect(ErrorCategory.VALIDATION).toBe('validation');
    expect(ErrorCategory.GITHUB_API).toBe('github_api');
    expect(ErrorCategory.SESSION).toBe('session');
    expect(ErrorCategory.PERMISSION).toBe('permission');
    expect(ErrorCategory.UNKNOWN).toBe('unknown');
  });
});

describe('ErrorCategorizer', () => {
  describe('categorizeError', () => {
    describe('Rate Limit Errors', () => {
      it('should categorize rate limit errors with message', () => {
        const error = new Error('API rate limit exceeded');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(result.message).toBe('API rate limit exceeded');
        expect(result.userMessage).toBe('⏱️ GitHub API rate limit reached. Please wait a few minutes before trying again.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize rate limit errors with status code 429', () => {
        const error = { status: 429, message: 'Too Many Requests' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize mixed case rate limit messages', () => {
        const error = new Error('Rate LIMIT exceeded');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      });
    });

    describe('Authentication Errors', () => {
      it('should categorize authentication errors with message', () => {
        const error = new Error('Authentication failed');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(result.message).toBe('Authentication failed');
        expect(result.userMessage).toBe('🔑 GitHub authentication failed. Please contact an administrator.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize unauthorized errors', () => {
        const error = new Error('Unauthorized access');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize authentication errors with status code 401', () => {
        const error = { status: 401, message: 'Unauthorized' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('Not Found Errors', () => {
      it('should categorize not found errors with message', () => {
        const error = new Error('Repository not found');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NOT_FOUND);
        expect(result.message).toBe('Repository not found');
        expect(result.userMessage).toBe('❌ Repository not found or no longer accessible.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize not found errors with status code 404', () => {
        const error = { status: 404, message: 'Not Found' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NOT_FOUND);
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('Permission Errors', () => {
      it('should categorize forbidden errors', () => {
        const error = new Error('Forbidden access');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.PERMISSION);
        expect(result.message).toBe('Forbidden access');
        expect(result.userMessage).toBe('🚫 Access denied. You may not have permission to access this repository.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize permission errors', () => {
        const error = new Error('Permission denied');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.PERMISSION);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize permission errors with status code 403', () => {
        const error = { status: 403, message: 'Forbidden' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.PERMISSION);
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('Validation Errors', () => {
      it('should categorize validation errors', () => {
        const error = new Error('Validation error occurred');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.VALIDATION);
        expect(result.message).toBe('Validation error occurred');
        expect(result.userMessage).toBe('⚠️ Invalid input provided. Please check your selections and try again.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize invalid input errors', () => {
        const error = new Error('Invalid parameter provided');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.VALIDATION);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize path traversal errors', () => {
        const error = new Error('Path traversal detected');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.VALIDATION);
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('Network Errors', () => {
      it('should categorize network errors with message', () => {
        const error = new Error('Network connection failed');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.message).toBe('Network connection failed');
        expect(result.userMessage).toBe('🌐 Network error occurred. Please check your connection and try again.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize timeout errors', () => {
        const error = new Error('Request timeout');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize connection errors', () => {
        const error = new Error('Connection refused');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize ECONNRESET errors', () => {
        const error = { code: 'ECONNRESET', message: 'Connection reset by peer' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize ETIMEDOUT errors', () => {
        const error = { code: 'ETIMEDOUT', message: 'Connection timed out' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize ENOTFOUND errors', () => {
        const error = { code: 'ENOTFOUND', message: 'Host lookup failed' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NETWORK);
        expect(result.isRetryable).toBe(true);
      });
    });

    describe('GitHub API Errors', () => {
      it('should categorize server errors with status code 500', () => {
        const error = { status: 500, message: 'Internal Server Error' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.GITHUB_API);
        expect(result.message).toBe('Internal Server Error');
        expect(result.userMessage).toBe('🐙 GitHub API is experiencing issues. Please try again in a few minutes.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize server errors with status code 502', () => {
        const error = { status: 502, message: 'Bad Gateway' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.GITHUB_API);
        expect(result.isRetryable).toBe(true);
      });

      it('should categorize GitHub API specific messages', () => {
        const error = new Error('GitHub API service unavailable');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.GITHUB_API);
        expect(result.isRetryable).toBe(true);
      });
    });

    describe('Session Errors', () => {
      it('should categorize session errors', () => {
        const error = new Error('User session is missing');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.SESSION);
        expect(result.message).toBe('User session is missing');
        expect(result.userMessage).toBe('⏰ Your session has expired. Please start over with the /claude command.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should categorize expired session errors', () => {
        const error = new Error('Session expired');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.SESSION);
        expect(result.isRetryable).toBe(false);
      });

      it('should show that "session not found" gets categorized as NOT_FOUND due to priority', () => {
        // This demonstrates the actual behavior - "not found" is checked before "session"
        const error = new Error('Session not found');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.NOT_FOUND);
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('Unknown Errors', () => {
      it('should categorize unknown errors', () => {
        const error = new Error('Something mysterious happened');
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.UNKNOWN);
        expect(result.message).toBe('Something mysterious happened');
        expect(result.userMessage).toBe('❓ An unexpected error occurred. Please try again or contact support if the problem persists.');
        expect(result.originalError).toBe(error);
        expect(result.isRetryable).toBe(false);
      });

      it('should handle errors without message property', () => {
        const error = { toString: () => 'Custom error string' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.UNKNOWN);
        expect(result.message).toBe('Custom error string');
      });

      it('should handle null/undefined errors', () => {
        const error = null;
        
        // This should throw because the implementation doesn't handle null gracefully
        expect(() => ErrorCategorizer.categorizeError(error)).toThrow();
      });
    });

    describe('Error Priority (first match wins)', () => {
      it('should prioritize rate limit over other categories', () => {
        // This error message contains both "rate limit" and "authentication" but rate limit should win
        const error = { status: 429, message: 'rate limit exceeded due to authentication issues' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
      });

      it('should prioritize authentication over permission for status 401', () => {
        // Status 401 could potentially match forbidden logic but authentication should win
        const error = { status: 401, message: 'authentication required for forbidden resource' };
        const result = ErrorCategorizer.categorizeError(error);
        
        expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      });
    });
  });

  describe('getLogLevel', () => {
    it('should return warn for rate limit errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.RATE_LIMIT);
      expect(level).toBe('warn');
    });

    it('should return warn for network errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.NETWORK);
      expect(level).toBe('warn');
    });

    it('should return info for session errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.SESSION);
      expect(level).toBe('info');
    });

    it('should return info for validation errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.VALIDATION);
      expect(level).toBe('info');
    });

    it('should return error for authentication errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.AUTHENTICATION);
      expect(level).toBe('error');
    });

    it('should return error for not found errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.NOT_FOUND);
      expect(level).toBe('error');
    });

    it('should return error for permission errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.PERMISSION);
      expect(level).toBe('error');
    });

    it('should return error for GitHub API errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.GITHUB_API);
      expect(level).toBe('error');
    });

    it('should return error for unknown errors', () => {
      const level = ErrorCategorizer.getLogLevel(ErrorCategory.UNKNOWN);
      expect(level).toBe('error');
    });
  });

  describe('shouldRetry', () => {
    it('should return true for network errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.NETWORK);
      expect(shouldRetry).toBe(true);
    });

    it('should return true for rate limit errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.RATE_LIMIT);
      expect(shouldRetry).toBe(true);
    });

    it('should return true for GitHub API errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.GITHUB_API);
      expect(shouldRetry).toBe(true);
    });

    it('should return false for authentication errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.AUTHENTICATION);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for not found errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.NOT_FOUND);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for permission errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.PERMISSION);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for validation errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.VALIDATION);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for session errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.SESSION);
      expect(shouldRetry).toBe(false);
    });

    it('should return false for unknown errors', () => {
      const shouldRetry = ErrorCategorizer.shouldRetry(ErrorCategory.UNKNOWN);
      expect(shouldRetry).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent categorization and retry logic', () => {
      const networkError = new Error('Connection timeout');
      const categorized = ErrorCategorizer.categorizeError(networkError);
      const shouldRetry = ErrorCategorizer.shouldRetry(categorized.category);
      
      expect(categorized.category).toBe(ErrorCategory.NETWORK);
      expect(categorized.isRetryable).toBe(true);
      expect(shouldRetry).toBe(true);
    });

    it('should provide consistent categorization and log levels', () => {
      const rateLimitError = { status: 429, message: 'Rate limit exceeded' };
      const categorized = ErrorCategorizer.categorizeError(rateLimitError);
      const logLevel = ErrorCategorizer.getLogLevel(categorized.category);
      
      expect(categorized.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(categorized.isRetryable).toBe(true);
      expect(logLevel).toBe('warn');
    });
  });
});