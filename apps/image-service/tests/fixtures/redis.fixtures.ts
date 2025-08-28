/**
 * Redis-related test fixtures
 */

/**
 * Redis key patterns
 */
export const REDIS_KEY_FIXTURES = {
  imagePrefix: 'image:',
  metadataPrefix: 'metadata:',
  userPrefix: 'user:',
  
  imageKey: (id: string) => 'image:' + id,
  metadataKey: (id: string) => 'metadata:' + id,
  userKey: (userId: string) => 'user:' + userId + ':images',
  
  sampleKeys: [
    'image:test-id-123',
    'metadata:test-id-123',
    'user:user-456:images',
    'image:another-id-789',
    'metadata:another-id-789'
  ]
};

/**
 * Redis data fixtures
 */
export const REDIS_DATA_FIXTURES = {
  imageData: {
    id: 'test-image-123',
    path: '/tmp/uploads/test-image-123.jpg',
    metadata: {
      size: 102400,
      mimeType: 'image/jpeg',
      uploadedAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-01T01:00:00Z'
    }
  },
  
  serializedMetadata: JSON.stringify({
    id: 'test-image-456',
    size: 204800,
    mimeType: 'image/png',
    uploadedAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-01T02:00:00Z',
    originalName: 'test.png',
    userId: 'user-789'
  }),
  
  userImageList: JSON.stringify([
    'image-1',
    'image-2',
    'image-3'
  ]),
  
  expiredData: {
    id: 'expired-image',
    expiresAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  }
};

/**
 * Redis operation test cases
 */
export const REDIS_OPERATION_CASES = {
  setOperations: [
    {
      key: 'test:key:1',
      value: 'test value',
      ttl: 3600,
      expected: 'OK'
    },
    {
      key: 'test:key:2',
      value: JSON.stringify({ data: 'complex' }),
      ttl: 7200,
      expected: 'OK'
    }
  ],
  
  getOperations: [
    {
      key: 'existing:key',
      mockValue: 'stored value',
      expected: 'stored value'
    },
    {
      key: 'nonexistent:key',
      mockValue: null,
      expected: null
    }
  ],
  
  deleteOperations: [
    {
      key: 'delete:me',
      exists: true,
      expected: 1
    },
    {
      key: 'not:exists',
      exists: false,
      expected: 0
    }
  ],
  
  batchOperations: [
    {
      pattern: 'image:*',
      mockKeys: ['image:1', 'image:2', 'image:3'],
      expected: ['image:1', 'image:2', 'image:3']
    },
    {
      pattern: 'user:*:images',
      mockKeys: ['user:123:images', 'user:456:images'],
      expected: ['user:123:images', 'user:456:images']
    }
  ]
};

/**
 * Redis connection states
 */
export const REDIS_CONNECTION_STATES = {
  connected: {
    status: 'ready',
    ping: 'PONG'
  },
  
  disconnected: {
    status: 'end',
    ping: null
  },
  
  connecting: {
    status: 'connecting',
    ping: null
  },
  
  reconnecting: {
    status: 'reconnecting',
    ping: null
  },
  
  error: {
    status: 'error',
    ping: null,
    error: 'Connection refused'
  }
};

/**
 * Redis error scenarios
 */
export const REDIS_ERROR_SCENARIOS = {
  connectionRefused: {
    code: 'ECONNREFUSED',
    message: 'connect ECONNREFUSED 127.0.0.1:6379'
  },
  
  authFailed: {
    code: 'NOAUTH',
    message: 'Authentication required'
  },
  
  timeout: {
    code: 'ETIMEDOUT',
    message: 'Connection timeout'
  },
  
  commandError: {
    code: 'ERR',
    message: 'ERR wrong number of arguments'
  }
};

/**
 * Cache TTL test cases
 */
export const CACHE_TTL_CASES = {
  standard: [
    { ttl: 300, description: '5 minutes' },
    { ttl: 3600, description: '1 hour' },
    { ttl: 86400, description: '24 hours' }
  ],
  
  edge: [
    { ttl: 1, description: '1 second' },
    { ttl: 0, description: 'No expiration' },
    { ttl: -1, description: 'Already expired' },
    { ttl: 2147483647, description: 'Max int32' }
  ]
};
