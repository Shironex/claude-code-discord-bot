/**
 * Authentication-related test fixtures
 */

import * as crypto from 'crypto';

/**
 * API key fixtures
 */
export const API_KEY_FIXTURES = {
  discord: 'test-discord-bot-api-key-123456',
  claude: 'test-claude-code-api-key-789012',
  invalid: 'invalid-api-key',
  malformed: '!!!invalid-chars###',
  empty: '',
  veryLong: 'a'.repeat(1000)
};

/**
 * HMAC signature fixtures
 */
export const HMAC_FIXTURES = {
  secret: 'test-hmac-secret-key',
  
  generateSignature: (payload: string, secret: string = HMAC_FIXTURES.secret): string => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    return `sha256=${hmac.digest('hex')}`;
  },
  
  validSignature: 'sha256=2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', // "foo" with default secret
  invalidSignature: 'invalid-signature-123',
  malformedSignature: 'xyz123',
  
  timestamps: {
    current: () => Date.now(),
    expired: () => Date.now() - (6 * 60 * 1000), // 6 minutes ago
    future: () => Date.now() + (60 * 1000) // 1 minute in future
  }
};

/**
 * Auth header fixtures
 */
export const AUTH_HEADER_FIXTURES = {
  validApiKey: {
    'x-api-key': API_KEY_FIXTURES.discord
  },
  
  validHmac: {
    'x-signature': HMAC_FIXTURES.validSignature,
    'x-timestamp': String(HMAC_FIXTURES.timestamps.current())
  },
  
  validCombined: {
    'x-api-key': API_KEY_FIXTURES.discord,
    'x-signature': HMAC_FIXTURES.validSignature,
    'x-timestamp': String(HMAC_FIXTURES.timestamps.current())
  },
  
  invalidApiKey: {
    'x-api-key': API_KEY_FIXTURES.invalid
  },
  
  missingApiKey: {},
  
  expiredHmac: {
    'x-signature': HMAC_FIXTURES.validSignature,
    'x-timestamp': String(HMAC_FIXTURES.timestamps.expired())
  },
  
  missingTimestamp: {
    'x-signature': HMAC_FIXTURES.validSignature
  },
  
  missingSignature: {
    'x-timestamp': String(HMAC_FIXTURES.timestamps.current())
  }
};

/**
 * Request fixtures with auth
 */
export const AUTH_REQUEST_FIXTURES = {
  withValidAuth: {
    headers: AUTH_HEADER_FIXTURES.validCombined,
    body: { test: 'data' },
    method: 'POST',
    url: '/upload'
  },
  
  withInvalidAuth: {
    headers: AUTH_HEADER_FIXTURES.invalidApiKey,
    body: { test: 'data' },
    method: 'POST',
    url: '/upload'
  },
  
  withoutAuth: {
    headers: {},
    body: { test: 'data' },
    method: 'POST',
    url: '/upload'
  },
  
  withPartialAuth: {
    headers: AUTH_HEADER_FIXTURES.validApiKey,
    body: { test: 'data' },
    method: 'POST',
    url: '/upload'
  }
};

/**
 * Auth configuration fixtures
 */
export const AUTH_CONFIG_FIXTURES = {
  apiKeyOnly: {
    discordBotApiKey: API_KEY_FIXTURES.discord,
    claudeCodeApiKey: API_KEY_FIXTURES.claude,
    hmacSecret: null,
    requireHmac: false
  },
  
  hmacRequired: {
    discordBotApiKey: API_KEY_FIXTURES.discord,
    claudeCodeApiKey: API_KEY_FIXTURES.claude,
    hmacSecret: HMAC_FIXTURES.secret,
    requireHmac: true
  },
  
  noAuth: {
    discordBotApiKey: null,
    claudeCodeApiKey: null,
    hmacSecret: null,
    requireHmac: false
  },
  
  hmacOptional: {
    discordBotApiKey: API_KEY_FIXTURES.discord,
    claudeCodeApiKey: API_KEY_FIXTURES.claude,
    hmacSecret: HMAC_FIXTURES.secret,
    requireHmac: false
  }
};

/**
 * Auth validation test cases
 */
export const AUTH_VALIDATION_CASES = {
  validApiKeys: [
    { key: API_KEY_FIXTURES.discord, source: 'discord' },
    { key: API_KEY_FIXTURES.claude, source: 'claude' }
  ],
  
  invalidApiKeys: [
    { key: API_KEY_FIXTURES.invalid, reason: 'Unknown key' },
    { key: API_KEY_FIXTURES.empty, reason: 'Empty key' },
    { key: null, reason: 'Null key' },
    { key: undefined, reason: 'Undefined key' }
  ],
  
  validHmacScenarios: [
    { 
      signature: HMAC_FIXTURES.validSignature,
      timestamp: HMAC_FIXTURES.timestamps.current(),
      payload: 'test-payload',
      valid: true
    }
  ],
  
  invalidHmacScenarios: [
    {
      signature: HMAC_FIXTURES.invalidSignature,
      timestamp: HMAC_FIXTURES.timestamps.current(),
      payload: 'test-payload',
      reason: 'Invalid signature'
    },
    {
      signature: HMAC_FIXTURES.validSignature,
      timestamp: HMAC_FIXTURES.timestamps.expired(),
      payload: 'test-payload',
      reason: 'Expired timestamp'
    },
    {
      signature: null,
      timestamp: HMAC_FIXTURES.timestamps.current(),
      payload: 'test-payload',
      reason: 'Missing signature'
    },
    {
      signature: HMAC_FIXTURES.validSignature,
      timestamp: null,
      payload: 'test-payload',
      reason: 'Missing timestamp'
    }
  ]
};
